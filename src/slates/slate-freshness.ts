import type { SlateKind } from './slate.types';

export type Freshness = 'static' | 'hour' | 'day' | 'titles';

const FRESHNESS: Record<SlateKind, Freshness> = {
  'station-id': 'hour',
  weather: 'hour',
  upcoming: 'titles',
  idle: 'static',
  thought: 'day',
  trivia: 'day',
  commercial: 'day',
  seasonal: 'day',
};

export function freshnessOf(kind: SlateKind): Freshness {
  return FRESHNESS[kind];
}

function chicagoParts(now: Date): { day: string; hour: string } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((part) => [part.type, part.value]),
  );
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  return { day, hour: `${day}T${parts.hour}` };
}

/** Lookup key. A rendered card is stale when its embedded bucket differs. */
export function freshnessBucket(
  kind: SlateKind,
  now: Date,
  upcomingTitles: string[] = [],
  renderer = '',
): string {
  const { day, hour } = chicagoParts(now);
  const policy = FRESHNESS[kind];
  const body =
    policy === 'static'
      ? 'static'
      : policy === 'hour'
        ? hour
        : policy === 'day'
          ? day
          : upcomingTitles.join('|');
  return `${renderer || 'basic'}:${body}`;
}
