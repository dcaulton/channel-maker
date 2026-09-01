import {
  parseWindowedSourcesPayload,
  planWindowedSources,
  type EpisodeRef,
  type LiveRef,
  type SlateRef,
} from '../windowed-sources';
import type {
  PlannedEngineSlot,
  RulePlanContext,
  RulePlanner,
  RuleSnapshot,
} from '../rule-planner';

export class WindowedSourcesPlanner implements RulePlanner {
  readonly kind = 'windowed-sources';

  async plan(
    rule: RuleSnapshot,
    ctx: RulePlanContext,
  ): Promise<PlannedEngineSlot[]> {
    const payload = parseWindowedSourcesPayload(rule.payload);
    const liveTitles = payload.items
      .filter((item) => item.mode === 'live')
      .map((item) => item.title);
    const seriesTitles = payload.items
      .filter((item) => item.mode === 'episodes')
      .map((item) => item.seriesTitle ?? item.title);
    const slateTitles = payload.items
      .filter((item) => item.mode === 'slate')
      .map((item) => item.title);

    const planned = planWindowedSources({
      from: ctx.from,
      to: ctx.to,
      payload,
      liveByTitle: await this.resolveLive(ctx, liveTitles),
      episodesBySeries: await this.resolveEpisodes(ctx, seriesTitles),
      slateByTitle: await this.resolveSlate(ctx, slateTitles),
    });

    return planned.map((slot) => ({
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      title: slot.title,
      description: slot.description,
      mediaAssetId: slot.mediaAssetId,
      ruleId: rule.id,
    }));
  }

  private async resolveLive(
    ctx: RulePlanContext,
    titles: string[],
  ): Promise<Record<string, LiveRef>> {
    const out: Record<string, LiveRef> = {};
    for (const title of titles) {
      const work = await ctx.prisma.work.findFirst({
        where: { title, kind: 'live' },
        include: { assets: { orderBy: { createdAt: 'asc' }, take: 1 } },
      });
      if (!work?.assets[0]) {
        throw new Error(`No live Work+asset for "${title}"`);
      }
      out[title] = {
        title: work.title,
        workId: work.id,
        mediaAssetId: work.assets[0].id,
        sourceUrl: work.assets[0].sourceUrl,
      };
    }
    return out;
  }

  private async resolveEpisodes(
    ctx: RulePlanContext,
    seriesTitles: string[],
  ): Promise<Record<string, EpisodeRef[]>> {
    const out: Record<string, EpisodeRef[]> = {};
    for (const seriesTitle of seriesTitles) {
      const works = await ctx.prisma.work.findMany({
        where: { kind: 'episode', seriesTitle },
        orderBy: [{ season: 'asc' }, { episode: 'asc' }],
        include: { assets: { orderBy: { createdAt: 'asc' }, take: 1 } },
      });
      out[seriesTitle] = works
        .filter(
          (work) =>
            work.assets[0] && work.season != null && work.episode != null,
        )
        .map((work) => ({
          title: work.title,
          workId: work.id,
          mediaAssetId: work.assets[0].id,
          sourceUrl: work.assets[0].sourceUrl,
          season: work.season as number,
          episode: work.episode as number,
          durationSec: work.assets[0].durationSec ?? 1800,
        }));
    }
    return out;
  }

  private async resolveSlate(
    ctx: RulePlanContext,
    titles: string[],
  ): Promise<Record<string, SlateRef>> {
    const out: Record<string, SlateRef> = {};
    for (const title of titles) {
      const work = await ctx.prisma.work.findFirst({
        where: { title, kind: 'slate' },
        include: { assets: { orderBy: { createdAt: 'asc' }, take: 1 } },
      });
      if (!work?.assets[0]) {
        throw new Error(`No slate Work+asset for "${title}"`);
      }
      out[title] = {
        title: work.title,
        workId: work.id,
        mediaAssetId: work.assets[0].id,
        sourceUrl: work.assets[0].sourceUrl,
      };
    }
    return out;
  }
}
