export const defaults = Object.freeze({ size: 2000, shape: 'donut', title: 'Photo markers', background: '#000000', shapeColor: '#ff0000', center: '#b6d7a8', text: '#000000', outline: '#ffffff', local: '2026:10:21 00:00:00', offset: '+10:00', instant: '2026-10-20T14:00:00Z', zone: 'Australia/Brisbane' });
export const fixtures = Object.freeze([
  { ...defaults, id: '0001' },
  { ...defaults, id: '0002', shape: 'solid', title: '' },
  { ...defaults, id: '0003', shape: 'star', title: 'Star' },
  { ...defaults, id: '0004', title: 'Café Å Ω' },
  { ...defaults, id: '0005', local: '2026:11:01 01:30:00', offset: '-07:00', instant: '2026-11-01T08:30:00Z', zone: 'America/Los_Angeles', occurrence: 'earlier' },
  { ...defaults, id: '0006', local: '2026:11:01 01:30:00', offset: '-08:00', instant: '2026-11-01T09:30:00Z', zone: 'America/Los_Angeles', occurrence: 'later' },
  { ...defaults, id: '0007', title: 'Quarter hour', offset: '+05:45', instant: '2026-10-20T18:15:00Z', zone: 'Asia/Kathmandu' },
  { ...defaults, id: '0008', title: 'Half hour', offset: '+05:30', instant: '2026-10-20T18:30:00Z', zone: 'Asia/Kolkata' },
  { ...defaults, id: '0009', shape: 'solid', title: 'UTC', offset: '+00:00', instant: '2026-10-21T00:00:00Z', zone: 'UTC' },
  { ...defaults, id: '0010', shape: 'star', title: 'Now frozen', local: '2026:10:21 00:05:06', instant: '2026-10-20T14:05:06Z' }
].map(Object.freeze));
