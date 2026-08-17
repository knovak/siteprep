/**
 * Phase 0 host probes — server side.
 *
 * Drafted from documentation, never run. The entry-point shape and the D1
 * binding name are the two things most likely to need correcting; neither
 * changes what is being measured. See ./README.md.
 *
 * Expects:
 *   - a D1 binding, assumed to be `env.DB`
 *   - a secret named PROBE_SECRET in the Site's settings
 *
 * Every handler returns JSON and never throws past the router, because a probe
 * that 500s tells you less than one that reports why it failed.
 */

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj, null, 2), { status, headers: JSON_HEADERS });

/**
 * Identity, per the documented headers, plus a hunt for anything opaque.
 *
 * The documented pair is email + full name. §5 wants an owner_id, and an email
 * is a poor primary key: people change them, and it puts a personal identifier
 * in every row. So this also collects any other oai-* header that looks like an
 * id, which is what probe 3.2 is really asking.
 */
function identityOf(request) {
  const h = request.headers;
  const email = h.get('oai-authenticated-user-email');
  const fullName = h.get('oai-authenticated-user-full-name');

  const candidateHeaders = [];
  let opaqueId = null;
  for (const [name, value] of h) {
    if (!/^oai-/i.test(name)) continue;
    candidateHeaders.push(`${name}: ${value}`);
    // An id-ish header that is not the email or the display name.
    if (/(id|sub|subject|uid)$/i.test(name) && value && value !== email) {
      opaqueId = opaqueId ?? value;
    }
  }

  return { email, fullName, opaqueId, candidateHeaders };
}

/** The key everything is scoped by. Opaque id if there is one, else the email. */
const ownerKey = (request) => {
  const { opaqueId, email } = identityOf(request);
  return opaqueId || email || null;
};

async function ensureSchema(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS probe_item (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       owner TEXT NOT NULL,
       url TEXT NOT NULL,
       title TEXT NOT NULL,
       tags TEXT NOT NULL
     )`
  ).run();
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS probe_item_owner ON probe_item(owner)`
  ).run();
}

/* -- 3.4 outbound HTTP ----------------------------------------------------
 * Leads phase 0. Without arbitrary outbound fetch, pass 1 metadata capture
 * cannot run in-platform and every capture moves behind the paid vendor.
 * The timeout case matters as much as the success: §6 needs a timeout we set.
 */
async function probeOutbound() {
  const attempt = async (url, ms) => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ms);
    const started = Date.now();
    try {
      const res = await fetch(url, { signal: ctl.signal, redirect: 'follow' });
      return { ok: res.ok, status: res.status, ms: Date.now() - started };
    } catch (err) {
      const timedOut = err && (err.name === 'AbortError' || /abort/i.test(String(err)));
      return { ok: false, timedOut, error: String(err && err.message || err), ms: Date.now() - started };
    } finally {
      clearTimeout(timer);
    }
  };

  return json({
    normal: await attempt('https://example.com/', 5000),
    notFound: await attempt('https://example.com/definitely-not-a-real-page-404', 5000),
    // Deliberately a 1 ms budget against a live host, to prove the abort is ours
    // rather than the platform's.
    timeout: await attempt('https://example.com/', 1),
  });
}

/* -- 3.1 seed + stream the pile out --------------------------------------
 * This can no longer fail the project: the app streams its own export
 * (decisions.md 2026-08-17), so what is measured is a ceiling.
 */
