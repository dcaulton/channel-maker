import {
  addLocalDays,
  localParts,
  localWeekday,
  parseHm,
  zonedLocalToUtc,
} from './zoned-time';

export type WindowMode = 'live' | 'episodes' | 'slate';

export type WindowedSourceItem = {
  start: string;
  end: string;
  days: 'daily' | number[];
  mode: WindowMode;
  title: string;
  seriesTitle?: string;
  overflow?: 'slate' | 'carry';
  slateTitle?: string;
};

export type WindowedSourcesPayload = {
  timeZone: string;
  episodeOrigin: string;
  items: WindowedSourceItem[];
  fallbackSlateTitle?: string;
};

export type EpisodeRef = {
  title: string;
  workId: string;
  mediaAssetId: string;
  sourceUrl: string;
  season: number;
  episode: number;
  durationSec: number;
};

export type LiveRef = {
  title: string;
  workId: string;
  mediaAssetId: string;
  sourceUrl: string;
};

export type SlateRef = {
  title: string;
  workId: string;
  mediaAssetId: string;
  sourceUrl: string;
};

export type PlannedWindowSlot = {
  startsAt: Date;
  endsAt: Date;
  title: string;
  description: string;
  workId: string;
  mediaAssetId: string;
  sourceUrl: string;
  startOffsetSec?: number;
};

type CivilDate = { year: number; month: number; day: number };
type PackState = { index: number; offsetSec: number };

export function parseWindowedSourcesPayload(
  payload: unknown,
): WindowedSourcesPayload {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('windowed-sources payload must be an object');
  }
  const raw = payload as {
    timeZone?: unknown;
    episodeOrigin?: unknown;
    items?: unknown;
  };
  if (typeof raw.timeZone !== 'string' || raw.timeZone.length === 0) {
    throw new Error('windowed-sources payload.timeZone is required');
  }
  if (
    typeof raw.episodeOrigin !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(raw.episodeOrigin)
  ) {
    throw new Error(
      'windowed-sources payload.episodeOrigin must be YYYY-MM-DD',
    );
  }
  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    throw new Error('windowed-sources payload.items must be a non-empty array');
  }
  return {
    timeZone: raw.timeZone,
    episodeOrigin: raw.episodeOrigin,
    items: raw.items.map((item, index) => parseItem(item, index)),
    fallbackSlateTitle:
      typeof raw.fallbackSlateTitle === 'string'
        ? raw.fallbackSlateTitle
        : undefined,
  };
}

function parseItem(item: unknown, index: number): WindowedSourceItem {
  if (typeof item !== 'object' || item === null) {
    throw new Error(`items[${index}] must be an object`);
  }
  const raw = item as Record<string, unknown>;
  if (raw.mode !== 'live' && raw.mode !== 'episodes' && raw.mode !== 'slate') {
    throw new Error(`items[${index}].mode is invalid`);
  }
  if (typeof raw.start !== 'string' || typeof raw.end !== 'string') {
    throw new Error(`items[${index}] needs start and end`);
  }
  parseHm(raw.start);
  parseHm(raw.end);
  if (typeof raw.title !== 'string' || raw.title.length === 0) {
    throw new Error(`items[${index}].title is required`);
  }
  let days: 'daily' | number[] = 'daily';
  if (raw.days !== undefined && raw.days !== 'daily') {
    if (
      !Array.isArray(raw.days) ||
      raw.days.some((d) => typeof d !== 'number' || d < 0 || d > 6)
    ) {
      throw new Error(`items[${index}].days must be "daily" or 0-6[]`);
    }
    days = raw.days;
  }
  let overflow: 'slate' | 'carry' | undefined;
  if (raw.overflow !== undefined) {
    if (raw.overflow !== 'slate' && raw.overflow !== 'carry') {
      throw new Error(`items[${index}].overflow must be slate|carry`);
    }
    overflow = raw.overflow;
  }
  return {
    start: raw.start,
    end: raw.end,
    days,
    mode: raw.mode,
    title: raw.title,
    seriesTitle:
      typeof raw.seriesTitle === 'string' ? raw.seriesTitle : undefined,
    overflow: overflow,
    slateTitle: typeof raw.slateTitle === 'string' ? raw.slateTitle : undefined,
  };
}

