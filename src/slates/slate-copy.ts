import { readFile } from 'node:fs/promises';
import { slateAsset } from './slate.types';
import type { SlateKind, SlateLine } from './slate.types';

const TITLE = '0xFFFFFF';
const BULLET = '0xF0E6C8';
const BODY = '0xD0D0D0';

export function stackLines(
  rows: Array<{ role: SlateLine['role']; text: string }>,
): SlateLine[] {
  return rows
    .filter((row) => row.text.trim())
    .map((row, i) => ({
      role: row.role,
      text: row.text.trim(),
      color:
        row.role === 'title' ? TITLE : row.role === 'bullet' ? BULLET : BODY,
      y: 380 + i * 80,
    }));
}

export function chicagoClock(now: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(now);
}

export function chicagoMonth(now: Date): number {
  const month = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    month: 'numeric',
  }).format(now);
  return Number(month);
}

function dayIndex(now: Date, length: number): number {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const n = Number(day.replaceAll('-', ''));
  return length === 0 ? 0 : n % length;
}

async function readJson<T>(name: string): Promise<T> {
  const raw = await readFile(slateAsset('copy', name), 'utf8');
  return JSON.parse(raw) as T;
}

export async function thoughtLine(now: Date): Promise<string> {
  const lines = await readJson<string[]>('thoughts.json');
  return lines[dayIndex(now, lines.length)] ?? 'The station is thinking.';
}

export async function commercialLine(now: Date): Promise<string> {
  const lines = await readJson<string[]>('commercials.json');
  return lines[dayIndex(now, lines.length)] ?? 'Stay tuned.';
}

export async function seasonalCard(
  now: Date,
): Promise<{ name: string; text: string }> {
  const table =
    await readJson<Record<string, { name: string; text: string }>>(
      'seasons.json',
    );
  return (
    table[String(chicagoMonth(now))] ?? {
      name: 'SEASON',
      text: 'The year is still on.',
    }
  );
}

type TriviaRow = { match: string; text: string };

export async function triviaLine(
  now: Date,
  upcomingTitles: string[],
): Promise<{ text: string; source: string }> {
  const rows = await readJson<TriviaRow[]>('trivia.json');
  const hay = upcomingTitles.join(' ').toLowerCase();
  const matched = rows.find(
    (row) => row.match !== 'default' && hay.includes(row.match),
  );
  if (matched) {
    return { text: matched.text, source: `table:${matched.match}` };
  }
  const pool = rows.filter((row) => row.match === 'default');
  const pick = pool[dayIndex(now, pool.length)] ?? rows[0];
  return { text: pick?.text ?? 'No fact on file.', source: 'table:default' };
}

const WMO: Record<number, string> = {
  0: 'clear',
  1: 'mainly clear',
  2: 'partly cloudy',
  3: 'overcast',
  45: 'fog',
  48: 'fog',
  51: 'drizzle',
  61: 'rain',
  63: 'rain',
  65: 'rain',
  71: 'snow',
  73: 'snow',
  75: 'snow',
  80: 'showers',
  95: 'thunderstorms',
};

export async function weatherLine(
  fetchImpl: typeof fetch = fetch,
): Promise<{ text: string; source: string }> {
  const lat = process.env.SLATE_WEATHER_LAT ?? '41.922';
  const lon = process.env.SLATE_WEATHER_LON ?? '-87.816';
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FChicago';
  try {
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) {
      return {
        text: 'SKY: UNRESOLVED',
        source: `open-meteo:${response.status}`,
      };
    }
    const body = (await response.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };
    const temp = body.current?.temperature_2m;
    const code = body.current?.weather_code;
    if (temp == null) {
      return { text: 'SKY: UNRESOLVED', source: 'open-meteo:empty' };
    }
    const sky = WMO[code ?? -1] ?? 'weather';
    return {
      text: `Elmwood Park ${Math.round(temp)}° ${sky}`,
      source: 'open-meteo',
    };
  } catch {
    return { text: 'SKY: UNRESOLVED', source: 'open-meteo:down' };
  }
}

export async function copyFor(
  kind: SlateKind,
  channelName: string,
  upcoming: string[],
  now: Date,
  fetchImpl: typeof fetch = fetch,
): Promise<{ lines: SlateLine[]; sources: Record<string, string> }> {
  switch (kind) {
    case 'station-id':
      return {
        lines: stackLines([
          { role: 'title', text: channelName.toUpperCase() },
          { role: 'body', text: 'CHANNEL-MAKER' },
          { role: 'body', text: chicagoClock(now) },
        ]),
        sources: { clock: 'America/Chicago' },
      };
    case 'weather': {
      const weather = await weatherLine(fetchImpl);
      return {
        lines: stackLines([
          { role: 'title', text: 'WEATHER' },
          { role: 'body', text: weather.text },
        ]),
        sources: { weather: weather.source },
      };
    }
    case 'upcoming':
      return {
        lines: stackLines([
          { role: 'title', text: 'COMING UP' },
          ...(upcoming.length
            ? upcoming.slice(0, 3).map((title, i) => ({
                role: 'bullet' as const,
                text: `${i + 1}. ${title}`,
              }))
            : [{ role: 'body' as const, text: 'The log is still empty.' }]),
        ]),
        sources: { upcoming: String(upcoming.length) },
      };
    case 'idle':
      return {
        lines: stackLines([
          { role: 'title', text: channelName.toUpperCase() },
          { role: 'body', text: 'NO PROGRAMMING' },
        ]),
        sources: {},
      };
    case 'thought':
      return {
        lines: stackLines([
          { role: 'title', text: 'DEEP THOUGHT' },
          { role: 'body', text: await thoughtLine(now) },
        ]),
        sources: { thought: 'data/slates/copy/thoughts.json' },
      };
    case 'trivia': {
      const trivia = await triviaLine(now, upcoming);
      return {
        lines: stackLines([
          { role: 'title', text: 'TRIVIA' },
          { role: 'body', text: trivia.text },
        ]),
        sources: { trivia: trivia.source },
      };
    }
    case 'commercial':
      return {
        lines: stackLines([
          { role: 'title', text: 'COMMERCIAL' },
          { role: 'body', text: await commercialLine(now) },
        ]),
        sources: { commercial: 'data/slates/copy/commercials.json' },
      };
    case 'seasonal': {
      const season = await seasonalCard(now);
      return {
        lines: stackLines([
          { role: 'title', text: season.name },
          { role: 'body', text: season.text },
        ]),
        sources: { seasonal: String(chicagoMonth(now)) },
      };
    }
  }
}
