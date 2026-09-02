export type Hm = { hour: number; minute: number };

export function parseHm(value: string): Hm {
  if (value === '24:00') {
    return { hour: 24, minute: 0 };
  }
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Invalid HH:MM: ${value}`);
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 24 || minute > 59 || (hour === 24 && minute !== 0)) {
    throw new Error(`Invalid HH:MM: ${value}`);
  }
  return { hour, minute };
}

export function localParts(
  instant: Date,
  timeZone: string,
): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function offsetMs(instant: Date, timeZone: string): number {
  const local = localParts(instant, timeZone);
  const asUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    0,
  );
  return asUtc - instant.getTime();
}

/** Instant when the zone's clock shows this civil time. */
export function zonedLocalToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const first = offsetMs(new Date(utcGuess), timeZone);
  let instant = utcGuess - first;
  const second = offsetMs(new Date(instant), timeZone);
  if (second !== first) {
    instant = utcGuess - second;
  }
  return new Date(instant);
}

export function addLocalDays(
  year: number,
  month: number,
  day: number,
  days: number,
): { year: number; month: number; day: number } {
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

export function localWeekday(
  timeZone: string,
  year: number,
  month: number,
  day: number,
): number {
  const noon = zonedLocalToUtc(timeZone, year, month, day, 12, 0);
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(noon);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const value = map[label];
  if (value === undefined) {
    throw new Error(`Unexpected weekday ${label}`);
  }
  return value;
}