export function planWindowedSources(args: {
  from: Date;
  to: Date;
  payload: WindowedSourcesPayload;
  liveByTitle: Record<string, LiveRef>;
  episodesBySeries: Record<string, EpisodeRef[]>;
  slateByTitle: Record<string, SlateRef>;
}): PlannedWindowSlot[] {
  if (args.to <= args.from) {
    throw new Error('to must be after from');
  }

  const origin = parseIsoDate(args.payload.episodeOrigin);
  const startDay = civilFromInstant(args.from, args.payload.timeZone);
  const endDay = civilFromInstant(
    new Date(args.to.getTime() - 1),
    args.payload.timeZone,
  );

  const slots: PlannedWindowSlot[] = [];
  for (const day of eachCivilDay(startDay, endDay)) {
    for (const item of args.payload.items) {
      if (!runsOnDay(item, args.payload.timeZone, day)) {
        continue;
      }
      const { start, end } = windowUtc(
        args.payload.timeZone,
        day,
        item.start,
        item.end,
      );
      if (end <= args.from || start >= args.to) {
        continue;
      }
      slots.push(
        ...planItem({
          item,
          start,
          end,
          day,
          origin,
          timeZone: args.payload.timeZone,
          liveByTitle: args.liveByTitle,
          episodesBySeries: args.episodesBySeries,
          slateByTitle: args.slateByTitle,
          fallbackSlateTitle: args.payload.fallbackSlateTitle,
        }),
      );
    }
  }
  slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  return slots;
}

function planItem(args: {
  item: WindowedSourceItem;
  start: Date;
  end: Date;
  day: CivilDate;
  origin: CivilDate;
  timeZone: string;
  liveByTitle: Record<string, LiveRef>;
  episodesBySeries: Record<string, EpisodeRef[]>;
  slateByTitle: Record<string, SlateRef>;
  fallbackSlateTitle?: string;
}): PlannedWindowSlot[] {
  const { item, start, end } = args;
  if (item.mode === 'live') {
    const live = args.liveByTitle[item.title];
    if (!live) {
      throw new Error(`No live source titled "${item.title}"`);
    }
    return [
      {
        startsAt: start,
        endsAt: end,
        title: live.title,
        description: `windowed-sources live ${item.start}-${item.end}`,
        workId: live.workId,
        mediaAssetId: live.mediaAssetId,
        sourceUrl: live.sourceUrl,
      },
    ];
  }

  if (item.mode === 'slate') {
    const slate = args.slateByTitle[item.title];
    if (!slate) {
      throw new Error(`No slate source titled "${item.title}"`);
    }
    return [
      {
        startsAt: start,
        endsAt: end,
        title: slate.title,
        description: `windowed-sources slate ${item.start}-${item.end}`,
        workId: slate.workId,
        mediaAssetId: slate.mediaAssetId,
        sourceUrl: slate.sourceUrl,
      },
    ];
  }

  const seriesTitle = item.seriesTitle ?? item.title;
  const catalog = args.episodesBySeries[seriesTitle];
  if (!catalog || catalog.length === 0) {
    throw new Error(`No episode catalog for "${seriesTitle}"`);
  }

  const overflow = item.overflow ?? 'slate';
  const slateTitle =
    item.slateTitle ?? args.fallbackSlateTitle ?? 'No programming';

  const { index, offsetSec } = replayCursor({
    catalog,
    origin: args.origin,
    day: args.day,
    timeZone: args.timeZone,
    item,
    overflow,
  });

  return packEpisodeWindow({
    catalog,
    seriesTitle,
    windowStart: start,
    windowEnd: end,
    index,
    offsetSec,
    overflow,
    slate: overflow === 'slate' ? args.slateByTitle[slateTitle] : undefined,
    slateTitle,
  }).slots;
}

function runsOnDay(
  item: WindowedSourceItem,
  timeZone: string,
  day: CivilDate,
): boolean {
  if (item.days === 'daily') {
    return true;
  }
  const weekday = localWeekday(timeZone, day.year, day.month, day.day);
  return item.days.includes(weekday);
}

function windowUtc(
  timeZone: string,
  day: CivilDate,
  startHm: string,
  endHm: string,
): { start: Date; end: Date } {
  const start = parseHm(startHm);
  const end = parseHm(endHm);
  const startUtc = zonedLocalToUtc(
    timeZone,
    day.year,
    day.month,
    day.day,
    start.hour,
    start.minute,
  );
  if (end.hour === 24 && end.minute === 0) {
    const next = addLocalDays(day.year, day.month, day.day, 1);
    return {
      start: startUtc,
      end: zonedLocalToUtc(timeZone, next.year, next.month, next.day, 0, 0),
    };
  }
  const endUtc = zonedLocalToUtc(
    timeZone,
    day.year,
    day.month,
    day.day,
    end.hour,
    end.minute,
  );
  if (endUtc <= startUtc) {
    throw new Error(`Window ${startHm}-${endHm} does not end after it starts`);
  }
  return { start: startUtc, end: endUtc };
}

