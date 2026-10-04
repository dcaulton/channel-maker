import { freshnessBucket } from './slate-freshness';

describe('slate freshness lookup', () => {
  const noon = new Date('2026-10-04T17:00:00.000Z');

  it('buckets the clock and weather by Chicago hour', () => {
    expect(freshnessBucket('station-id', noon)).toBe('basic:2026-10-04T12');
    expect(freshnessBucket('weather', noon)).toBe('basic:2026-10-04T12');
  });

  it('buckets thought, trivia, commercial, and seasonal by Chicago day', () => {
    expect(freshnessBucket('thought', noon)).toBe('basic:2026-10-04');
    expect(freshnessBucket('commercial', noon)).toBe('basic:2026-10-04');
    expect(freshnessBucket('seasonal', noon)).toBe('basic:2026-10-04');
  });

  it('keeps idle static and upcoming tied to titles', () => {
    expect(freshnessBucket('idle', noon)).toBe('basic:static');
    expect(freshnessBucket('upcoming', noon, ['Justice', 'Death'])).toBe(
      'basic:Justice|Death',
    );
  });

  it('includes a named renderer so a style change rebuilds', () => {
    expect(freshnessBucket('idle', noon, [], 'vhs')).toBe('vhs:static');
  });
});
