import {
  parseRotateTvStreamsPayload,
  planRotateTvStreams,
  type RotateTvStreamItem,
} from '../rotate-tv-streams';
import type {
  PlannedEngineSlot,
  RulePlanContext,
  RulePlanner,
  RuleSnapshot,
} from '../rule-planner';

export class RotateTvStreamsPlanner implements RulePlanner {
  readonly kind = 'rotate-tv-streams';

  async plan(
    rule: RuleSnapshot,
    ctx: RulePlanContext,
  ): Promise<PlannedEngineSlot[]> {
    const payload = parseRotateTvStreamsPayload(rule.payload);
    const streams = await this.resolveStreams(ctx, payload.streamTitles);
    return planRotateTvStreams({
      from: ctx.from,
      to: ctx.to,
      payload,
      streams,
    }).map((slot) => ({
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      title: slot.title,
      description: slot.description,
      mediaAssetId: slot.mediaAssetId,
      ruleId: rule.id,
    }));
  }

  private async resolveStreams(
    ctx: RulePlanContext,
    titles: string[],
  ): Promise<RotateTvStreamItem[]> {
    const resolved: RotateTvStreamItem[] = [];
    for (const title of titles) {
      const work = await ctx.prisma.work.findFirst({
        where: { title, kind: 'live' },
        include: { assets: { orderBy: { createdAt: 'asc' }, take: 1 } },
      });
      if (!work?.assets[0]) {
        throw new Error(`No live Work+asset for "${title}"`);
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
