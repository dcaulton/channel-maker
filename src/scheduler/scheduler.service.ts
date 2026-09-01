import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  parseRotateTvStreamsPayload,
  planRotateTvStreams,
  type RotateTvStreamItem,
} from './rotate-tv-streams';

export type FillOptions = {
  channelSlug: string;
  from?: Date;
  to?: Date;
  dryRun?: boolean;
};

@Injectable()
export class SchedulerService {
  constructor(private readonly prisma: PrismaService) {}

  async fillChannel(options: FillOptions) {
    const channel = await this.prisma.channel.findUnique({
      where: { slug: options.channelSlug },
    });
    if (!channel) {
      throw new NotFoundException(
        `Channel slug ${options.channelSlug} not found`,
      );
    }

    const binding = await this.prisma.channelRuleset.findFirst({
      where: { channelId: channel.id, isActive: true },
      orderBy: { priority: 'asc' },
      include: {
        ruleset: {
          include: {
            rules: { where: { enabled: true }, orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });
    if (!binding) {
      throw new NotFoundException(
        `No active ruleset bound to channel ${options.channelSlug}`,
      );
    }

    const from = options.from ?? new Date();
    const to = options.to ?? new Date(from.getTime() + 24 * 60 * 60 * 1000);

    const rotateRule = binding.ruleset.rules.find(
      (rule) => rule.kind === 'rotate-tv-streams',
    );
    if (!rotateRule) {
      throw new Error(
        `Ruleset ${binding.ruleset.slug} has no enabled rotate-tv-streams rule`,
      );
    }

    const payload = parseRotateTvStreamsPayload(rotateRule.payload);
    const streams = await this.resolveStreams(payload.streamTitles);
    const planned = planRotateTvStreams({ from, to, payload, streams });

    if (options.dryRun) {
      return {
        channelId: channel.id,
        rulesetId: binding.rulesetId,
        ruleId: rotateRule.id,
        dryRun: true,
        planned,
      };
    }

    await this.prisma.scheduleSlot.deleteMany({
      where: {
        channelId: channel.id,
        origin: 'engine',
        startsAt: { lt: to },
        endsAt: { gt: from },
      },
    });

    await this.prisma.scheduleSlot.createMany({
      data: planned.map((slot) => ({
        channelId: channel.id,
        mediaAssetId: slot.mediaAssetId,
        title: slot.title,
        description: slot.description,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        origin: 'engine',
        ruleId: rotateRule.id,
      })),
    });

    return {
      channelId: channel.id,
      rulesetId: binding.rulesetId,
      ruleId: rotateRule.id,
      dryRun: false,
      planned,
    };
  }

  private async resolveStreams(
    titles: string[],
  ): Promise<RotateTvStreamItem[]> {
    const resolved: RotateTvStreamItem[] = [];
    for (const title of titles) {
      const work = await this.prisma.work.findFirst({
        where: { title, kind: 'live' },
        include: { assets: { orderBy: { createdAt: 'asc' }, take: 1 } },
      });
      if (!work || work.assets.length === 0) {
        throw new Error(
          `No live Work+asset for "${title}". Seed the TVH streams first.`,
        );
      }
      resolved.push({
        title: work.title,
        workId: work.id,
        mediaAssetId: work.assets[0].id,
        sourceUrl: work.assets[0].sourceUrl,
      });
    }
    return resolved;
  }
}

export type FillResult = Prisma.ScheduleSlotGetPayload<object>;