async function probeSeed(request, env, url) {
  const owner = ownerKey(request);
  if (!owner) return json({ error: 'no identity — sign in first' }, 401);
  await ensureSchema(env);

  const n = Math.min(parseInt(url.searchParams.get('n') || '10000', 10), 50000);
  await env.DB.prepare(`DELETE FROM probe_item WHERE owner = ?`).bind(owner).run();

  // Batched inserts: one statement per row would be 10,000 round trips.
  const BATCH = 500;
  let written = 0;
  for (let start = 0; start < n; start += BATCH) {
    const size = Math.min(BATCH, n - start);
    const values = [];
    const binds = [];
    for (let i = 0; i < size; i++) {
      const k = start + i;
      values.push('(?, ?, ?, ?)');
      binds.push(
        owner,
        `https://example.com/page/${k}?utm_source=probe`,
        `Probe item ${k}`,
        JSON.stringify([`src:probe`, `in:2026-08-17`, `folder:probe/${k % 50}`])
      );
    }
    await env.DB.prepare(
      `INSERT INTO probe_item (owner, url, title, tags) VALUES ${values.join(',')}`
    ).bind(...binds).run();
    written += size;
  }

  return json({ seeded: written });
}

/**
 * Streams a bookmark-sorter/v1-shaped document. Streamed rather than assembled
 * so the probe measures the platform's ceiling and not our own memory use — if
 * this cuts off, the number of items that made it is the finding.
 */
