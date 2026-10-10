import { describe, expect, it } from 'vitest';
import { assetPageSchema } from './asset-search';

describe('assetPageSchema', () => {
  it('accepts a page of title hits', () => {
    const parsed = assetPageSchema.parse({
      items: [
        {
          id: 'asset-1',
          title: 'Justice 1',
          sourceUrl: 'http://10.0.0.89:8088/philosophy/justice-1.webm',
          work: { id: 'work-1', title: 'Justice 1', seriesTitle: 'Justice' },
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    });
    expect(parsed.items[0]?.work?.seriesTitle).toBe('Justice');
  });
});
