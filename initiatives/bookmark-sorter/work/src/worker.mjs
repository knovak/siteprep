import {D1BookmarkStore} from './d1-store.mjs';
import {ingestBookmarkHtml} from './ingest.mjs';
import {renderPilePage} from './pile-page.mjs';

const COLLECTION_ID = 'pile';
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

function json(value, status = 200) {
  return Response.json(value, {status, headers: {'cache-control': 'no-store'}});
}

export function createPileApp({storeFactory = env => new D1BookmarkStore(env.DB), now = () => new Date()} = {}) {
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
          const [items, total] = await Promise.all([
            store.listItems(COLLECTION_ID, {limit, offset}),
            store.countItems(COLLECTION_ID),
          ]);
          return json({collection_id: COLLECTION_ID, total, items});
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

        return json({error: 'Not found'}, 404);
      } catch (error) {
        return json({error: error.message}, 400);
      }
    },
  };
}

export default createPileApp();
