import { describe, expect, it } from 'vitest';
import { channelListSchema } from './channel';

const channel = {
  id: 'cmuoqqeue00f4hlb96ar2k9xs',
  name: 'Philosophy Prime',
  slug: 'philosophy-prime',
  description: null,
  isActive: true,
  _count: { slots: 18 },
};

describe('channelListSchema', () => {
  it('accepts the GET /channels item', () => {
    const parsed = channelListSchema.parse([channel]);
    expect(parsed[0]?.slug).toBe('philosophy-prime');
    expect(parsed[0]?._count?.slots).toBe(18);
  });

  it('rejects a payload that is not a channel list', () => {
    expect(() => channelListSchema.parse({ name: 'nope' })).toThrow();
  });
});
