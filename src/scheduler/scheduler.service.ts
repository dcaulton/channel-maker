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

export type FillOptions = {
  channelSlug: string;
  from?: Date;
  to?: Date;
  dryRun?: boolean;
};

@Injectable()
export class SchedulerService {
  private readonly planners: Map<string, RulePlanner>;
  constructor(private readonly prisma: PrismaService) {
    this.planners = new Map<string, RulePlanner>([
      ['rotate-tv-streams', new RotateTvStreamsPlanner()],
      ['windowed-sources', new WindowedSourcesPlanner()],
    ]);
  }

  async fillChannel(options: FillOptions) {
    const channel = await this.requireChannel(options.channelSlug);
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
}

export type FillResult = Prisma.ScheduleSlotGetPayload<object>;
