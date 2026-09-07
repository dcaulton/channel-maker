import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { probeDurationSec } from './probe-duration';
import { toSourceUrl, walkMedia } from './walk-media';

export type IngestResult = {
  root: string;
  scanned: number;
  upserted: number;
  skipped: number;
  dryRun: boolean;
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
    const files = await walkMedia(options.root);
    let upserted = 0;
    let skipped = 0;

    for (const filePath of files) {
      const sourceUrl = toSourceUrl(filePath, options.root, options.publicBase);
      const durationSec = await probeDurationSec(filePath);
      const title = filePath.split(/[/\\]/).pop() ?? sourceUrl;

      this.logger.log(
        { filePath, sourceUrl, durationSec, dryRun },
        'ingest file',
      );

      if (dryRun) {
        continue;
      }

      await this.prisma.mediaAsset.upsert({
        where: { sourceUrl },
        update: {
          durationSec: durationSec ?? undefined,
          sourceType: 'file',
        },
        create: {
          title,
          sourceUrl,
          sourceType: 'file',
          durationSec,
          description: filePath,
        },
      });
      upserted += 1;
    }

    if (dryRun) {
      skipped = files.length;
    }

    return {
      root: options.root,
      scanned: files.length,
      upserted,
      skipped,
      dryRun,
    };
  }
}
