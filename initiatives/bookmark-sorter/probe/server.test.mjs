import assert from 'node:assert/strict';
import test from 'node:test';

import worker from './server.js';

const request = (path, { owner = 'user-a', method = 'GET' } = {}) =>
  new Request(`https://probe.test${path}`, {
    method,
    headers: owner ? {
      'oai-authenticated-user-email': `${owner}@example.test`,
      'oai-authenticated-user-id': owner,
    } : {},
  });

const responseJson = async (response) => {
  const body = await response.json();
  return { response, body };
};

function statement({ first, all, run } = {}) {
  return {
    bind(...values) {
      return statement({
        first: first && (() => first(values)),
        all: all && (() => all(values)),
        run: run && (() => run(values)),
      });
    },
    first: async () => first?.() ?? null,
    all: async () => all?.() ?? { results: [] },
    run: async () => run?.() ?? { success: true },
  };
}

function fakeDb(rows = []) {
  return {
    prepare(sql) {
      if (/CREATE (TABLE|INDEX)/.test(sql)) return statement();
      if (/SELECT COUNT\(\*\).*owner !=/.test(sql)) {
        return statement({ first: ([owner]) => ({ n: rows.filter((row) => row.owner !== owner).length }) });
      }
      if (/SELECT COUNT\(\*\).*owner =/.test(sql)) {
        return statement({ first: ([owner]) => ({ n: rows.filter((row) => row.owner === owner).length }) });
      }
      if (/SELECT id FROM probe_item WHERE owner !=/.test(sql)) {
        return statement({ first: ([owner]) => rows.find((row) => row.owner !== owner) ?? null });
      }
      if (/SELECT url, title, tags/.test(sql)) {
        return statement({
          all: ([owner, limit, offset]) => ({
            results: rows.filter((row) => row.owner === owner).slice(offset, offset + limit),
          }),
        });
      }
      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
}

test('identity reports the opaque platform id and disables caching', async () => {
  const { response, body } = await responseJson(await worker.fetch(request('/api/probe/identity'), {}));
  assert.equal(body.opaqueId, 'user-a');
  assert.equal(body.email, 'user-a@example.test');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('seed is POST-only and rejects invalid row counts before touching D1', async () => {
  const wrongMethod = await responseJson(await worker.fetch(request('/api/probe/seed?n=10'), {}));
  assert.equal(wrongMethod.response.status, 405);

  const invalid = await responseJson(await worker.fetch(
    request('/api/probe/seed?n=NaN', { method: 'POST' }),
    { DB: fakeDb() },
  ));
  assert.equal(invalid.response.status, 400);
  assert.match(invalid.body.error, /integer/);
});

test('isolation requires a foreign fixture and scopes both listing and id lookup', async () => {
  const rows = [
    { id: 1, owner: 'user-a', url: 'https://a.test', title: 'A', tags: '[]' },
    { id: 2, owner: 'user-b', url: 'https://b.test', title: 'B', tags: '[]' },
  ];
  const { body } = await responseJson(await worker.fetch(
    request('/api/probe/isolation', { owner: 'user-b' }),
    { DB: fakeDb(rows) },
  ));
  assert.equal(body.otherUsersRowsExist, 1);
  assert.equal(body.otherUsersRowsReachable, 0);
  assert.equal(body.ownRowsVisible, 1);
  assert.deepEqual(body.routesTried, [
    'scoped listing',
    'unscoped select (expected to see others)',
    'select by id belonging to another owner',
  ]);
});

test('export is valid, ordered bookmark-sorter/v1 JSON scoped to the caller', async () => {
  const rows = [
    { id: 1, owner: 'user-a', url: 'https://a.test', title: 'A', tags: '["src:probe"]' },
    { id: 2, owner: 'user-b', url: 'https://private.test', title: 'Private', tags: '[]' },
  ];
  const response = await worker.fetch(request('/api/probe/export'), { DB: fakeDb(rows) });
  const body = await response.json();
  assert.equal(body.format, 'bookmark-sorter/v1');
  assert.deepEqual(body.items, [{
    url: 'https://a.test', title: 'A', tags: ['src:probe'], verdict: null,
  }]);
});

test('secret probe uses a derived proof server-side without returning the secret', async (t) => {
  const originalFetch = globalThis.fetch;
  let proof;
  globalThis.fetch = async (_url, options) => {
    proof = options.headers['x-probe-secret-proof'];
    return new Response('ok');
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const secret = 'never-return-this-value';
  const response = await worker.fetch(request('/api/probe/secret'), { PROBE_SECRET: secret });
  const text = await response.text();
  const body = JSON.parse(text);
  assert.equal(body.outboundCall.ok, true);
  assert.match(proof, /^[0-9a-f]{16}$/);
  assert.equal(text.includes(secret), false);
});
