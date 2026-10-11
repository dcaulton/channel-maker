import { describe, expect, it } from 'vitest';
import { workPageSchema } from './work-search';

describe('workPageSchema', () => {
  it('accepts a page of works', () => {
    const parsed = workPageSchema.parse({
      items: [
        {
          id: 'w1',
          title: 'Justice 1',
          kind: 'episode',
          seriesTitle: 'Justice',
          season: 1,
          episode: 1,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    });
    expect(parsed.items[0]?.seriesTitle).toBe('Justice');
  });
});
