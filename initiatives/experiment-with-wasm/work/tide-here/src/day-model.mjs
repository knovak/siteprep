const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;

const formatterCache = new Map();

function formatterFor(timeZone) {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(timeZone, new Intl.DateTimeFormat('en-CA', {
      timeZone,
      calendar: 'iso8601',
      numberingSystem: 'latn',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }));
  }
  return formatterCache.get(timeZone);
}

function assertTimeZone(timeZone) {
  if (typeof timeZone !== 'string' || timeZone.length === 0) {
    throw new RangeError(`Invalid IANA time zone: ${timeZone}`);
  }
  try {
    formatterFor(timeZone).format(0);
  } catch {
    throw new RangeError(`Invalid IANA time zone: ${timeZone}`);
  }
}

function instantMilliseconds(instant) {
  const value = instant instanceof Date ? instant.getTime() : new Date(instant).getTime();
  if (!Number.isFinite(value)) throw new RangeError(`Invalid instant: ${instant}`);
  return value;
}

function localParts(instant, timeZone) {
  assertTimeZone(timeZone);
  const values = {};
  for (const part of formatterFor(timeZone).formatToParts(instantMilliseconds(instant))) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second
  };
}

function dateString({ year, month, day }) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDate(localDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  if (!match) throw new RangeError(`Invalid local date: ${localDate}`);
  const values = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const check = new Date(Date.UTC(values.year, values.month - 1, values.day));
  if (
    check.getUTCFullYear() !== values.year ||
    check.getUTCMonth() + 1 !== values.month ||
    check.getUTCDate() !== values.day
  ) {
    throw new RangeError(`Invalid local date: ${localDate}`);
  }
  return values;
}

export function localDateForInstant(instant, timeZone) {
  return dateString(localParts(instant, timeZone));
}

export function offsetMinutesAt(instant, timeZone) {
  const milliseconds = instantMilliseconds(instant);
  const parts = localParts(milliseconds, timeZone);
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return Math.round((representedAsUtc - Math.floor(milliseconds / 1000) * 1000) / 60000);
}

export function formatOffset(offsetMinutes) {
  if (!Number.isInteger(offsetMinutes)) throw new TypeError('Offset must be an integer number of minutes');
  const sign = offsetMinutes < 0 ? '-' : '+';
  const absolute = Math.abs(offsetMinutes);
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
}

export function addLocalDays(localDate, amount) {
  if (!Number.isInteger(amount)) throw new TypeError('Day amount must be an integer');
  const { year, month, day } = parseDate(localDate);
  const shifted = new Date(Date.UTC(year, month - 1, day + amount));
  return dateString({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate()
  });
}

export function localDateTimeUtc(localDate, timeZone, { hour = 0, minute = 0, second = 0 } = {}) {
  assertTimeZone(timeZone);
  const { year, month, day } = parseDate(localDate);
  for (const [name, value, maximum] of [
    ['hour', hour, 23],
    ['minute', minute, 59],
    ['second', second, 59]
  ]) {
    if (!Number.isInteger(value) || value < 0 || value > maximum) {
      throw new RangeError(`Invalid local ${name}: ${value}`);
    }
  }
  const nominalUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const offsets = new Set();

  for (let hours = -48; hours <= 48; hours += 6) {
    offsets.add(offsetMinutesAt(nominalUtc + hours * 60 * 60 * 1000, timeZone));
  }

  for (const offset of offsets) {
    const candidate = nominalUtc - offset * 60 * 1000;
    const parts = localParts(candidate, timeZone);
    if (
      parts.year === year && parts.month === month && parts.day === day &&
      parts.hour === hour && parts.minute === minute && parts.second === second
    ) {
      return new Date(candidate).toISOString();
    }
  }

  throw new RangeError(`Local time ${localDate} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')} does not exist in ${timeZone}`);
}

export function localMidnightUtc(localDate, timeZone) {
  return localDateTimeUtc(localDate, timeZone);
}

export function fiveLocalDays(now, timeZone) {
  const firstDate = localDateForInstant(now, timeZone);
  return Array.from({ length: 5 }, (_, index) => {
    const date = addLocalDays(firstDate, index);
    const nextDate = addLocalDays(date, 1);
    const startUtc = localMidnightUtc(date, timeZone);
    const endUtc = localMidnightUtc(nextDate, timeZone);
    return {
      date,
      startUtc,
      endUtc,
      durationHours: (instantMilliseconds(endUtc) - instantMilliseconds(startUtc)) / (60 * 60 * 1000)
    };
  });
}

export function describeInstant(instant, timeZone) {
  const milliseconds = instantMilliseconds(instant);
  const parts = localParts(milliseconds, timeZone);
  const offsetMinutes = offsetMinutesAt(milliseconds, timeZone);
  return {
    instantUtc: new Date(milliseconds).toISOString(),
    localDate: dateString(parts),
    localTime: `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}:${String(parts.second).padStart(2, '0')}`,
    offsetMinutes,
    offset: formatOffset(offsetMinutes)
  };
}

export function placeInstantInRow(instant, rows, timeZone) {
  const milliseconds = instantMilliseconds(instant);
  const index = rows.findIndex((row) => (
    milliseconds >= instantMilliseconds(row.startUtc) &&
    milliseconds < instantMilliseconds(row.endUtc)
  ));
  if (index === -1) return null;
  return {
    rowIndex: index,
    rowDate: rows[index].date,
    ...describeInstant(milliseconds, timeZone)
  };
}

function pointOnSegment([x, y], [x1, y1], [x2, y2]) {
  const cross = (y - y1) * (x2 - x1) - (x - x1) * (y2 - y1);
  if (Math.abs(cross) > 1e-10) return false;
  return x >= Math.min(x1, x2) && x <= Math.max(x1, x2) && y >= Math.min(y1, y2) && y <= Math.max(y1, y2);
}

function pointInRing(point, ring) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const currentPoint = ring[index];
    const previousPoint = ring[previous];
    if (pointOnSegment(point, previousPoint, currentPoint)) return true;
    const crosses = (currentPoint[1] > point[1]) !== (previousPoint[1] > point[1]);
    if (crosses) {
      const intersection = ((previousPoint[0] - currentPoint[0]) * (point[1] - currentPoint[1])) /
        (previousPoint[1] - currentPoint[1]) + currentPoint[0];
      if (point[0] < intersection) inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(point, polygon) {
  if (!pointInRing(point, polygon[0])) return false;
  return polygon.slice(1).every((hole) => !pointInRing(point, hole));
}

function geometryContains(point, geometry) {
  if (geometry?.type === 'Polygon') return pointInPolygon(point, geometry.coordinates);
  if (geometry?.type === 'MultiPolygon') return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
  return false;
}

export function resolveTimeZone(latitude, longitude, dataset) {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new RangeError('Latitude is out of range');
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new RangeError('Longitude is out of range');
  if (dataset?.type !== 'FeatureCollection' || !Array.isArray(dataset.features)) {
    throw new TypeError('Time-zone dataset must be a GeoJSON FeatureCollection');
  }

  const match = dataset.features.find((feature) => geometryContains([longitude, latitude], feature.geometry));
  if (!match) throw new RangeError(`No pinned time-zone coverage for ${latitude}, ${longitude}`);
  const timeZone = match.properties?.tzid;
  assertTimeZone(timeZone);
  return timeZone;
}

export { DAY_MILLISECONDS };
