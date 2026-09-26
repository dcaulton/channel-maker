export const SLATE_KINDS = [
  'station-id',
  'weather',
  'upcoming',
  'idle',
] as const;

export type SlateKind = (typeof SLATE_KINDS)[number];

export const SLATE_LOOKS = ['plain', 'vhs'] as const;
export type SlateLook = (typeof SLATE_LOOKS)[number];

export type SlateCardSpec = {
  kind: SlateKind;
  durationSec: number;
  bedPath?: string;
};

export type SlateBreakTemplate = {
  look: SlateLook;
  cards: SlateCardSpec[];
};

/** Default Brule-ish bumper between two programs */
const BEDS = '/mnt/nas/videos/slates/audio';
export const DEFAULT_BREAK: SlateBreakTemplate = {
  look: 'plain',
  cards: [
    { kind: 'station-id', durationSec: 8, bedPath: `${BEDS}/a.wav` },
    { kind: 'weather', durationSec: 12, bedPath: `${BEDS}/b.wav` },
    { kind: 'upcoming', durationSec: 12, bedPath: `${BEDS}/c.wav` },
    { kind: 'station-id', durationSec: 8, bedPath: `${BEDS}/a.wav` },
  ],
};
export const IDLE_BED = `${BEDS}/d.wav`;

export type RenderSlateJob = {
  channelId: string;
  kinds?: SlateKind[];
  look?: SlateLook;
  /** Upcoming lines; job may also load from the log */
  upcomingTitles?: string[];
};

export type RenderedSlate = {
  kind: SlateKind;
  filePath: string;
  sourceUrl: string;
  durationSec: number;
  stubbed: boolean;
};
