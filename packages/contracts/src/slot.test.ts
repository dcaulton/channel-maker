import { describe, expect, it } from 'vitest';
import { scheduleSchema } from './slot';

describe('scheduleSchema', () => {
  it('accepts a theme slot and a slot with a playable asset', () => {
    const parsed = scheduleSchema.parse([
      {
        id: 'slot-empty',
        startsAt: '2026-10-10T01:00:00.000Z',
        endsAt: '2026-10-10T02:00:00.000Z',
        title: 'Philosophy block',
        mediaAsset: null,
      },
      {
        id: 'slot-playable',
        startsAt: '2026-10-10T02:00:00.000Z',
        endsAt: '2026-10-10T03:00:00.000Z',
        title: 'Justice 1',
        mediaAsset: {
          id: 'asset-1',
          title: 'Justice lecture 1',
          sourceUrl: 'http://10.0.0.89:8088/philosophy/justice-1.webm',
          work: { id: 'work-1', title: 'Justice' },
        },
      },
    ]);

    expect(parsed[0]?.mediaAsset).toBeNull();
    expect(parsed[1]?.mediaAsset?.work?.title).toBe('Justice');
  });
});
