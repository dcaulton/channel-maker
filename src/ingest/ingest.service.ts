import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  parseMediaFilename,
  type ParsedEpisode,
  type ParsedMovie,
} from './parse-filename';
import { probeDurationSec } from './probe-duration';
import { spookyStoriesParseProfile } from './profiles/spooky-stories';
import { toSourceUrl, walkMedia } from './walk-media';

export type IngestResult = {
  root: string;
  scanned: number;
  upserted: number;
  linked: number;
  skipped: number;
  skippedReasons?: number;
  dryRun: boolean;
  parsedCounts: Record<string, number>;
  unaliased: object;
};

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ingest(options: {
    root: string;
    dryRun?: boolean;
    publicBase?: string;
  }): Promise<IngestResult> {
    const dryRun = options.dryRun ?? true;
    const publicBase =
      options.publicBase || process.env.NAS_PUBLIC_BASE || undefined;
    const root = options.root || process.env.NAS_INGEST_ROOT || '';
    if (!root) {
      throw new Error('ingest root is required');
    }

    const files = await walkMedia(root);
    let upserted = 0;
    let linked = 0;
    let skipped = 0;
    const parsedCounts: Record<string, number> = {};
    const unaliased = new Set<string>();
    const skippedReasons: { path: string; reason: string }[] = [];
    const aliasValues = new Set(
      Object.values(spookyStoriesParseProfile.aliases ?? {}),
    );

    for (const filePath of files) {
      const sourceUrl = toSourceUrl(filePath, root, publicBase);
      const durationSec = await probeDurationSec(filePath);
      const title = filePath.split(/[/\\]/).pop() ?? sourceUrl;
      const parsed = parseMediaFilename(filePath, spookyStoriesParseProfile);

      if (parsed.kind === 'skip') {
        skippedReasons.push({ path: filePath, reason: parsed.reason });
      } else if (parsed.kind === 'episode') {
        parsedCounts[parsed.seriesTitle] =
          (parsedCounts[parsed.seriesTitle] ?? 0) + 1;
        if (!aliasValues.has(parsed.seriesTitle)) {
          unaliased.add(parsed.seriesTitle);
        }
      }

      this.logger.log(
        { filePath, sourceUrl, durationSec, parsed, dryRun },
        'ingest file',
      );

      if (dryRun) {
        skipped += 1;
        continue;
      }

      const existing = await this.prisma.mediaAsset.findFirst({
        where: {
          OR: [{ sourceUrl }, { description: filePath }],
        },
      });

      const asset = existing
        ? await this.prisma.mediaAsset.update({
            where: { id: existing.id },
            data: {
              sourceUrl,
              sourceType: 'file',
              durationSec: durationSec ?? existing.durationSec,
              description: filePath,
            },
          })
        : await this.prisma.mediaAsset.create({
            data: {
              title,
              sourceUrl,
              sourceType: 'file',
              durationSec,
              description: filePath,
            },
          });
      upserted += 1;

      if (parsed.kind === 'skip') {
        continue;
      }

      const work = await this.findOrCreateWork(parsed);
      await this.prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { workId: work.id },
      });
      linked += 1;
    }

    return {
      root,
      scanned: files.length,
      upserted,
      linked,
      dryRun,
      skipped,
      skippedReasons: skippedReasons.length,
      parsedCounts,
      unaliased: [...unaliased],
    };
  }

  private async findOrCreateWork(parsed: ParsedMovie | ParsedEpisode) {
    if (parsed.kind === 'movie') {
      const existing = await this.prisma.work.findFirst({
        where: {
          kind: 'movie',
          title: parsed.title,
          year: parsed.year,
        },
      });
      if (existing) {
        return existing;
      }
      return this.prisma.work.create({
        data: {
          kind: 'movie',
          title: parsed.title,
          year: parsed.year,
        },
      });
    }

    const existing = await this.prisma.work.findFirst({
      where: {
        kind: 'episode',
        seriesTitle: parsed.seriesTitle,
        season: parsed.season,
        episode: parsed.episode,
      },
    });
    if (existing) {
      return existing;
    }
    const code = `S${String(parsed.season).padStart(2, '0')}E${String(parsed.episode).padStart(2, '0')}`;
    return this.prisma.work.create({
      data: {
        kind: 'episode',
        title: parsed.episodeTitle
          ? `${parsed.seriesTitle} ${code} ${parsed.episodeTitle}`
          : `${parsed.seriesTitle} ${code}`,
        seriesTitle: parsed.seriesTitle,
        season: parsed.season,
        episode: parsed.episode,
      },
    });
  }
}
