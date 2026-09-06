import { TvhChannel } from './tvh.types';

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
