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

  it('points each card at a wav in the app data directory', () => {
    for (const card of DEFAULT_BREAK.cards) {
      expect(card.bedPath).toMatch(/data\/slates\/audio\/[a-d]\.wav$/);
      expect(card.imagePath).toMatch(/data\/slates\/images\/.+\.png$/);
    }
  });

  it('keeps idle on its own bed', () => {
    expect(IDLE_BED).toMatch(/data\/slates\/audio\/d\.wav$/);
    expect(SLATE_KINDS).toEqual([
      'station-id',
      'weather',
      'upcoming',
      'idle',
      'thought',
      'trivia',
      'commercial',
      'seasonal',
    ]);
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

  it('leaves the renderer empty so the basic object is used', () => {
    expect(DEFAULT_BREAK.renderer).toBe('');
  });
});
