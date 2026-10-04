import { freshnessBucket } from './slate-freshness';
import { copyFor } from './slate-copy';
import {
  bedFor,
  durationFor,
  imageFor,
  type SlateKind,
  type SlateSpec,
} from './slate.types';

export function basicRendererName(name: string | undefined | null): string {
  const key = (name ?? '').trim();
  if (!key || key === '0' || key === 'plain') return '';
  return key;
}

export async function buildSlateSpec(input: {
  kind: SlateKind;
  channelId: string;
  channelName: string;
  renderer?: string | null;
  upcomingTitles?: string[];
  now?: Date;
  fetchImpl?: typeof fetch;
}): Promise<SlateSpec> {
  const now = input.now ?? new Date();
  const upcoming = input.upcomingTitles ?? [];
  const renderer = basicRendererName(input.renderer);
  const copy = await copyFor(
    input.kind,
    input.channelName,
    upcoming,
    now,
    input.fetchImpl,
  );
  return {
    v: 1,
    app: 'channel-maker',
    kind: input.kind,
    channelId: input.channelId,
    channelName: input.channelName,
    renderer,
    durationSec: durationFor(input.kind),
    renderedAt: now.toISOString(),
    bucket: freshnessBucket(input.kind, now, upcoming, renderer),
    canvas: { w: 1920, h: 1080 },
    lines: copy.lines,
    imagePath: imageFor(input.kind),
    bedPath: bedFor(input.kind),
    sources: copy.sources,
  };
}

export function specDescription(spec: SlateSpec): string {
  return spec.lines.map((line) => line.text).join(' | ');
}

export function encodeSpec(spec: SlateSpec): string {
  return Buffer.from(JSON.stringify(spec), 'utf8').toString('base64');
}

export function decodeSpec(encoded: string): SlateSpec | null {
  try {
    return JSON.parse(
      Buffer.from(encoded, 'base64').toString('utf8'),
    ) as SlateSpec;
  } catch {
    return null;
  }
}
