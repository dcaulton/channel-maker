import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { Prisma } from '@prisma/client';
import { buildM3u } from './playlist.util';
import { DEFAULT_FILL_HORIZON_MS } from '../scheduler/log-coverage';
import { SchedulerService } from '../scheduler/scheduler.service';
import {
  seriesTitlesFromPayload,
  isPlayableUrl,
} from '../catalog/series-from-payload';

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduler: SchedulerService,
  ) {}
  async create(dto: CreateChannelDto) {
    try {
      return await this.prisma.channel.create({ data: dto });
    } catch (error: unknown) {
      if (isUniqueConflict(error)) {
        throw new ConflictException(
          `Channel with slug "${dto.slug}" already exists`,
        );
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.channel.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { slots: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id },
      include: {
        slots: {
          orderBy: { startsAt: 'asc' },
          include: { mediaAsset: { include: { work: true } } },
        },
        _count: { select: { slots: true } },
      },
    });
    if (!channel) {
      throw new NotFoundException(`Channel ${id} not found`);
    }
    return channel;
  }

  async update(id: string, dto: UpdateChannelDto) {
    await this.findOne(id);
    try {
      return await this.prisma.channel.update({
        where: { id },
        data: dto,
      });
    } catch (error: unknown) {
      if (isUniqueConflict(error)) {
        throw new ConflictException('Slug already in use');
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.channel.delete({ where: { id } });
  }

  async findNow(channelId: string, at: Date = new Date()) {
    await this.findOne(channelId);
    await this.scheduler.ensureCoverage(
      channelId,
      at,
      new Date(at.getTime() + DEFAULT_FILL_HORIZON_MS),
    );

    return this.prisma.scheduleSlot.findFirst({
      where: {
        channelId,
        startsAt: { lte: at },
        endsAt: { gt: at },
      },
      include: { mediaAsset: { include: { work: true } } },
    });
  }

  async findSchedule(channelId: string, from: Date, to: Date) {
    await this.findOne(channelId);
    if (to <= from) {
      throw new BadRequestException('to must be after from');
    }
    await this.scheduler.ensureCoverage(channelId, from, to);
    return this.prisma.scheduleSlot.findMany({
      where: {
        channelId,
        startsAt: { lt: to },
        endsAt: { gt: from },
      },
      orderBy: { startsAt: 'asc' },
      include: { mediaAsset: { include: { work: true } } },
    });
  }

  async getPlaylistM3u(
    channelId: string,
    from: Date,
    to: Date,
    vpnProxyBaseUrl?: string,
  ): Promise<{ body: string; channelName: string }> {
    const channel = await this.findOne(channelId);
    const slots = await this.findSchedule(channelId, from, to);

    const body = buildM3u(slots, {
      channelName: channel.name,
      vpnProxyBaseUrl,
    });

    return { body, channelName: channel.name };
  }

  async catalogGaps(channelId: string) {
    await this.findOne(channelId);

    const bindings = await this.prisma.channelRuleset.findMany({
      where: { channelId, isActive: true },
      include: { ruleset: { include: { rules: true } } },
    });

    const seriesTitles = [
      ...new Set(
        bindings.flatMap((binding) =>
          binding.ruleset.rules.flatMap((rule) =>
            seriesTitlesFromPayload(rule.payload),
          ),
        ),
      ),
    ];

    const works = await this.prisma.work.findMany({
      where: { seriesTitle: { in: seriesTitles } },
      include: { assets: true },
    });

    const missingSeries = seriesTitles.filter(
      (title) => !works.some((work) => work.seriesTitle === title),
    );

    const playableBySeries = new Map<string, number>();
    for (const work of works) {
      if (work.episode === 0) {
        continue;
      }
      const playable = work.assets.some((asset) =>
        isPlayableUrl(asset.sourceUrl),
      );
      if (playable) {
        playableBySeries.set(
          work.seriesTitle ?? '',
          (playableBySeries.get(work.seriesTitle ?? '') ?? 0) + 1,
        );
      }
    }

    const seriesWithoutPlayable = seriesTitles.filter(
      (title) => (playableBySeries.get(title) ?? 0) === 0,
    );

    return {
      channelId,
      seriesTitles,
      missingSeries,
      seriesWithoutPlayable,
      worksWithoutPlayable: works
        .filter(
          (work) =>
            work.episode !== 0 &&
            work.assets.every((asset) => !isPlayableUrl(asset.sourceUrl)),
        )
        .map((work) => ({
          workId: work.id,
          title: work.title,
          seriesTitle: work.seriesTitle,
          season: work.season,
          episode: work.episode,
        })),
    };
  }
}
