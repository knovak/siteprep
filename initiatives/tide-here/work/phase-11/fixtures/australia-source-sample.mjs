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

const patterns = Object.freeze({
  east: [
    {time: '01:50:00', type: 'low', heightM: 0.42, dailyHeightChange: 0.02},
    {time: '08:35:00', type: 'high', heightM: 1.68, dailyHeightChange: -0.03},
    {time: '14:55:00', type: 'low', heightM: 0.51, dailyHeightChange: 0.01},
    {time: '20:50:00', type: 'high', heightM: 1.49, dailyHeightChange: -0.02},
  ],
  south: [
    {time: '01:35:00', type: 'low', heightM: 0.48, dailyHeightChange: 0.02},
    {time: '08:10:00', type: 'high', heightM: 1.43, dailyHeightChange: -0.03},
    {time: '14:25:00', type: 'low', heightM: 0.55, dailyHeightChange: 0.02},
    {time: '20:35:00', type: 'high', heightM: 1.34, dailyHeightChange: -0.02},
  ],
  westMicro: [
    {time: '03:10:00', type: 'low', heightM: 0.43, dailyHeightChange: 0.01},
    {time: '10:05:00', type: 'high', heightM: 0.91, dailyHeightChange: -0.01},
    {time: '16:15:00', type: 'low', heightM: 0.52, dailyHeightChange: 0.01},
    {time: '22:15:00', type: 'high', heightM: 0.86, dailyHeightChange: -0.01},
  ],
  westNorth: [
    {time: '01:25:00', type: 'low', heightM: 0.72, dailyHeightChange: 0.03},
    {time: '07:45:00', type: 'high', heightM: 3.18, dailyHeightChange: -0.05},
    {time: '13:50:00', type: 'low', heightM: 0.88, dailyHeightChange: 0.03},
    {time: '20:05:00', type: 'high', heightM: 2.94, dailyHeightChange: -0.04},
  ],
  northMacro: [
    {time: '01:40:00', type: 'low', heightM: 1.12, dailyHeightChange: 0.04},
    {time: '07:45:00', type: 'high', heightM: 6.21, dailyHeightChange: -0.08},
    {time: '13:55:00', type: 'low', heightM: 1.48, dailyHeightChange: 0.05},
    {time: '19:55:00', type: 'high', heightM: 5.88, dailyHeightChange: -0.07},
  ],
  gulf: [
    {time: '01:30:00', type: 'low', heightM: 0.66, dailyHeightChange: 0.03},
    {time: '07:55:00', type: 'high', heightM: 2.72, dailyHeightChange: -0.05},
    {time: '14:05:00', type: 'low', heightM: 0.79, dailyHeightChange: 0.03},
    {time: '20:20:00', type: 'high', heightM: 2.49, dailyHeightChange: -0.04},
  ],
});

const portDefinitions = [
  ['au-brisbane-sample', 'Brisbane sample', 'QLD', -27.366, 153.167, 'Australia/Brisbane', 'east'],
  ['au-cairns-sample', 'Cairns sample', 'QLD', -16.926, 145.782, 'Australia/Brisbane', 'east'],
  ['au-townsville-sample', 'Townsville sample', 'QLD', -19.254, 146.833, 'Australia/Brisbane', 'east'],
  ['au-mackay-sample', 'Mackay (Outer Harbour) sample', 'QLD', -21.112, 149.225, 'Australia/Brisbane', 'east'],
  ['au-gladstone-sample', 'Gladstone sample', 'QLD', -23.842, 151.255, 'Australia/Brisbane', 'east'],
  ['au-coffs-harbour-sample', 'Coffs Harbour sample', 'NSW', -30.302, 153.146, 'Australia/Sydney', 'east'],
  ['au-sydney-sample', 'Sydney (Fort Denison) sample', 'NSW', -33.855, 151.225, 'Australia/Sydney', 'east'],
  ['au-melbourne-sample', 'Melbourne (Williamstown) sample', 'VIC', -37.863, 144.904, 'Australia/Melbourne', 'south'],
  ['au-hobart-sample', 'Hobart sample', 'TAS', -42.882, 147.334, 'Australia/Hobart', 'south'],
  ['au-adelaide-sample', 'Adelaide (Outer Harbor) sample', 'SA', -34.783, 138.483, 'Australia/Adelaide', 'south'],
  ['au-port-lincoln-sample', 'Port Lincoln sample', 'SA', -34.720, 135.860, 'Australia/Adelaide', 'south'],
  ['au-ceduna-sample', 'Ceduna sample', 'SA', -32.130, 133.680, 'Australia/Adelaide', 'south'],
  ['au-esperance-sample', 'Esperance sample', 'WA', -33.860, 121.900, 'Australia/Perth', 'westMicro'],
  ['au-albany-sample', 'Albany sample', 'WA', -35.030, 117.890, 'Australia/Perth', 'westMicro'],
  ['au-fremantle-sample', 'Fremantle sample', 'WA', -32.055, 115.744, 'Australia/Perth', 'westMicro'],
  ['au-geraldton-sample', 'Geraldton sample', 'WA', -28.780, 114.600, 'Australia/Perth', 'westMicro'],
  ['au-carnarvon-sample', 'Carnarvon sample', 'WA', -24.880, 113.670, 'Australia/Perth', 'westNorth'],
  ['au-dampier-sample', 'Dampier sample', 'WA', -20.660, 116.720, 'Australia/Perth', 'westNorth'],
  ['au-port-hedland-sample', 'Port Hedland sample', 'WA', -20.310, 118.580, 'Australia/Perth', 'westNorth'],
  ['au-broome-sample', 'Broome sample', 'WA', -17.970, 122.240, 'Australia/Perth', 'northMacro'],
  ['au-darwin-sample', 'Darwin sample', 'NT', -12.472, 130.846, 'Australia/Darwin', 'northMacro'],
  ['au-gove-sample', 'Gove (Nhulunbuy) sample', 'NT', -12.180, 136.780, 'Australia/Darwin', 'northMacro'],
  ['au-weipa-sample', 'Weipa sample', 'QLD', -12.680, 141.870, 'Australia/Brisbane', 'gulf'],
];

export const australiaSourceSample = Object.freeze({
  schema: 'tide-here/australia-standard-ports-source/v1',
  metadata: {
    datasetId: 'australia-standard-ports-sample',
    datasetVersion: '2026-sample-v3',
    sourceYear: 2026,
    coverageStart: '2026-01-01',
    coverageEnd: '2026-12-31',
    preparedAt: '2026-08-27T23:40:00.000Z',
    dataClass: 'test-fixture',
    sourceName: 'Synthetic Australian Standard Ports importer fixture',
    sourceUrl: null,
    attribution: 'Synthetic Tide Here test fixture; no Bureau or Australian Hydrographic Office predictions included.',
    licenceReference: 'No third-party licence applies to this synthetic fixture.',
  },
  ports: portDefinitions.map(([id, name, state, latitude, longitude, timeZone, pattern]) => ({
    id,
    name,
    state,
    latitude,
    longitude,
    timeZone,
    datum: 'Chart datum (fixture label)',
    predictions: predictions(patterns[pattern], timeZone),
  })),
});
