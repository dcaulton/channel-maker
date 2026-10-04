import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { PrismaService } from '../prisma/prisma.service';
import { decodeSpec } from './slate-spec';
import { buildSlateSpec } from './slate-spec';
import { resolveRenderer } from './renderers/registry';
import {
  SLATE_KINDS,
  slateWorkTitle,
  type RenderedSlate,
  type RenderSlateJob,
  type SlateKind,
  type SlateSpec,
} from './slate.types';

const execFileAsync = promisify(execFile);

@Injectable()
export class RenderSlateService {
  private readonly logger = new Logger(RenderSlateService.name);

  constructor(private readonly prisma: PrismaService) {}

  async render(job: RenderSlateJob): Promise<RenderedSlate[]> {
    return this.ensureForLog({
      channelId: job.channelId,
      kinds: job.kinds,
      renderer: job.renderer ?? job.look,
      upcomingTitles: job.upcomingTitles,
      force: job.force ?? true,
    });
  }

  /**
   * Called while the channel log is built. Time-varying cards rebuild when
   * their freshness bucket no longer matches the spec embedded in the mp4.
   */
  async ensureForLog(input: {
    channelId: string;
    kinds?: SlateKind[];
    renderer?: string;
    upcomingTitles?: string[];
    force?: boolean;
    now?: Date;
  }): Promise<RenderedSlate[]> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: input.channelId },
    });
    if (!channel) {
      throw new NotFoundException(`Channel ${input.channelId} not found`);
    }

    const nasRoot = process.env.NAS_INGEST_ROOT ?? '/mnt/nas/videos';
    const publicBase = (
      process.env.NAS_PUBLIC_BASE ?? 'http://10.0.0.89:8088'
    ).replace(/\/$/, '');
    const dir = path.join(nasRoot, 'slates', channel.id);
    await mkdir(dir, { recursive: true });

    const kinds = input.kinds?.length ? input.kinds : [...SLATE_KINDS];
    const upcoming =
      input.upcomingTitles ?? (await this.loadUpcoming(channel.id));
    const now = input.now ?? new Date();
    const out: RenderedSlate[] = [];

    for (const kind of kinds) {
      const spec = await buildSlateSpec({
        kind,
        channelId: channel.id,
        channelName: channel.name,
        renderer: input.renderer,
        upcomingTitles: upcoming,
        now,
      });
      const filePath = path.join(dir, `${kind}.mp4`);
      const current = input.force ? null : await this.readEmbedded(filePath);
      const rebuilt = input.force || !current || current.bucket !== spec.bucket;
      if (rebuilt) {
        const renderer = resolveRenderer(spec.renderer);
        await renderer.render(spec, filePath);
      }
      const sourceUrl = `${publicBase}/slates/${channel.id}/${kind}.mp4`;
      await this.upsertSlateAsset(kind, sourceUrl, spec.durationSec);
      out.push({
        kind,
        filePath,
        sourceUrl,
        durationSec: spec.durationSec,
        rebuilt,
        renderer: spec.renderer || 'basic',
      });
    }
    this.logger.log(
      {
        channelId: channel.id,
        rebuilt: out.filter((card) => card.rebuilt).length,
      },
      'slates ensured',
    );
    return out;
  }

  private async loadUpcoming(channelId: string): Promise<string[]> {
    const slots = await this.prisma.scheduleSlot.findMany({
      where: {
        channelId,
        startsAt: { gte: new Date() },
        title: { not: 'No programming' },
        NOT: { title: { in: [...SLATE_KINDS] } },
      },
      orderBy: { startsAt: 'asc' },
      take: 6,
    });
    return slots.map((slot) => slot.title);
  }

  private async readEmbedded(filePath: string): Promise<SlateSpec | null> {
    try {
      const { stdout } = await execFileAsync('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'format_tags=slate_spec',
        '-of',
        'default=nw=1:nk=1',
        filePath,
      ]);
      const encoded = stdout.trim();
      if (!encoded) return null;
      return decodeSpec(encoded);
    } catch {
      return null;
    }
  }

  private async upsertSlateAsset(
    kind: SlateKind,
    sourceUrl: string,
    durationSec: number,
  ) {
    const title = slateWorkTitle(kind);
    let work = await this.prisma.work.findFirst({
      where: { kind: 'slate', title },
    });
    if (!work) {
      work = await this.prisma.work.create({
        data: { kind: 'slate', title },
      });
    }
    await this.prisma.mediaAsset.upsert({
      where: { sourceUrl },
      update: { workId: work.id, durationSec, sourceType: 'file', title },
      create: {
        title,
        sourceUrl,
        sourceType: 'file',
        durationSec,
        workId: work.id,
      },
    });
  }
}
