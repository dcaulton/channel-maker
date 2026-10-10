import {
  channelListSchema,
  type ChannelListItem,
} from '@channel-maker/contracts';

export function apiBaseUrl(): string {
  return process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';
}

export async function loadChannels(): Promise<{
  channels: ChannelListItem[];
  error: string | null;
}> {
  const base = apiBaseUrl();
  try {
    const response = await fetch(`${base}/channels`, { cache: 'no-store' });
    if (!response.ok) {
      return { channels: [], error: `Nest returned ${response.status}` };
    }
    return {
      channels: channelListSchema.parse(await response.json()),
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'request failed';
    return {
      channels: [],
      error: `Could not reach Nest at ${base}. ${message}`,
    };
  }
}
