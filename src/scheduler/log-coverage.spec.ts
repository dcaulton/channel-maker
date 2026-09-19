import { isLogContinuous, rulesetFillsSync } from './log-coverage';

const t = (iso: string) => new Date(iso);

describe('isLogContinuous', () => {
  it('is true when one slot covers the whole window', () => {
    expect(
      isLogContinuous(
        [
          {
            startsAt: t('2026-09-19T12:00:00.000Z'),
            endsAt: t('2026-09-21T00:00:00.000Z'),
          },
        ],
        t('2026-09-19T18:00:00.000Z'),
        t('2026-09-20T06:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it('is true when adjacent slots abut', () => {
    expect(
      isLogContinuous(
        [
          {
            startsAt: t('2026-09-19T18:00:00.000Z'),
            endsAt: t('2026-09-19T20:00:00.000Z'),
          },
          {
            startsAt: t('2026-09-19T20:00:00.000Z'),
            endsAt: t('2026-09-20T06:00:00.000Z'),
          },
        ],
        t('2026-09-19T18:00:00.000Z'),
        t('2026-09-20T06:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it('is false when now is uncovered', () => {
    expect(
      isLogContinuous(
        [
          {
            startsAt: t('2026-09-19T20:00:00.000Z'),
            endsAt: t('2026-09-20T06:00:00.000Z'),
          },
        ],
        t('2026-09-19T18:00:00.000Z'),
        t('2026-09-20T06:00:00.000Z'),
      ),
    ).toBe(false);
  });

  it('is false when there is a hole in the middle', () => {
    expect(
      isLogContinuous(
        [
          {
            startsAt: t('2026-09-19T18:00:00.000Z'),
            endsAt: t('2026-09-19T20:00:00.000Z'),
          },
          {
            startsAt: t('2026-09-19T21:00:00.000Z'),
            endsAt: t('2026-09-20T06:00:00.000Z'),
          },
        ],
        t('2026-09-19T18:00:00.000Z'),
        t('2026-09-20T06:00:00.000Z'),
      ),
    ).toBe(false);
  });

  it('is false when coverage stops before `to`', () => {
    expect(
      isLogContinuous(
        [
          {
            startsAt: t('2026-09-19T18:00:00.000Z'),
            endsAt: t('2026-09-19T22:00:00.000Z'),
          },
        ],
        t('2026-09-19T18:00:00.000Z'),
        t('2026-09-20T06:00:00.000Z'),
      ),
    ).toBe(false);
  });

  it('ignores slots outside the window', () => {
    expect(
      isLogContinuous(
        [
          {
            startsAt: t('2026-09-19T00:00:00.000Z'),
            endsAt: t('2026-09-19T01:00:00.000Z'),
          },
          {
            startsAt: t('2026-09-19T18:00:00.000Z'),
            endsAt: t('2026-09-20T06:00:00.000Z'),
          },
        ],
        t('2026-09-19T18:00:00.000Z'),
        t('2026-09-20T06:00:00.000Z'),
      ),
    ).toBe(true);
  });
});

describe('rulesetFillsSync', () => {
  it('is true for current deterministic kinds', () => {
    expect(rulesetFillsSync(['windowed-sources', 'rotate-tv-streams'])).toBe(
      true,
    );
  });

  it('is false when any rule is not sync-safe', () => {
    expect(rulesetFillsSync(['windowed-sources', 'llm-prompt'])).toBe(false);
  });

  it('is false with no rules', () => {
    expect(rulesetFillsSync([])).toBe(false);
  });
});
