import type { AccessStore } from './access.ts';
export async function seed(store: AccessStore) {
  if (await store.q('SELECT id FROM flings LIMIT 1').first()) return;
  const q = store.q.bind(store),
    stmts = [];
  for (const [id, title] of [
    ['outing', 'A movie, then dinner'],
    ['wedding', 'Maya & Theo’s wedding'],
    ['concerts', 'Concerts through autumn'],
  ])
    stmts.push(
      q('INSERT OR IGNORE INTO flings(id,title) VALUES(?,?)', id, title),
    );
  for (const [id, name] of [
    ['a', 'Casey'],
    ['b', 'Rowan'],
    ['c', 'Sam'],
  ])
    stmts.push(
      q(
        'INSERT OR IGNORE INTO organizers(id,subject,name) VALUES(?,?,?)',
        id,
        'fictional:' + id,
        name,
      ),
    );
  for (const [fling, org] of [
    ['outing', 'a'],
    ['wedding', 'a'],
    ['wedding', 'b'],
    ['concerts', 'c'],
  ])
    stmts.push(
      q(
        'INSERT OR IGNORE INTO assignments(fling,organizer) VALUES(?,?)',
        fling,
        org,
      ),
    );
  for (const [id, fling, name, email, phone, preference] of [
    [
      'alex-outing',
      'outing',
      'Alex Morgan',
      'alex@example.invalid',
      '+12025550123',
      'both',
    ],
    [
      'jordan-wedding',
      'wedding',
      'Jordan Lee',
      'jordan@example.invalid',
      '',
      'email',
    ],
    [
      'alex-concerts',
      'concerts',
      'Alex Morgan',
      'alex@example.invalid',
      '+12025550123',
      'both',
    ],
    [
      'casey-concerts',
      'concerts',
      'Casey',
      'casey@example.invalid',
      '',
      'email',
    ],
    ['lee-wedding', 'wedding', 'Lee Chen', '', '', 'text'],
    [
      'another-outing',
      'outing',
      'Robin Reed',
      'robin@example.invalid',
      '',
      'email',
    ],
  ])
    stmts.push(
      q(
        'INSERT OR IGNORE INTO members(id,fling,name,email,phone,preference) VALUES(?,?,?,?,?,?)',
        id,
        fling,
        name,
        email,
        phone,
        preference,
      ),
    );
  for (const [id, fling, title, summary, details, state] of [
    [
      'movie',
      'outing',
      'Movie & dinner',
      'Saturday, October 3 · city centre',
      'Meet at the fictional Cedar Cinema side entrance.',
      'published',
    ],
    [
      'welcome',
      'wedding',
      'Friday welcome',
      'Friday, October 9 · 6 pm',
      'Private rehearsal address: 12 Example Lane.',
      'published',
    ],
    [
      'ceremony',
      'wedding',
      'The ceremony',
      'Saturday, October 10 · 3 pm',
      'Private venue: 34 Fictional Terrace.',
      'published',
    ],
    [
      'brunch',
      'wedding',
      'Sunday brunch',
      'Sunday, October 11 · 10 am',
      'Private brunch address: 56 Sample Place.',
      'published',
    ],
    [
      'draft',
      'wedding',
      'Unannounced gathering',
      'DRAFT SUMMARY',
      'DRAFT SECRET',
      'draft',
    ],
    [
      'cancelled',
      'wedding',
      'Garden walk',
      'This activity was cancelled.',
      'CANCELLED SECRET',
      'cancelled',
    ],
    [
      'autumn',
      'concerts',
      'Autumn concerts',
      'October and November',
      'Meet at the fictional Green Hall box office.',
      'published',
    ],
  ])
    stmts.push(
      q(
        'INSERT OR IGNORE INTO activities(id,fling,title,summary,details,state) VALUES(?,?,?,?,?,?)',
        id,
        fling,
        title,
        summary,
        details,
        state,
      ),
    );
  for (const [id, fling, activity, title, starts, zone, summary, details] of [
    [
      'screening',
      'outing',
      'movie',
      'The movie',
      '2026-10-04T01:00:00Z',
      'America/Los_Angeles',
      'Saturday · 6 pm',
      'Use the side entrance.',
    ],
    [
      'dinner',
      'outing',
      'movie',
      'Dinner afterwards',
      '2026-10-04T03:30:00Z',
      'America/Los_Angeles',
      'Saturday · 8:30 pm',
      'Fictional table reservation under Alex.',
    ],
    [
      'vows',
      'wedding',
      'ceremony',
      'Wedding ceremony',
      '2026-10-10T22:00:00Z',
      'America/Los_Angeles',
      'Saturday · 3 pm',
      'PRIVATE CEREMONY INSTRUCTIONS',
    ],
    [
      'october',
      'concerts',
      'autumn',
      'October concert',
      '2026-10-18T02:00:00Z',
      'America/Los_Angeles',
      'October 17 · 7 pm',
      'PRIVATE OCTOBER MEETING',
    ],
    [
      'november',
      'concerts',
      'autumn',
      'November concert',
      '2026-11-15T03:00:00Z',
      'America/Los_Angeles',
      'November 14 · 7 pm',
      'PRIVATE NOVEMBER MEETING',
    ],
  ])
    stmts.push(
      q(
        'INSERT OR IGNORE INTO events(id,fling,activity,title,starts,zone,summary,details) VALUES(?,?,?,?,?,?,?,?)',
        id,
        fling,
        activity,
        title,
        starts,
        zone,
        summary,
        details,
      ),
    );
  for (const [member, activity, fling, state] of [
    ['alex-outing', 'movie', 'outing', 'accepted'],
    ['another-outing', 'movie', 'outing', 'invited'],
    ['jordan-wedding', 'welcome', 'wedding', 'accepted'],
    ['jordan-wedding', 'ceremony', 'wedding', 'invited'],
    ['jordan-wedding', 'brunch', 'wedding', 'declined'],
    ['jordan-wedding', 'draft', 'wedding', 'accepted'],
    ['jordan-wedding', 'cancelled', 'wedding', 'accepted'],
    ['lee-wedding', 'ceremony', 'wedding', 'withdrawn'],
    ['alex-concerts', 'autumn', 'concerts', 'accepted'],
    ['casey-concerts', 'autumn', 'concerts', 'invited'],
  ])
    stmts.push(
      q(
        'INSERT OR IGNORE INTO invitations(member,activity,fling,state) VALUES(?,?,?,?)',
        member,
        activity,
        fling,
        state,
      ),
    );
  await store.db.batch(stmts);
}
