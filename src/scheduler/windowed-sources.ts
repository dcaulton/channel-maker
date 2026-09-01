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
};

export type WindowedSourcesPayload = {
  timeZone: string;
  episodeOrigin: string;
  items: WindowedSourceItem[];
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
};

type CivilDate = { year: number; month: number; day: number };

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
  return {
    start: raw.start,
    end: raw.end,
    days,
    mode: raw.mode,
    title: raw.title,
    seriesTitle:
      typeof raw.seriesTitle === 'string' ? raw.seriesTitle : undefined,
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

  const occurrence = countPriorOccurrences(
    args.origin,
    args.day,
    args.timeZone,
    item,
  );
  const perWindow = episodesThatFit(catalog, start, end);
  if (perWindow === 0) {
    return [];
  }
  const startIndex = (occurrence * perWindow) % catalog.length;
  const slots: PlannedWindowSlot[] = [];
  let cursor = start;
  for (let i = 0; i < perWindow; i += 1) {
    const ep = catalog[(startIndex + i) % catalog.length];
    const endsAt = new Date(cursor.getTime() + ep.durationSec * 1000);
    slots.push({
      startsAt: cursor,
      endsAt,
      title: ep.title,
      description: `windowed-sources ${seriesTitle} S${pad(ep.season)}E${pad(ep.episode)}`,
      workId: ep.workId,
      mediaAssetId: ep.mediaAssetId,
      sourceUrl: ep.sourceUrl,
    });
    cursor = endsAt;
  }
  return slots;
}

function episodesThatFit(
  catalog: EpisodeRef[],
  start: Date,
  end: Date,
): number {
  const windowMs = end.getTime() - start.getTime();
  // Mock catalogs are uniform duration; use the first episode.
  const durationMs = catalog[0].durationSec * 1000;
  return Math.floor(windowMs / durationMs);
}

function countPriorOccurrences(
  origin: CivilDate,
  day: CivilDate,
  timeZone: string,
  item: WindowedSourceItem,
): number {
  let count = 0;
  for (const cursor of eachCivilDay(
    origin,
    addLocalDays(day.year, day.month, day.day, -1),
  )) {
    if (runsOnDay(item, timeZone, cursor)) {
      count += 1;
    }
  }
  return count;
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
