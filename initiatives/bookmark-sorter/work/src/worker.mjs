import {D1BookmarkStore} from './d1-store.mjs';
import {ingestBookmarkHtml} from './ingest.mjs';
import {renderPilePage} from './pile-page.mjs';

const COLLECTION_ID = 'pile';
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

function json(value, status = 200) {
  return Response.json(value, {status, headers: {'cache-control': 'no-store'}});
}

async function requestJson(request) {
  const type = request.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) throw new Error('Expected a JSON request');
  return request.json();
}

export function createPileApp({
  storeFactory = env => new D1BookmarkStore(env.DB),
  now = () => new Date(),
  idFactory = prefix => `${prefix}-${crypto.randomUUID()}`,
} = {}) {
  return {
    async fetch(request, env = {}) {
      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname === '/') {
        return new Response(renderPilePage(), {headers: {'content-type': 'text/html; charset=utf-8'}});
      }

      if (!url.pathname.startsWith('/api/')) return new Response('Not found', {status: 404});

      try {
        const store = storeFactory(env);
        await store.ensureCollection({id: COLLECTION_ID, name: 'Pile', kind: 'personal', createdAt: now().toISOString()});

        if (request.method === 'GET' && url.pathname === '/api/items') {
          const limit = url.searchParams.get('limit') ?? 200;
          const offset = url.searchParams.get('offset') ?? 0;
          const [items, total, backlog] = await Promise.all([
            store.listItems(COLLECTION_ID, {limit, offset}),
            store.countItems(COLLECTION_ID),
            store.countUntriagedItems(COLLECTION_ID),
          ]);
          return json({collection_id: COLLECTION_ID, total, backlog, items});
        }

        if (request.method === 'POST' && url.pathname === '/api/import') {
          const form = await request.formData();
          const file = form.get('file');
          const source = String(form.get('source') || 'browser-export');
          if (!file || typeof file.text !== 'function') return json({error: 'Choose a bookmark HTML file'}, 400);
          if (file.size > MAX_UPLOAD_BYTES) return json({error: 'Bookmark export exceeds the 20 MB upload limit'}, 413);
          const result = await ingestBookmarkHtml({
            store,
            collectionId: COLLECTION_ID,
            html: await file.text(),
            source,
            ingestedAt: now().toISOString(),
          });
          return json(result, 201);
        }

        if (request.method === 'POST' && url.pathname === '/api/session') {
          const body = await requestJson(request);
          if (body.action === 'start') {
            const session = await store.startSession(COLLECTION_ID, {
              id: idFactory('session'),
              startedAt: now().toISOString(),
            });
            return json(session, 201);
          }
          if (body.action === 'finish') {
            if (!body.session_id) throw new Error('Session id is required');
            return json(await store.finishSession(COLLECTION_ID, {
              sessionId: body.session_id,
              endedAt: now().toISOString(),
            }));
          }
          throw new Error('Unsupported session action');
        }

        if (request.method === 'POST' && url.pathname === '/api/verdict') {
          const body = await requestJson(request);
          if (!Array.isArray(body.item_ids) || body.item_ids.length === 0) throw new Error('Choose at least one item');
          if (!body.session_id) throw new Error('Session id is required');
          const result = await store.applyVerdict(COLLECTION_ID, {
            itemIds: body.item_ids,
            verdict: body.verdict,
            at: now().toISOString(),
            sessionId: body.session_id,
            actionId: idFactory('action'),
          });
          return json(result);
        }

        if (request.method === 'POST' && url.pathname === '/api/undo') {
          const body = await requestJson(request);
          if (!body.session_id) throw new Error('Session id is required');
          return json(await store.undoLast(COLLECTION_ID, {
            sessionId: body.session_id,
            at: now().toISOString(),
          }));
        }

        return json({error: 'Not found'}, 404);
      } catch (error) {
        return json({error: error.message}, 400);
      }
    },
  };
}

export default createPileApp();
