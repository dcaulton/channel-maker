const TZ = 'America/Chicago';

function zonedInstant(date: string, time: string, timeZone: string): Date {
  const guess = new Date(`${date}T${time}Z`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(guess);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '00';
  const asUtc = Date.UTC(
    Number(get('year')),
    Number(get('month')) - 1,
    Number(get('day')),
    Number(get('hour')),
    Number(get('minute')),
    Number(get('second')),
  );
  return new Date(guess.getTime() - (asUtc - guess.getTime()));
}

export function chicagoDayRange(now = new Date()): {
  from: string;
  to: string;
  label: string;
} {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const from = zonedInstant(date, '00:00:00', TZ);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(now);
  return { from: from.toISOString(), to: to.toISOString(), label };
}

export function chicagoTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}
