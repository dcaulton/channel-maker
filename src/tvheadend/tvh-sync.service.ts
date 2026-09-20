import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  tvhClientFromEnv,
  tvhStreamBaseFromEnv,
  tvhStreamUrl,
  tvhDvrUrl,
} from './tvh.client';
import { TvhSyncResult, TvhDvrEntry, TvhDvrSyncResult } from './tvh.types';

@Injectable()
export class TvhSyncService {
  private readonly logger = new Logger(TvhSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sync(options: { dryRun?: boolean } = {}): Promise<TvhSyncResult> {
    const dryRun = options.dryRun ?? false;
    const client = tvhClientFromEnv();
    const streamBase = tvhStreamBaseFromEnv();
    const channels = await client.listChannels();

    let upserted = 0;
    let skippedDisabled = 0;
    const summarized: TvhSyncResult['channels'] = [];

    for (const channel of channels) {
      const sourceUrl = tvhStreamUrl(streamBase, channel.uuid);
      summarized.push({
        name: channel.name,
        uuid: channel.uuid,
        sourceUrl,
      });
      if (!channel.enabled) {
        skippedDisabled += 1;
        continue;
      }
      if (dryRun) {
        continue;
      }
      await this.upsertLive(channel.name, sourceUrl, channel);
      upserted += 1;
    }

    const liveUrls = new Set(
      channels
        .filter((channel) => channel.enabled)
        .map((channel) => tvhStreamUrl(streamBase, channel.uuid)),
    );

    let pruned = 0;
    if (!dryRun) {
      pruned = await this.pruneMissingTvhAssets(streamBase, liveUrls);
    }

    this.logger.log({
      fetched: channels.length,
      upserted,
      skippedDisabled,
      dryRun,
    });
    return {
      fetched: channels.length,
      upserted: dryRun ? 0 : upserted,
      skippedDisabled,
      pruned: dryRun ? 0 : pruned,
      dryRun,
      channels: summarized,
    };
  }

  private async pruneMissingTvhAssets(
    streamBase: string,
    liveUrls: Set<string>,
  ): Promise<number> {
    const prefix = `${streamBase.replace(/\/$/, '')}/stream/channel/`;
    const existing = await this.prisma.mediaAsset.findMany({
      where: {
        sourceType: 'http-live',
        sourceUrl: { startsWith: prefix },
      },
      select: { id: true, sourceUrl: true, workId: true },
    });

    const stale = existing.filter((row) => !liveUrls.has(row.sourceUrl));
    if (stale.length === 0) {
      return 0;
    }

    await this.prisma.mediaAsset.deleteMany({
      where: { id: { in: stale.map((row) => row.id) } },
    });

    const orphanWorkIds = stale
      .map((row) => row.workId)
      .filter((id): id is string => Boolean(id));

    for (const workId of orphanWorkIds) {
      const leftover = await this.prisma.mediaAsset.count({
        where: { workId },
      });
      if (leftover === 0) {
        const work = await this.prisma.work.findUnique({
          where: { id: workId },
        });
        if (work?.kind === 'live') {
          await this.prisma.work.delete({ where: { id: workId } });
        }
      }
    }

    this.logger.log({ pruned: stale.length }, 'pruned stale TVH assets');
    return stale.length;
  }

  private async upsertLive(
    title: string,
    sourceUrl: string,
    channel: { uuid: string; number?: number | string },
  ) {
    let work = await this.prisma.work.findFirst({
      where: { title, kind: 'live' },
    });
    const externalIds = {
      tvhUuid: channel.uuid,
      tvhNumber: channel.number ?? null,
    } as Prisma.InputJsonValue;

    if (!work) {
      work = await this.prisma.work.create({
        data: {
          title,
          kind: 'live',
          synopsis: `TVHeadend ${channel.uuid}`,
          externalIds,
        },
      });
    } else {
      work = await this.prisma.work.update({
        where: { id: work.id },
        data: { externalIds },
      });
    }

    await this.prisma.mediaAsset.upsert({
      where: { sourceUrl },
      update: {
        workId: work.id,
        title,
        sourceType: 'http-live',
      },
      create: {
        title,
        sourceUrl,
        sourceType: 'http-live',
        workId: work.id,
        description: `tvh ${channel.uuid}`,
      },
    });
  }

  async syncDvr(options: { dryRun?: boolean } = {}): Promise<TvhDvrSyncResult> {
    const dryRun = options.dryRun ?? false;
    const client = tvhClientFromEnv();
    const streamBase = tvhStreamBaseFromEnv();
    const recordings = await client.listFinishedRecordings();
    const summarized = recordings.map((row) => ({
      title: row.title,
      uuid: row.uuid,
      sourceUrl: tvhDvrUrl(streamBase, row.uuid),
    }));

    let upserted = 0;
    if (!dryRun) {
      for (const row of recordings) {
        await this.upsertDvr(row, tvhDvrUrl(streamBase, row.uuid));
        upserted += 1;
      }
    }

    this.logger.log(
      { fetched: recordings.length, upserted, dryRun },
      'tvh dvr',
    );
    return {
      fetched: recordings.length,
      upserted,
      dryRun,
      recordings: summarized,
    };
  }

  private async upsertDvr(row: TvhDvrEntry, sourceUrl: string) {
    const externalIds = { tvhDvrUuid: row.uuid } as Prisma.InputJsonValue;
    let work = await this.prisma.work.findFirst({
      where: {
        kind: 'movie',
        externalIds: { path: ['tvhDvrUuid'], equals: row.uuid },
      },
    });
    if (!work) {
      work = await this.prisma.work.findFirst({
        where: { kind: 'movie', title: row.title },
      });
    }
    if (!work) {
      work = await this.prisma.work.create({
        data: {
          kind: 'movie',
          title: row.title,
          synopsis: row.channelName
            ? `TVH recording from ${row.channelName}`
            : 'TVH recording',
          externalIds,
        },
      });
    } else {
      work = await this.prisma.work.update({
        where: { id: work.id },
        data: { externalIds },
      });
    }

    await this.prisma.mediaAsset.upsert({
      where: { sourceUrl },
      update: {
        workId: work.id,
        title: row.title,
        sourceType: 'tvh-dvr',
        durationSec: row.durationSec,
        description: row.uuid,
      },
      create: {
        title: row.title,
        sourceUrl,
        sourceType: 'tvh-dvr',
        durationSec: row.durationSec,
        description: row.uuid,
        workId: work.id,
      },
    });
  }
}
