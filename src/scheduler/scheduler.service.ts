import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { type RotateTvStreamItem } from './rotate-tv-streams';
import { RotateTvStreamsPlanner } from './planners/rotate-tv-streams.planner';
import { WindowedSourcesPlanner } from './planners/windowed-sources.planner';
import {
  assertNoOverlaps,
  type PlannedEngineSlot,
  type RulePlanner,
} from './rule-planner';
import {
  DEFAULT_FILL_HORIZON_MS,
  isLogContinuous,
  rulesetFillsSync,
} from './log-coverage';

export type FillOptions = {
  channelSlug?: string;
  channelId?: string;
  from?: Date;
  to?: Date;
  dryRun?: boolean;
};

@Injectable()
export class SchedulerService {
  private readonly planners: Map<string, RulePlanner>;
  private readonly inflight = new Map<string, Promise<void>>();
  constructor(private readonly prisma: PrismaService) {
    this.planners = new Map<string, RulePlanner>([
      ['rotate-tv-streams', new RotateTvStreamsPlanner()],
      ['windowed-sources', new WindowedSourcesPlanner()],
    ]);
  }

  async fillChannel(options: FillOptions) {
    const channel = options.channelId
      ? await this.prisma.channel.findUnique({
          where: { id: options.channelId },
        })
      : options.channelSlug
        ? await this.requireChannel(options.channelSlug)
        : null;
    if (!channel) {
      throw new NotFoundException('channelSlug or channelId is required');
    }
    const binding = await this.requireActiveBinding(channel.id);
    const from = options.from ?? new Date();
    const to = options.to ?? new Date(from.getTime() + 24 * 60 * 60 * 1000);

    const ctx = { prisma: this.prisma, from, to };
    const planned: PlannedEngineSlot[] = [];

    for (const rule of binding.ruleset.rules) {
      const planner = this.planners.get(rule.kind);
      if (!planner) {
        throw new Error(`No planner registered for kind "${rule.kind}"`);
      }
      planned.push(...(await planner.plan(rule, ctx)));
    }

    assertNoOverlaps(planned);

    if (options.dryRun) {
      return {
        channelId: channel.id,
        rulesetId: binding.rulesetId,
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

    const needed = planned.map((slot) => slot.title);
    const preview = [];
    for (const name of needed) {
      const n = await this.prisma.work.count({
        where: { kind: 'episode', seriesTitle: name },
      });
      preview.push({ seriesTitle: name, episodes: n });
    }

    await this.prisma.scheduleSlot.createMany({
      data: planned.map((slot) => ({
        channelId: channel.id,
        mediaAssetId: slot.mediaAssetId,
        title: slot.title,
        description: slot.description,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        origin: 'engine',
        ruleId: slot.ruleId,
      })),
    });

    return {
      channelId: channel.id,
      rulesetId: binding.rulesetId,
      dryRun: false,
      planned,
      preview,
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

  private async requireChannel(slug: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { slug },
    });
    if (!channel) {
      throw new NotFoundException(`Channel slug ${slug} not found`);
    }
    return channel;
  }

  private async requireActiveBinding(channelId: string) {
    const binding = await this.prisma.channelRuleset.findFirst({
      where: { channelId, isActive: true },
      orderBy: { priority: 'asc' },
      include: {
        ruleset: {
          include: {
            rules: {
              where: { enabled: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });
    if (!binding) {
      throw new NotFoundException(
        `No active ruleset bound to channel ${channelId}`,
      );
    }
    return binding;
  }

  async logCovers(channelId: string, from: Date, to: Date): Promise<boolean> {
    const slots = await this.prisma.scheduleSlot.findMany({
      where: {
        channelId,
        startsAt: { lt: to },
        endsAt: { gt: from },
      },
      select: { startsAt: true, endsAt: true },
      orderBy: { startsAt: 'asc' },
    });
    return isLogContinuous(slots, from, to);
  }

  async ensureCoverage(
    channelId: string,
    from: Date = new Date(),
    to: Date = new Date(Date.now() + DEFAULT_FILL_HORIZON_MS),
  ): Promise<void> {
    if (await this.logCovers(channelId, from, to)) {
      return;
    }

    const existing = this.inflight.get(channelId);
    if (existing) {
      await existing;
      return;
    }

    const run = this.fillIfSync(channelId, from, to).finally(() => {
      this.inflight.delete(channelId);
    });
    this.inflight.set(channelId, run);
    await run;
  }

  private async fillIfSync(channelId: string, from: Date, to: Date) {
    if (await this.logCovers(channelId, from, to)) {
      return;
    }
    const binding = await this.requireActiveBinding(channelId);
    const kinds = binding.ruleset.rules.map((rule) => rule.kind);
    if (!rulesetFillsSync(kinds)) {
      return;
    }
    await this.fillChannel({ channelId, from, to });
  }
}

export type FillResult = Prisma.ScheduleSlotGetPayload<object>;
