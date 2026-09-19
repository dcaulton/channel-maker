export type Interval = {
  startsAt: Date;
  endsAt: Date;
};

export const DEFAULT_FILL_HORIZON_MS = 36 * 60 * 60 * 1000;
export const COVERAGE_GAP_MS = 1000;

export const SYNC_RULE_KINDS = new Set([
  'rotate-tv-streams',
  'windowed-sources',
]);

export function isLogContinuous(
  slots: Interval[],
  from: Date,
  to: Date,
  gapMs = COVERAGE_GAP_MS,
): boolean {
  if (to.getTime() <= from.getTime()) {
    return true;
  }

  const ordered = slots
    .filter((slot) => slot.endsAt.getTime() > from.getTime())
    .filter((slot) => slot.startsAt.getTime() < to.getTime())
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  let cursor = from.getTime();
  for (const slot of ordered) {
    const start = slot.startsAt.getTime();
    const end = slot.endsAt.getTime();
    if (start > cursor + gapMs) {
      return false;
    }
    if (end > cursor) {
      cursor = end;
    }
    if (cursor >= to.getTime()) {
      return true;
    }
  }
  return cursor >= to.getTime();
}

export function rulesetFillsSync(kinds: string[]): boolean {
  if (kinds.length === 0) {
    return false;
  }
  return kinds.every((kind) => SYNC_RULE_KINDS.has(kind));
}
