import {readJudgments, writeJudgments} from './review-database.mjs';

function json(value, status = 200) {
  return Response.json(value, {status, headers: {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}});
}

export function createReviewWorker({html, seed}) {
  const ids = new Set(seed.stories.map(story => story.id));
  const verdicts = new Set(['dropped', 'kept', 'emphasised', ...(seed.vocabularies?.verdict || []),
    ...seed.stories.map(story => story.verdict).filter(Boolean)]);
  return {
    async fetch(request, env) {
      // Sites dispatch authenticates and enforces the existing owner-only access policy.
      if (!request.headers.get('oai-authenticated-user-id')?.trim()) return json({error: 'Sign in required.'}, 401);
      const url = new URL(request.url);
      if (url.pathname === '/' && request.method === 'GET') {
        return new Response(html, {headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}});
      }
      if (url.pathname !== '/api/verdicts') return json({error: 'Not found.'}, 404);
      if (!['GET', 'PATCH'].includes(request.method)) return json({error: 'Method not allowed.'}, 405);
      if (url.searchParams.get('store_id') !== seed.store_id) return json({error: 'This page belongs to an older story store. Reload it.'}, 409);
      if (!env.DB) return json({error: 'The judgment database is unavailable.'}, 503);
      try {
        let body;
        if (request.method === 'PATCH') {
          if (request.headers.get('origin') !== url.origin) return json({error: 'Same-origin request required.'}, 403);
          if (!request.headers.get('content-type')?.startsWith('application/json')) return json({error: 'JSON required.'}, 415);
          // Limit the stream as well as Content-Length; do not trust caller-supplied length.
          const reader = request.body?.getReader();
          if (!reader) return json({error: 'Invalid judgment request.'}, 400);
          const parts = []; let size = 0;
          while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > 250_000) { await reader.cancel(); return json({error: 'Request too large.'}, 413); }
            parts.push(value);
          }
          try { body = JSON.parse(await new Blob(parts).text()); }
          catch { return json({error: 'Invalid JSON.'}, 400); }
          if (!Number.isSafeInteger(body?.revision) || body.revision < 0 || !Array.isArray(body.changes) ||
              !body.changes.length || body.changes.length > ids.size ||
              new Set(body.changes.map(change => change?.id)).size !== body.changes.length ||
              body.changes.some(change => !ids.has(change?.id) || (change.verdict !== null && !verdicts.has(change.verdict)))) {
            return json({error: 'Invalid judgment request.'}, 400);
          }
        }
        const current = await readJudgments(env.DB, seed);
        if (request.method === 'GET') return json(current);
        if (body.revision !== current.revision) return json({error: 'Newer judgments were saved in another tab. Choose again.', ...current}, 409);
        const saved = await writeJudgments(env.DB, current, body.changes);
        if (!saved) return json({error: 'Newer judgments were saved in another tab. Choose again.', ...await readJudgments(env.DB, seed)}, 409);
        return json(saved);
      } catch {
        return json({error: 'Could not save or load judgments. Please try again.'}, 503);
      }
    },
  };
}
