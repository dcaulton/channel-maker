import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_BREAK,
  SLATE_KINDS,
  IDLE_BED,
  type RenderedSlate,
  type RenderSlateJob,
  type SlateKind,
  type SlateLook,
} from './slate.types';

const execFileAsync = promisify(execFile);

@Injectable()
export class RenderSlateService {
  private readonly logger = new Logger(RenderSlateService.name);

  constructor(private readonly prisma: PrismaService) {}

  async render(job: RenderSlateJob): Promise<RenderedSlate[]> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: job.channelId },
    });
    if (!channel) {
      throw new NotFoundException(`Channel ${job.channelId} not found`);
    }

    const nasRoot = process.env.NAS_INGEST_ROOT ?? '/mnt/nas/videos';
    const publicBase = (
      process.env.NAS_PUBLIC_BASE ?? 'http://10.0.0.89:8088'
    ).replace(/\/$/, '');
    const dir = path.join(nasRoot, 'slates', channel.id);
    await mkdir(dir, { recursive: true });

    const kinds = job.kinds?.length ? job.kinds : [...SLATE_KINDS];
    const look: SlateLook = job.look ?? 'plain';
    const upcoming =
      job.upcomingTitles ?? (await this.loadUpcoming(channel.id));

    const out: RenderedSlate[] = [];
    for (const kind of kinds) {
      const lines = this.copyFor(kind, channel.name, upcoming);
      const card = DEFAULT_BREAK.cards.find((c) => c.kind === kind);
      const durationSec = kind === 'idle' ? 12 : (card?.durationSec ?? 12);
      const bedPath = kind === 'idle' ? IDLE_BED : (card?.bedPath ?? null);
      const filePath = path.join(dir, `${kind}.mp4`);
      await this.renderPlainCard(filePath, lines, durationSec, look, bedPath);
      const sourceUrl = `${publicBase}/slates/${channel.id}/${kind}.mp4`;
      await this.upsertSlateAsset(kind, sourceUrl, durationSec);
      out.push({
        kind,
        filePath,
        sourceUrl,
        durationSec,
        stubbed: kind === 'weather' || look === 'vhs',
      });
    }
    this.logger.log(
      { channelId: channel.id, count: out.length },
      'slates rendered',
    );
    return out;
  }

  private copyFor(
    kind: SlateKind,
    channelName: string,
    upcoming: string[],
  ): string[] {
    switch (kind) {
      case 'station-id':
        return [channelName.toUpperCase(), 'CHANNEL-MAKER'];
      case 'weather':
        // stub: later pull a real forecast + Brule-grade copy
        return [channelName, 'WEATHER', 'TONIGHT: DARK', '(stub)'];
      case 'upcoming':
        return [
          'COMING UP',
          ...upcoming.slice(0, 3).map((title, i) => `${i + 1}. ${title}`),
        ];
      case 'idle':
        return [channelName.toUpperCase(), 'NO PROGRAMMING'];
    }
  }

  private async loadUpcoming(channelId: string): Promise<string[]> {
    const now = new Date();
    const slots = await this.prisma.scheduleSlot.findMany({
      where: {
        channelId,
        startsAt: { gte: now },
        title: { not: 'No programming' },
      },
      orderBy: { startsAt: 'asc' },
      take: 6,
    });
    return slots.map((slot) => slot.title);
  }

  private async renderPlainCard(
    filePath: string,
    lines: string[],
    durationSec: number,
    look: SlateLook,
    bedPath?: string | null,
  ): Promise<void> {
    const escaped = lines
      .map((line) => line.replace(/[:\\'[\]]/g, ' ').slice(0, 48))
      .filter(Boolean);
    const filters = escaped.map((line, i) => {
      const y = 420 + i * 80;
      return `drawtext=text='${line}':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=${y}`;
    });
    if (look === 'vhs') {
      this.logger.debug('vhs look stubbed; rendering plain');
    }
    const vf = ['format=yuv420p', ...filters].join(',');

    const args = [
      '-y',
      '-f',
      'lavfi',
      '-i',
      `color=c=0x101010:s=1920x1080:d=${durationSec}`,
    ];

    if (bedPath) {
      args.push(
        '-i',
        bedPath,
        '-filter_complex',
        `[1:a]apad=pad_dur=${durationSec},atrim=0:${durationSec},asetpts=PTS-STARTPTS[a]`,
        '-map',
        '0:v',
        '-map',
        '[a]',
        '-c:a',
        'aac',
        '-ac',
        '2',
        '-ar',
        '48000',
      );
    } else {
      args.push('-an');
    }

    args.push(
      '-vf',
      vf,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-t',
      String(durationSec),
      filePath,
    );

    await execFileAsync('ffmpeg', args);
  }

  private async upsertSlateAsset(
    kind: SlateKind,
    sourceUrl: string,
    durationSec: number,
  ) {
    const title = kind === 'idle' ? 'No programming' : kind;
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
