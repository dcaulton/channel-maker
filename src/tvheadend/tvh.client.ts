import { TvhChannel } from './tvh.types';
import { TvhDvrEntry } from './tvh.types';

export function tvhStreamUrl(base: string, uuid: string): string {
  const trimmed = base.replace(/\/$/, '');
  return `${trimmed}/stream/channel/${uuid}`;
}

export class TvhClient {
  constructor(
    private readonly baseUrl: string,
    private readonly username: string,
    private readonly password: string,
  ) {}

  async listChannels(): Promise<TvhChannel[]> {
    const url = new URL('/api/channel/grid', this.baseUrl);
    url.searchParams.set('limit', '5000');
    url.searchParams.set('start', '0');

    const response = await fetch(url, {
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(`${this.username}:${this.password}`).toString('base64'),
      },
    });
    if (!response.ok) {
      throw new Error(
        `TVH channel/grid failed: ${response.status} ${response.statusText}`,
      );
    }
    const body = (await response.json()) as {
      entries?: Array<{
        uuid?: unknown;
        name?: unknown;
        number?: unknown;
        enabled?: unknown;
      }>;
    };
    return (body.entries ?? [])
      .filter(
        (row) =>
          typeof row.uuid === 'string' &&
          typeof row.name === 'string' &&
          row.uuid.length > 0,
      )
      .map((row) => ({
        uuid: row.uuid as string,
        name: row.name as string,
        number:
          typeof row.number === 'number' || typeof row.number === 'string'
            ? row.number
            : undefined,
        enabled: row.enabled !== false,
      }));
  }

  async listFinishedRecordings(limit = 500): Promise<TvhDvrEntry[]> {
    const url = new URL('/api/dvr/entry/grid_finished', this.baseUrl);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('start', '0');
    const response = await fetch(url, {
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(`${this.username}:${this.password}`).toString('base64'),
      },
      signal: AbortSignal.timeout(20_000),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(
        `TVH dvr/grid_finished failed: ${response.status} ${response.statusText}`,
      );
    }
    const body = JSON.parse(text) as { entries?: unknown[] };
    const entries = Array.isArray(body.entries) ? body.entries : [];

    return entries
      .map((row) => mapTvhDvrRow(row as Parameters<typeof mapTvhDvrRow>[0]))
      .filter((row): row is TvhDvrEntry => row !== null);
  }
}

export function tvhClientFromEnv(): TvhClient {
  const base = process.env.TVH_URL;
  const user = process.env.TVH_USER;
  const pass = process.env.TVH_PASS;
  if (!base || !user || !pass) {
    throw new Error('TVH_URL, TVH_USER, and TVH_PASS must be set');
  }
  return new TvhClient(base, user, pass);
}

export function tvhStreamBaseFromEnv(): string {
  return (
    process.env.TVH_STREAM_BASE ??
    process.env.TVH_URL ??
    'http://127.0.0.1:9981'
  );
}

export function tvhDvrUrl(base: string, uuid: string): string {
  return `${base.replace(/\/$/, '')}/dvrfile/${uuid}`;
}

export function mapTvhDvrRow(row: {
  uuid?: unknown;
  disp_title?: unknown;
  title?: unknown;
  disp_subtitle?: unknown;
  channelname?: unknown;
  start?: unknown;
  stop?: number;
}): TvhDvrEntry | null {
  if (typeof row.uuid !== 'string' || row.uuid.length === 0) {
    return null;
  }
  const title = displayTitle(row.disp_title) ?? displayTitle(row.title);
  if (!title) {
    return null;
  }
  const start = typeof row.start === 'number' ? row.start : 0;
  const stop = typeof row.stop === 'number' ? row.stop : start;
  return {
    uuid: row.uuid,
    title,
    subtitle: displayTitle(row.disp_subtitle),
    channelName:
      typeof row.channelname === 'string' ? row.channelname : undefined,
    start,
    stop,
    durationSec: Math.max(60, stop - start),
  };
}

function displayTitle(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (value && typeof value === 'object') {
    const first = Object.values(value as Record<string, unknown>).find(
      (part) => typeof part === 'string' && part.length > 0,
    );
    return typeof first === 'string' ? first : undefined;
  }
  return undefined;
}
