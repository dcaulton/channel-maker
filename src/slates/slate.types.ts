import path from 'node:path';

/** Working assets for the renderer. Not NAS consumables. */
export function slateDataDir(): string {
  return (
    process.env.SLATE_DATA_DIR ?? path.join(process.cwd(), 'data', 'slates')
  );
}

export function slateAsset(...parts: string[]): string {
  return path.join(slateDataDir(), ...parts);
}

export const SLATE_KINDS = [
  'station-id',
  'weather',
  'upcoming',
  'idle',
  'thought',
  'trivia',
  'commercial',
  'seasonal',
] as const;

export type SlateKind = (typeof SLATE_KINDS)[number];

export const SLATE_LINE_ROLES = ['title', 'bullet', 'body'] as const;
export type SlateLineRole = (typeof SLATE_LINE_ROLES)[number];

export type SlateLine = {
  role: SlateLineRole;
  text: string;
  color: string;
  y: number;
};

/** Empty, "0", and "plain" mean the basic renderer. Anything else is a subclass name. */
export type SlateSpec = {
  v: 1;
  app: 'channel-maker';
  kind: SlateKind;
  channelId: string;
  channelName: string;
  renderer: string;
  durationSec: number;
  renderedAt: string;
  bucket: string;
  canvas: { w: 1920; h: 1080 };
  lines: SlateLine[];
  imagePath?: string;
  bedPath?: string;
  sources: Record<string, string>;
};

export type SlateCardSpec = {
  kind: SlateKind;
  durationSec: number;
  bedPath?: string;
  imagePath?: string;
};

export type SlateBreakTemplate = {
  /** Renderer name. Empty uses the basic renderer. */
  renderer: string;
  cards: SlateCardSpec[];
};

export const DEFAULT_BREAK: SlateBreakTemplate = {
  renderer: '',
  cards: [
    {
      kind: 'station-id',
      durationSec: 8,
      bedPath: slateAsset('audio', 'a.wav'),
      imagePath: slateAsset('images', 'station-id.png'),
    },
    {
      kind: 'weather',
      durationSec: 12,
      bedPath: slateAsset('audio', 'b.wav'),
      imagePath: slateAsset('images', 'weather.png'),
    },
    {
      kind: 'upcoming',
      durationSec: 12,
      bedPath: slateAsset('audio', 'c.wav'),
      imagePath: slateAsset('images', 'upcoming.png'),
    },
    {
      kind: 'station-id',
      durationSec: 8,
      bedPath: slateAsset('audio', 'a.wav'),
      imagePath: slateAsset('images', 'station-id.png'),
    },
  ],
};

export const IDLE_BED = slateAsset('audio', 'd.wav');

const KIND_BED: Record<SlateKind, string> = {
  'station-id': 'a.wav',
  weather: 'b.wav',
  upcoming: 'c.wav',
  idle: 'd.wav',
  thought: 'e.wav',
  trivia: 'f.wav',
  commercial: 'g.wav',
  seasonal: 'h.wav',
};

export function bedFor(kind: SlateKind): string {
  return slateAsset('audio', KIND_BED[kind]);
}

export function imageFor(kind: SlateKind): string {
  return slateAsset('images', `${kind}.png`);
}

export function durationFor(kind: SlateKind): number {
  return kind === 'station-id' ? 8 : 12;
}

export type RenderSlateJob = {
  channelId: string;
  kinds?: SlateKind[];
  /** Old field. Empty / plain / 0 selects the basic renderer. */
  look?: string;
  /** Preferred name for the same field. */
  renderer?: string;
  upcomingTitles?: string[];
  force?: boolean;
};

export type RenderedSlate = {
  kind: SlateKind;
  filePath: string;
  sourceUrl: string;
  durationSec: number;
  rebuilt: boolean;
  renderer: string;
};

/** Titles the log already knows how to resolve as slate works. */
export function slateWorkTitle(kind: SlateKind): string {
  return kind === 'idle' ? 'No programming' : kind;
}
