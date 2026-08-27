import {addLocalDays, formatOffset, localDateTimeUtc, offsetMinutesAt} from '../../phase-1/src/day-model.mjs';

const dates = Array.from({length: 365}, (_, index) => addLocalDays('2026-01-01', index));

function predictions(pattern, timeZone) {
  return dates.flatMap((date, dayIndex) => pattern.map(event => ({
    date,
    time: event.time,
    utcOffset: formatOffset(offsetMinutesAt(
      localDateTimeUtc(date, timeZone, Object.fromEntries(
        ['hour', 'minute', 'second'].map((part, index) => [part, Number(event.time.split(':')[index])]),
      )),
      timeZone,
    )),
    type: event.type,
    heightM: Number((event.heightM + Math.sin(dayIndex * 2 * Math.PI / 14.765) * event.dailyHeightChange).toFixed(2)),
  })));
}

export const australiaSourceSample = Object.freeze({
  schema: 'tide-here/australia-standard-ports-source/v1',
  metadata: {
    datasetId: 'australia-standard-ports-sample',
    datasetVersion: '2026-sample-v2',
    sourceYear: 2026,
    coverageStart: '2026-01-01',
    coverageEnd: '2026-12-31',
    preparedAt: '2026-08-27T23:15:00.000Z',
    dataClass: 'test-fixture',
    sourceName: 'Synthetic Australian Standard Ports importer fixture',
    sourceUrl: null,
    attribution: 'Synthetic Tide Here test fixture; no Bureau or Australian Hydrographic Office predictions included.',
    licenceReference: 'No third-party licence applies to this synthetic fixture.',
  },
  ports: [
    {
      id: 'au-sydney-sample',
      name: 'Sydney (Fort Denison) sample',
      state: 'NSW',
      latitude: -33.855,
      longitude: 151.225,
      timeZone: 'Australia/Sydney',
      datum: 'Chart datum (fixture label)',
      predictions: predictions([
        {time: '01:50:00', type: 'low', heightM: 0.42, dailyHeightChange: 0.02},
        {time: '08:35:00', type: 'high', heightM: 1.68, dailyHeightChange: -0.03},
        {time: '14:55:00', type: 'low', heightM: 0.51, dailyHeightChange: 0.01},
        {time: '20:50:00', type: 'high', heightM: 1.49, dailyHeightChange: -0.02},
      ], 'Australia/Sydney'),
    },
    {
      id: 'au-darwin-sample',
      name: 'Darwin sample',
      state: 'NT',
      latitude: -12.472,
      longitude: 130.846,
      timeZone: 'Australia/Darwin',
      datum: 'Chart datum (fixture label)',
      predictions: predictions([
        {time: '01:40:00', type: 'low', heightM: 1.12, dailyHeightChange: 0.04},
        {time: '07:45:00', type: 'high', heightM: 6.21, dailyHeightChange: -0.08},
        {time: '13:55:00', type: 'low', heightM: 1.48, dailyHeightChange: 0.05},
        {time: '19:55:00', type: 'high', heightM: 5.88, dailyHeightChange: -0.07},
      ], 'Australia/Darwin'),
    },
    {
      id: 'au-fremantle-sample',
      name: 'Fremantle sample',
      state: 'WA',
      latitude: -32.055,
      longitude: 115.744,
      timeZone: 'Australia/Perth',
      datum: 'Chart datum (fixture label)',
      predictions: predictions([
        {time: '03:10:00', type: 'low', heightM: 0.43, dailyHeightChange: 0.01},
        {time: '10:05:00', type: 'high', heightM: 0.91, dailyHeightChange: -0.01},
        {time: '16:15:00', type: 'low', heightM: 0.52, dailyHeightChange: 0.01},
        {time: '22:15:00', type: 'high', heightM: 0.86, dailyHeightChange: -0.01},
      ], 'Australia/Perth'),
    },
  ],
});
