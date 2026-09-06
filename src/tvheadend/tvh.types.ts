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
