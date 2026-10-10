import { describe, expect, it } from 'vitest';
import { windowedPayloadSchema } from './ruleset';

describe('windowedPayloadSchema', () => {
  it('accepts a daypart item', () => {
    const parsed = windowedPayloadSchema.parse({
      timeZone: 'America/Chicago',
      episodeOrigin: '2026-09-01',
      items: [
        {
          start: '20:00',
          end: '22:00',
          days: 'daily',
          mode: 'episodes',
          title: 'Justice',
          seriesTitle: 'Justice',
        },
      ],
    });
    expect(parsed.items[0]?.seriesTitle).toBe('Justice');
  });
});