function parseIsoDate(value: string): CivilDate {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

function civilFromInstant(instant: Date, timeZone: string): CivilDate {
  const parts = localParts(instant, timeZone);
  return { year: parts.year, month: parts.month, day: parts.day };
}

function eachCivilDay(from: CivilDate, to: CivilDate): CivilDate[] {
  const days: CivilDate[] = [];
  let cursor = from;
  while (compareCivil(cursor, to) <= 0) {
    days.push(cursor);
    cursor = addLocalDays(cursor.year, cursor.month, cursor.day, 1);
  }
  return days;
}

function compareCivil(a: CivilDate, b: CivilDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function replayCursor(args: {
  catalog: EpisodeRef[];
  origin: CivilDate;
  day: CivilDate;
  timeZone: string;
  item: WindowedSourceItem;
  overflow: 'slate' | 'carry';
}): PackState {
  let state: PackState = { index: 0, offsetSec: 0 };
  const prior = eachCivilDay(
    args.origin,
    addLocalDays(args.day.year, args.day.month, args.day.day, -1),
  );
  for (const day of prior) {
    if (!runsOnDay(args.item, args.timeZone, day)) {
      continue;
    }
    const { start, end } = windowUtc(
      args.timeZone,
      day,
      args.item.start,
      args.item.end,
    );
    state = packEpisodeWindow({
      catalog: args.catalog,
      seriesTitle: args.item.seriesTitle ?? args.item.title,
      windowStart: start,
      windowEnd: end,
      index: state.index,
      offsetSec: state.offsetSec,
      overflow: args.overflow,
      slate: undefined,
    }).state;
  }
  return {
    index: state.index % args.catalog.length,
    offsetSec: state.offsetSec,
  };
}

export function packEpisodeWindow(args: {
  catalog: EpisodeRef[];
  seriesTitle: string;
  windowStart: Date;
  windowEnd: Date;
  index: number;
  offsetSec: number;
  overflow: 'slate' | 'carry';
  slate?: SlateRef;
  slateTitle?: string;
}): { slots: PlannedWindowSlot[]; state: PackState } {
  const slots: PlannedWindowSlot[] = [];
  let cursor = args.windowStart;
  let index = args.index;
  let offsetSec = args.offsetSec;
  const catalogLen = args.catalog.length;

  while (cursor < args.windowEnd) {
    const remainingWindowSec = Math.round(
      (args.windowEnd.getTime() - cursor.getTime()) / 1000,
    );
    if (remainingWindowSec <= 0) {
      break;
    }

    const ep = args.catalog[index % catalogLen];
    const remainingFileSec = ep.durationSec - offsetSec;

    if (args.overflow === 'slate' && remainingFileSec > remainingWindowSec) {
      if (!args.slate) {
        throw new Error(
          `Need a slate titled "${args.slateTitle ?? 'No programming'}" to pad leftover`,
        );
      }
      slots.push({
        startsAt: cursor,
        endsAt: args.windowEnd,
        title: args.slate.title,
        description: `windowed-sources leftover slate ${remainingWindowSec}s`,
        workId: args.slate.workId,
        mediaAssetId: args.slate.mediaAssetId,
        sourceUrl: args.slate.sourceUrl,
      });
      break;
    }

    const playSec = Math.min(remainingFileSec, remainingWindowSec);
    const endsAt = new Date(cursor.getTime() + playSec * 1000);
    slots.push({
      startsAt: cursor,
      endsAt,
      title: ep.title,
      description: `windowed-sources ${args.seriesTitle} S${pad(ep.season)}E${pad(ep.episode)} offset=${offsetSec}`,
      workId: ep.workId,
      mediaAssetId: ep.mediaAssetId,
      sourceUrl: ep.sourceUrl,
      startOffsetSec: offsetSec,
    });

    cursor = endsAt;
    if (playSec >= remainingFileSec) {
      index = (index + 1) % catalogLen;
      offsetSec = 0;
    } else {
      offsetSec += playSec;
    }
  }

  return { slots, state: { index: index % catalogLen, offsetSec } };
}
