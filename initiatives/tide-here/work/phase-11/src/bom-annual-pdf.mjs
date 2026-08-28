import {formatOffset, localDateTimeUtc, offsetMinutesAt} from '../../phase-1/src/day-model.mjs';

const MONTHS = Object.freeze([
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
]);

function decodeXml(value) {
  return value
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

function wordsIn(page) {
  return [...page.matchAll(/<word xMin="([^"]+)" yMin="([^"]+)" xMax="([^"]+)" yMax="([^"]+)">([\s\S]*?)<\/word>/g)]
    .map(match => ({
      x: Number(match[1]),
      y: Number(match[2]),
      xMax: Number(match[3]),
      yMax: Number(match[4]),
      text: decodeXml(match[5]),
    }));
}

function isoDate(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function inferTypes(predictions) {
  if (predictions.length < 2) throw new Error('Bureau annual table has too few predictions');
  const sorted = predictions.toSorted((left, right) => (
    left.date.localeCompare(right.date) || left.time.localeCompare(right.time)
  ));
  let type = sorted[0].heightM < sorted[1].heightM ? 'low' : 'high';
  const typed = sorted.map(prediction => {
    const value = {...prediction, type};
    type = type === 'high' ? 'low' : 'high';
    return value;
  });
  for (let index = 1; index < typed.length - 1; index += 1) {
    const {heightM, type: eventType} = typed[index];
    const previous = typed[index - 1].heightM;
    const next = typed[index + 1].heightM;
    if ((eventType === 'high' && (heightM < previous || heightM < next))
        || (eventType === 'low' && (heightM > previous || heightM > next))) {
      throw new Error(`Bureau annual table does not alternate cleanly near ${typed[index].date} ${typed[index].time}`);
    }
  }
  return typed;
}

export function parseBomCoordinates(text) {
  const match = text.match(/LAT\s+(\d+)[°º]\s*(\d+)[’']?\s*([NS])\s+LONG\s+(\d+)[°º]\s*(\d+)[’']?\s*([EW])/i);
  if (!match) throw new Error('Bureau annual table coordinates were not found');
  const signed = (degrees, minutes, direction) => {
    const value = Number(degrees) + Number(minutes) / 60;
    return ['S', 'W'].includes(direction.toUpperCase()) ? -value : value;
  };
  return Object.freeze({
    latitude: signed(match[1], match[2], match[3]),
    longitude: signed(match[4], match[5], match[6]),
  });
}

export function parseBomDatum(text) {
  const value = text.match(/Datum of Predictions is\s+([^\r\n]+)/i)?.[1]?.trim();
  if (!value) throw new Error('Bureau annual table datum was not found');
  return value === 'Lowest Astronomical Tide' ? 'Lowest Astronomical Tide (LAT)' : value;
}

export function parseBomAnnualBbox(bboxXml, year) {
  if (!Number.isInteger(year)) throw new TypeError('Bureau annual table year is required');
  const pages = [...bboxXml.matchAll(/<page\b[^>]*>([\s\S]*?)<\/page>/g)].map(match => match[1]);
  const predictions = [];
  const seenMonths = new Set();

  for (const page of pages) {
    const words = wordsIn(page);
    const monthTitles = words.filter(word => MONTHS.includes(word.text)).sort((left, right) => left.x - right.x);
    if (monthTitles.length === 0) continue;
    for (const [monthPosition, title] of monthTitles.entries()) {
      const monthIndex = MONTHS.indexOf(title.text);
      if (seenMonths.has(monthIndex)) throw new Error(`Bureau annual table repeats ${title.text}`);
      seenMonths.add(monthIndex);
      const leftBoundary = monthPosition === 0 ? 0 : (monthTitles[monthPosition - 1].x + title.x) / 2;
      const rightBoundary = monthPosition === monthTitles.length - 1
        ? Number.POSITIVE_INFINITY
        : (title.x + monthTitles[monthPosition + 1].x) / 2;
      const timeColumns = words.filter(word => (
        word.text === 'Time'
        && word.y > title.y + 5
        && word.y < title.y + 25
        && word.x >= leftBoundary
        && word.x < rightBoundary
      )).sort((left, right) => left.x - right.x);
      if (timeColumns.length !== 2) throw new Error(`${title.text} does not have two half-month columns`);

      for (const [half, column] of timeColumns.entries()) {
        const firstDay = half === 0 ? 1 : 16;
        const lastDay = half === 0 ? 15 : daysInMonth(year, monthIndex);
        const dayMarkers = words.filter(word => {
          const day = Number(word.text);
          return Number.isInteger(day)
            && day >= firstDay
            && day <= lastDay
            && word.x > column.x - 25
            && word.x < column.x - 2;
        }).sort((left, right) => Number(left.text) - Number(right.text));
        const expectedDays = lastDay - firstDay + 1;
        if (dayMarkers.length !== expectedDays) {
          throw new Error(`${title.text} half ${half + 1} has ${dayMarkers.length} days, expected ${expectedDays}`);
        }

        for (const [dayPosition, marker] of dayMarkers.entries()) {
          const day = Number(marker.text);
          const nextMarker = dayMarkers[dayPosition + 1];
          const startY = marker.y - 1;
          const endY = nextMarker ? nextMarker.y - 1 : Number.POSITIVE_INFINITY;
          const times = words.filter(word => (
            /^\d{4}$/.test(word.text)
            && Math.abs(word.x - column.x) < 1.5
            && word.y >= startY
            && word.y < endY
          )).sort((left, right) => left.y - right.y);
          if (times.length === 0) throw new Error(`${title.text} ${day} has no tide predictions`);
          for (const timeWord of times) {
            const heightWord = words
              .filter(word => /^-?\d+[.]\d+$/.test(word.text)
                && word.x > column.x + 18
                && word.x < column.x + 42
                && Math.abs(word.y - timeWord.y) < 0.6)
              .sort((left, right) => Math.abs(left.y - timeWord.y) - Math.abs(right.y - timeWord.y))[0];
            if (!heightWord) throw new Error(`${title.text} ${day} ${timeWord.text} has no height`);
            const hour = Number(timeWord.text.slice(0, 2));
            const minute = Number(timeWord.text.slice(2));
            if (hour > 23 || minute > 59) throw new Error(`Invalid Bureau tide time ${timeWord.text}`);
            predictions.push({
              date: isoDate(year, monthIndex, day),
              time: `${timeWord.text.slice(0, 2)}:${timeWord.text.slice(2)}:00`,
              heightM: Number(heightWord.text),
            });
          }
        }
      }
    }
  }

  if (seenMonths.size !== 12) throw new Error(`Bureau annual table has ${seenMonths.size} months, expected 12`);
  return inferTypes(predictions);
}

export function addBomUtcOffsets(predictions, timeZone) {
  return predictions.map(prediction => {
    const [hour, minute, second] = prediction.time.split(':').map(Number);
    const localUtc = localDateTimeUtc(prediction.date, timeZone, {hour, minute, second});
    return {
      ...prediction,
      utcOffset: formatOffset(offsetMinutesAt(localUtc, timeZone)),
    };
  });
}
