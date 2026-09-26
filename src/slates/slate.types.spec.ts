import { DEFAULT_BREAK, IDLE_BED, SLATE_KINDS } from './slate.types';

describe('slate break template', () => {
  it('is station-id, weather, upcoming, station-id', () => {
    expect(DEFAULT_BREAK.cards.map((card) => card.kind)).toEqual([
      'station-id',
      'weather',
      'upcoming',
      'station-id',
    ]);
  });

  it('points each card at a wav under slates/audio', () => {
    for (const card of DEFAULT_BREAK.cards) {
      expect(card.bedPath).toMatch(/\/slates\/audio\/[a-d]\.wav$/);
    }
  });

  it('keeps idle on its own bed', () => {
    expect(IDLE_BED).toBe('/mnt/nas/videos/slates/audio/d.wav');
    expect(SLATE_KINDS).toContain('idle');
  });

  it('uses 8s idents and 12s weather/upcoming', () => {
    expect(
      DEFAULT_BREAK.cards.find((card) => card.kind === 'station-id')
        ?.durationSec,
    ).toBe(8);
    expect(
      DEFAULT_BREAK.cards.find((card) => card.kind === 'weather')?.durationSec,
    ).toBe(12);
  });
});
