import assert from 'node:assert/strict';
import {test} from 'node:test';

import {
  addBomUtcOffsets,
  parseBomAnnualBbox,
  parseBomCoordinates,
  parseBomDatum,
} from '../src/bom-annual-pdf.mjs';

const months = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

function word(x, y, value) {
  return `<word xMin="${x}" yMin="${y}" xMax="${x + 10}" yMax="${y + 8}">${value}</word>`;
}

function bboxFixture(year, {roundedTie = false} = {}) {
  let dayOfYear = 0;
  const pages = [];
  for (let pageIndex = 0; pageIndex < 3; pageIndex += 1) {
    const words = [];
    for (let position = 0; position < 4; position += 1) {
      const monthIndex = pageIndex * 4 + position;
      const monthX = 70 + position * 135;
      words.push(word(monthX, 88, months[monthIndex]));
      const monthDays = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
      for (const [half, timeX] of [52 + position * 135, 117 + position * 135].entries()) {
        words.push(word(timeX, 101, 'Time'));
        const first = half === 0 ? 1 : 16;
        const last = half === 0 ? 15 : monthDays;
        for (let day = first; day <= last; day += 1) {
          const y = 120 + (day - first) * 15;
          words.push(word(timeX - 11, y, day));
          const ordinal = dayOfYear + day - 1;
          if (roundedTie && ordinal === 0) {
            words.push(word(timeX, y, '0900'), word(timeX + 24, y, '0.50'));
            words.push(word(timeX, y + 4, '1000'), word(timeX + 24, y + 4, '0.50'));
            words.push(word(timeX, y + 8, '1300'), word(timeX + 24, y + 8, '0.40'));
          } else {
            words.push(word(timeX, y, '1200'));
            words.push(word(timeX + 24, y, ordinal % 2 === 0 ? '0.50' : '2.00'));
          }
        }
      }
      dayOfYear += monthDays;
    }
    pages.push(`<page width="595" height="842">${words.join('')}</page>`);
  }
  return `<doc>${pages.join('')}</doc>`;
}

test('the Bureau PDF parser reconstructs every calendar day and alternating event type', () => {
  const predictions = parseBomAnnualBbox(bboxFixture(2026), 2026);
  assert.equal(predictions.length, 365);
  assert.deepEqual(predictions[0], {date: '2026-01-01', time: '12:00:00', heightM: 0.5, type: 'low'});
  assert.deepEqual(predictions.at(-1), {date: '2026-12-31', time: '12:00:00', heightM: 0.5, type: 'low'});
});

test('rounded equal neighboring heights use the next unequal pair to infer extrema', () => {
  const predictions = parseBomAnnualBbox(bboxFixture(2026, {roundedTie: true}), 2026);
  assert.deepEqual(predictions.slice(0, 4).map(({heightM, type}) => ({heightM, type})), [
    {heightM: 0.5, type: 'low'},
    {heightM: 0.5, type: 'high'},
    {heightM: 0.4, type: 'low'},
    {heightM: 2, type: 'high'},
  ]);
});

test('Bureau coordinates, datum and daylight-saving offsets are explicit', () => {
  const text = `SYDNEY (FORT DENISON)\nLAT 33° 51’ S LONG 151° 14’ E\nDatum of Predictions is Lowest Astronomical Tide\n`;
  assert.deepEqual(parseBomCoordinates(text), {latitude: -33.85, longitude: 151.23333333333332});
  assert.equal(parseBomDatum(text), 'Lowest Astronomical Tide (LAT)');
  assert.equal(
    parseBomDatum('Datum of Predictions is Lowest Astronomical Tide   Caution: Predictions are of secondary quality\n'),
    'Lowest Astronomical Tide (LAT)',
  );
  assert.equal(parseBomDatum('Datum of Predictions is Chart Datum\n'), 'Chart Datum');
  const predictions = addBomUtcOffsets([
    {date: '2026-01-01', time: '12:00:00', heightM: 1, type: 'high'},
    {date: '2026-06-01', time: '12:00:00', heightM: 1, type: 'high'},
  ], 'Australia/Sydney');
  assert.deepEqual(predictions.map(item => item.utcOffset), ['+11:00', '+10:00']);
});
