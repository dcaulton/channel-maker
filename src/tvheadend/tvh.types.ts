export type TvhChannel = {
  uuid: string;
  name: string;
  number?: number | string;
  enabled: boolean;
};

export type TvhSyncResult = {
  fetched: number;
  upserted: number;
  skippedDisabled: number;
  pruned: number;
  dryRun: boolean;
  channels: Array<{ name: string; uuid: string; sourceUrl: string }>;
};

export type TvhDvrEntry = {
  uuid: string;
  title: string;
  subtitle?: string;
  channelName?: string;
  start: number;
  stop: number;
  durationSec: number;
};

export type TvhDvrSyncResult = {
  fetched: number;
  upserted: number;
  dryRun: boolean;
  recordings: Array<{ title: string; uuid: string; sourceUrl: string }>;
};
