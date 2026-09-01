export type RotateTvStreamItem = {
  title: string;
  workId: string;
  mediaAssetId: string;
  sourceUrl: string;
};

export type RotateTvStreamsPayload = {
  streamTitles: string[];
  slotDurationSec: number;
};

export type PlannedSlot = {
  startsAt: Date;
  endsAt: Date;
  title: string;
  description: string;
  workId: string;
  mediaAssetId: string;
  sourceUrl: string;
  streamIndex: number;
};

export function parseRotateTvStreamsPayload(
  payload: unknown,
): RotateTvStreamsPayload {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('rotate-tv-streams payload must be an object');
  }
  const raw = payload as {
    streamTitles?: unknown;
    slotDurationSec?: unknown;
  };
  if (
    !Array.isArray(raw.streamTitles) ||
    raw.streamTitles.length === 0 ||
    raw.streamTitles.some(
      (title) => typeof title !== 'string' || title.length === 0,
    )
  ) {
    throw new Error(
      'rotate-tv-streams payload.streamTitles must be a non-empty string[]',
    );
  }
  if (
    typeof raw.slotDurationSec !== 'number' ||
    !Number.isFinite(raw.slotDurationSec) ||
    raw.slotDurationSec < 60
  ) {
    throw new Error('rotate-tv-streams payload.slotDurationSec must be >= 60');
  }
  return {
    streamTitles: raw.streamTitles,
    slotDurationSec: raw.slotDurationSec,
  };
}

export function alignDown(at: Date, slotDurationSec: number): Date {
  const ms = slotDurationSec * 1000;
  return new Date(Math.floor(at.getTime() / ms) * ms);
}

export function planRotateTvStreams(args: {
  from: Date;
  to: Date;
  payload: RotateTvStreamsPayload;
  streams: RotateTvStreamItem[];
}): PlannedSlot[] {
  const { payload } = args;
  if (args.to <= args.from) {
    throw new Error('to must be after from');
  }
  if (args.streams.length !== payload.streamTitles.length) {
    throw new Error(
      `rotate-tv-streams expected ${payload.streamTitles.length} resolved streams, got ${args.streams.length}`,
    );
  }

  const durationMs = payload.slotDurationSec * 1000;
  const slots: PlannedSlot[] = [];
  let cursor = alignDown(args.from, payload.slotDurationSec);

  while (cursor < args.to) {
    const endsAt = new Date(cursor.getTime() + durationMs);
    if (endsAt > args.from && cursor < args.to) {
      const streamIndex =
        Math.floor(cursor.getTime() / durationMs) % args.streams.length;
      const stream = args.streams[streamIndex];
      slots.push({
        startsAt: cursor,
        endsAt,
        title: stream.title,
        description: `rotate-tv-streams index=${streamIndex} ${stream.sourceUrl}`,
        workId: stream.workId,
        mediaAssetId: stream.mediaAssetId,
        sourceUrl: stream.sourceUrl,
        streamIndex,
      });
    }
    cursor = endsAt;
  }

  return slots;
}