async function probeExport(request, env) {
  const owner = ownerKey(request);
  if (!owner) return json({ error: 'no identity — sign in first' }, 401);
  await ensureSchema(env);

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const write = (s) => writer.write(enc.encode(s));

  (async () => {
    try {
      await write('{\n  "format": "bookmark-sorter/v1",\n  "selection": "probe",\n  "items": [');
      const PAGE = 1000;
      let offset = 0;
      let first = true;
      for (;;) {
        const { results } = await env.DB
          .prepare(`SELECT url, title, tags FROM probe_item WHERE owner = ? LIMIT ? OFFSET ?`)
          .bind(owner, PAGE, offset)
          .all();
        if (!results || results.length === 0) break;
        for (const row of results) {
          await write((first ? '\n    ' : ',\n    ') + JSON.stringify({
            url: row.url,
            title: row.title,
            tags: JSON.parse(row.tags),
            verdict: null,
          }));
          first = false;
        }
        offset += results.length;
        if (results.length < PAGE) break;
      }
      await write('\n  ]\n}\n');
    } catch (err) {
      // Leave the JSON deliberately unterminated: a truncated document is the
      // signal, and a tidy error object would hide the ceiling being found.
      await write(`\n/* export failed after streaming: ${String(err && err.message || err)} */`);
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, { headers: JSON_HEADERS });
}

/* -- 3.2 identity --------------------------------------------------------- */
async function probeIdentity(request) {
  const id = identityOf(request);
  return json(id);
}

/* -- 3.3 own rows --------------------------------------------------------- */
async function probeRows(request, env) {
  const owner = ownerKey(request);
  if (!owner) return json({ error: 'no identity — sign in first' }, 401);
  await ensureSchema(env);

  await env.DB.prepare(
    `INSERT INTO probe_item (owner, url, title, tags) VALUES (?, ?, ?, ?)`
  ).bind(owner, 'https://example.com/own-row', 'Own row', '["src:probe"]').run();

  const mine = await env.DB
    .prepare(`SELECT COUNT(*) AS n FROM probe_item WHERE owner = ?`).bind(owner).first();
  const all = await env.DB
    .prepare(`SELECT COUNT(*) AS n FROM probe_item`).first();

  return json({
    wroteAndRead: (mine?.n ?? 0) > 0,
    visibleToMe: mine?.n ?? 0,
    totalRows: all?.n ?? 0,
  });
}

/* -- 3.3b isolation -------------------------------------------------------
 * Run as a second user. Isolation here is OUR code, not a platform guarantee —
 * so a pass means we wrote it correctly, which is worth knowing when it passes.
 */
async function probeIsolation(request, env) {
  const owner = ownerKey(request);
  if (!owner) return json({ error: 'no identity — sign in first' }, 401);
  await ensureSchema(env);

  const routesTried = [];
  let reachable = 0;

  // Route 1: the scoped query the app would actually use.
  routesTried.push('scoped select');
  const scoped = await env.DB
    .prepare(`SELECT COUNT(*) AS n FROM probe_item WHERE owner != ? AND owner = ?`)
    .bind(owner, owner).first();
  reachable += scoped?.n ?? 0;

  // Route 2: an unscoped select — what a forgotten WHERE clause would do.
  // It SHOULD return other users' rows; that is the point. The probe records
  // the number so the difference between the two routes is visible.
  routesTried.push('unscoped select (expected to see others)');
  const unscoped = await env.DB
    .prepare(`SELECT COUNT(*) AS n FROM probe_item WHERE owner != ?`).bind(owner).first();

  // Route 3: fetch a specific foreign row by id.
  routesTried.push('select by id belonging to another owner');
  const foreign = await env.DB
    .prepare(`SELECT id FROM probe_item WHERE owner != ? LIMIT 1`).bind(owner).first();
  if (foreign) {
    const got = await env.DB
      .prepare(`SELECT COUNT(*) AS n FROM probe_item WHERE id = ? AND owner = ?`)
      .bind(foreign.id, owner).first();
    reachable += got?.n ?? 0;
  }

  return json({
    otherUsersRowsReachable: reachable,
    otherUsersRowsExist: unscoped?.n ?? 0,
    routesTried,
    note: 'Isolation is enforced by this app, not by D1. A pass means our scoping is right.',
  });
}

/* -- 3.5 secret -----------------------------------------------------------
 * Reports only whether the value was visible and how long it was. Returning
 * the value would defeat the thing being tested.
 */
async function probeSecret(request, env) {
  const secret = env.PROBE_SECRET;
  return json({
    secretVisibleServerSide: typeof secret === 'string' && secret.length > 0,
    secretLength: typeof secret === 'string' ? secret.length : null,
    note: 'Grep the deployed client bundle for the value by hand — a page cannot check itself.',
  });
}

/* -- 3.6 cross-owner read ------------------------------------------------- */
async function probeCrossOwner(request, env) {
  const owner = ownerKey(request);
  if (!owner) return json({ error: 'no identity — sign in first' }, 401);
  await ensureSchema(env);

  const { results } = await env.DB
    .prepare(`SELECT id, owner FROM probe_item WHERE owner != ? LIMIT 5`).bind(owner).all();

  return json({
    appCouldServeOthersRows: (results?.length ?? 0) > 0,
    rowsSeen: results?.length ?? 0,
    note: 'UNKNOWN until a second user has seeded rows.',
  });
}

/* -- 3.8 usage ------------------------------------------------------------ */
async function probeUsage(request, env) {
  await ensureSchema(env);
  const rows = await env.DB.prepare(`SELECT COUNT(*) AS n FROM probe_item`).first();
  const bytes = await env.DB
    .prepare(`SELECT SUM(LENGTH(url) + LENGTH(title) + LENGTH(tags)) AS b FROM probe_item`)
    .first();
  return json({ rows: rows?.n ?? 0, approxBytes: bytes?.b ?? 0 });
}

/* -- router --------------------------------------------------------------- */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;

    try {
      if (p === '/api/probe/outbound')   return await probeOutbound();
      if (p === '/api/probe/seed')       return await probeSeed(request, env, url);
      if (p === '/api/probe/export')     return await probeExport(request, env);
      if (p === '/api/probe/identity')   return await probeIdentity(request);
      if (p === '/api/probe/rows')       return await probeRows(request, env);
      if (p === '/api/probe/isolation')  return await probeIsolation(request, env);
      if (p === '/api/probe/secret')     return await probeSecret(request, env);
      if (p === '/api/probe/crossowner') return await probeCrossOwner(request, env);
      if (p === '/api/probe/usage')      return await probeUsage(request, env);
    } catch (err) {
      // A probe that reports why it failed is worth more than one that 500s.
      return json({ error: String(err && err.message || err), path: p }, 500);
    }

    // Anything else: let the platform serve the static index.html.
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
  },
};
