/** Resolve wall-clock input without using the browser/server's own timezone. */
export function localTime(instant: string, zone: string) {
  const fields = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant));
  const get = (type: string) => fields.find((f) => f.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

export function timeChoices(local: string, zone: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))
    throw new Error('Enter a complete local date and time.');
  const wall = Date.parse(local + ':00Z');
  if (
    !Number.isFinite(wall) ||
    new Date(wall).toISOString().slice(0, 16) !== local ||
    Number(local.slice(0, 4)) < 1900
  )
    throw new Error('Enter a valid date from 1900 onward.');
  try {
    localTime(new Date(wall).toISOString(), zone);
  } catch {
    throw new Error('Enter an IANA time zone, such as America/Los_Angeles.');
  }
  const offsets = new Set<number>();
  // Sample the offsets on both sides of a transition, including half-hour shifts
  // and date-line changes. Each candidate must then round-trip exactly.
  for (let hours = -48; hours <= 48; hours += 6) {
    const sampled = wall + hours * 3600000;
    offsets.add(
      Date.parse(localTime(new Date(sampled).toISOString(), zone) + ':00Z') -
        sampled,
    );
  }
  return [...offsets]
    .map((offset) => ({
      starts: new Date(wall - offset).toISOString(),
      label: `UTC${offset < 0 ? '−' : '+'}${String(Math.floor(Math.abs(offset) / 3600000)).padStart(2, '0')}:${String((Math.abs(offset) / 60000) % 60).padStart(2, '0')}`,
    }))
    .filter((choice) => localTime(choice.starts, zone) === local)
    .sort((a, b) => a.starts.localeCompare(b.starts));
}

export function resolveTime(local: string, zone: string, chosen: unknown) {
  const choices = timeChoices(local, zone);
  if (!choices.length)
    throw new Error(
      'That local time does not exist in this zone. Choose another time.',
    );
  if (choices.length === 1 && !chosen) return choices[0].starts;
  const match = choices.find((choice) => choice.starts === chosen);
  if (!match) throw new Error('Choose the UTC offset for this local time.');
  return match.starts;
}
