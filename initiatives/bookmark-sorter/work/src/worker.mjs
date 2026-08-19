import {D1BookmarkStore} from './d1-store.mjs';
import {createCapturePipeline} from './capture-pipeline.mjs';
import {R2CaptureImages} from './capture-images.mjs';
import {ingestBookmarkHtml} from './ingest.mjs';
import {renderPilePage} from './pile-page.mjs';
import {acceptProposedTag, exportSelection, importExportDocument, readProposalDocument} from './round-trip.mjs';
import {compileSelection, evaluateSelection, proposeSelections, wrapUiSelection} from './selections.mjs';

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

function withCaptureUrl(item) {
  return {
    ...item,
    capture_url: item.capture?.image_ref && item.capture.displayable !== false
      ? `/api/capture-image?url_key=${encodeURIComponent(item.url_key)}`
      : null,
  };
}

async function selectedItems(store, expression) {
  const items = await store.listAllItems(COLLECTION_ID);
  return evaluateSelection(items, expression, {collectionId: COLLECTION_ID});
}

export function createPileApp({
  storeFactory = env => new D1BookmarkStore(env.DB),
  transformImage = null,
  vendorCapture = null,
  captureFactory = (env, store) => env.CAPTURES ? createCapturePipeline({
    store,
    imageStore: new R2CaptureImages(env.CAPTURES),
    transformImage,
    passTwoEnabled: env.PASS_TWO_ENABLED === 'true',
    vendorCapture,
  }) : null,
  now = () => new Date(),
  idFactory = prefix => `${prefix}-${crypto.randomUUID()}`,
} = {}) {
  return {
    async fetch(request, env = {}, context = {}) {
      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname === '/') {
        return new Response(renderPilePage(), {headers: {'content-type': 'text/html; charset=utf-8'}});
      }

      if (!url.pathname.startsWith('/api/')) return new Response('Not found', {status: 404});

      try {
        const store = storeFactory(env);
        const capture = captureFactory(env, store);
        await store.ensureCollection({id: COLLECTION_ID, name: 'Pile', kind: 'personal', createdAt: now().toISOString()});

        if (request.method === 'GET' && url.pathname === '/api/items') {
          const limit = url.searchParams.get('limit') ?? 200;
          const offset = url.searchParams.get('offset') ?? 0;
          const [items, total, backlog] = await Promise.all([
            store.listItems(COLLECTION_ID, {limit, offset}),
            store.countItems(COLLECTION_ID),
            store.countUntriagedItems(COLLECTION_ID),
          ]);
          const captureStatus = capture ? await capture.status() : null;
          return json({
            collection_id: COLLECTION_ID,
            total,
            backlog,
            captures: captureStatus,
            items: items.map(withCaptureUrl),
          });
        }

        if (request.method === 'GET' && url.pathname === '/api/selection') {
          const expression = url.searchParams.get('expression') || '';
          const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit')) || 200));
          const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
          const matches = await selectedItems(store, expression);
          const [collectionTotal, collectionBacklog, captureStatus] = await Promise.all([
            store.countItems(COLLECTION_ID),
            store.countUntriagedItems(COLLECTION_ID),
            capture ? capture.status() : null,
          ]);
          return json({
            collection_id: COLLECTION_ID,
            expression,
            effective_expression: wrapUiSelection(COLLECTION_ID, expression),
            collection_total: collectionTotal,
            collection_backlog: collectionBacklog,
            total: matches.length,
            backlog: matches.filter(item => !item.verdict).length,
            captures: captureStatus,
            items: matches.slice(offset, offset + limit).map(withCaptureUrl),
          });
        }

        if (request.method === 'GET' && url.pathname === '/api/selections') {
          return json({selections: await store.listSelections(COLLECTION_ID)});
        }

        if (request.method === 'POST' && url.pathname === '/api/selections') {
          const body = await requestJson(request);
          const name = String(body.name || '').trim();
          const expression = String(body.expression || '').trim();
          if (!name) throw new Error('Selection name is required');
          compileSelection(wrapUiSelection(COLLECTION_ID, expression));
          const selection = await store.saveSelection(COLLECTION_ID, {
            id: body.id || idFactory('selection'),
            name,
            expression,
          });
          return json(selection, 201);
        }

        if (request.method === 'GET' && url.pathname === '/api/proposals') {
          return json({proposals: proposeSelections(await store.listAllItems(COLLECTION_ID))});
        }

        if (request.method === 'GET' && url.pathname === '/api/export') {
          const document = await exportSelection({
            store,
            collectionId: COLLECTION_ID,
            expression: url.searchParams.get('expression') || '',
            exportedAt: now().toISOString(),
          });
          return new Response(`${JSON.stringify(document, null, 2)}\n`, {
            headers: {
              'content-type': 'application/json; charset=utf-8',
              'content-disposition': 'attachment; filename="bookmark-sorter-export.json"',
              'cache-control': 'no-store',
            },
          });
        }

        if (request.method === 'GET' && url.pathname === '/api/capture-image') {
          if (!capture) return json({error: 'Capture storage is not configured'}, 503);
          const urlKey = url.searchParams.get('url_key');
          if (!urlKey) return json({error: 'url_key is required'}, 400);
          const object = await capture.image(urlKey);
          if (!object) return json({error: 'Capture not found'}, 404);
          const contentType = object.httpMetadata?.contentType || 'application/octet-stream';
          return new Response(object.body, {
            headers: {
              'content-type': contentType,
              'cache-control': 'private, max-age=86400, immutable',
              'x-content-type-options': 'nosniff',
            },
          });
        }

        if (request.method === 'POST' && url.pathname === '/api/import') {
          const form = await request.formData();
          const file = form.get('file');
          const source = String(form.get('source') || 'browser-export');
          if (!file || typeof file.text !== 'function') return json({error: 'Choose a bookmark HTML file'}, 400);
          if (file.size > MAX_UPLOAD_BYTES) return json({error: 'Bookmark export exceeds the 20 MB upload limit'}, 413);
          const text = await file.text();
          const isJson = file.type === 'application/json' || String(file.name || '').toLowerCase().endsWith('.json');
          const result = isJson
            ? await importExportDocument({store, collectionId: COLLECTION_ID, document: text, importedAt: now().toISOString()})
            : await ingestBookmarkHtml({
              store,
              collectionId: COLLECTION_ID,
              html: text,
              source,
              ingestedAt: now().toISOString(),
              capture,
              scheduleCapture: task => {
                const pending = task();
                if (typeof context.waitUntil === 'function') {
                  context.waitUntil(pending);
                  return Promise.resolve();
                }
                return pending;
              },
            });
          return json(result, 201);
        }

        if (request.method === 'POST' && url.pathname === '/api/import-json') {
          return json(await importExportDocument({
            store,
            collectionId: COLLECTION_ID,
            document: await requestJson(request),
            importedAt: now().toISOString(),
          }), 201);
        }

        if (request.method === 'POST' && url.pathname === '/api/proposal-file') {
          return json(await readProposalDocument({
            store,
            collectionId: COLLECTION_ID,
            document: await requestJson(request),
          }));
        }

        if (request.method === 'POST' && url.pathname === '/api/proposal-file/accept') {
          const body = await requestJson(request);
          if (!body.session_id) throw new Error('Session id is required');
          return json(await acceptProposedTag({
            store,
            collectionId: COLLECTION_ID,
            document: body.document,
            tag: body.tag,
            sessionId: body.session_id,
            actionId: idFactory('action'),
            at: now().toISOString(),
          }));
        }

        if (request.method === 'POST' && url.pathname === '/api/captures/gaps') {
          if (!capture) return json({error: 'Capture storage is not configured'}, 503);
          const body = await requestJson(request);
          return json(await capture.processGaps({limit: body.limit}));
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

        if (request.method === 'POST' && url.pathname === '/api/selection/verdict') {
          const body = await requestJson(request);
          if (!body.session_id) throw new Error('Session id is required');
          let expression = String(body.expression || '');
          if (body.selection_id) expression = (await store.selection(COLLECTION_ID, body.selection_id)).expression;
          const excluded = new Set(Array.isArray(body.exclude_item_ids) ? body.exclude_item_ids : []);
          const matches = (await selectedItems(store, expression)).filter(item => !excluded.has(item.id));
          if (!body.visible && !body.confirmed) {
            return json({confirmation_required: true, count: matches.length}, 409);
          }
          if (!matches.length) throw new Error('The selection has no items to judge');
          return json(await store.applyVerdict(COLLECTION_ID, {
            itemIds: matches.map(item => item.id),
            verdict: body.verdict,
            at: now().toISOString(),
            sessionId: body.session_id,
            actionId: idFactory('action'),
          }));
        }

        if (request.method === 'POST' && url.pathname === '/api/tag') {
          const body = await requestJson(request);
          if (!body.session_id) throw new Error('Session id is required');
          const tags = Array.isArray(body.tags) ? body.tags : String(body.tags || '').split(/[\s,]+/);
          const items = Array.isArray(body.item_ids) && body.item_ids.length
            ? body.item_ids
            : (await selectedItems(store, String(body.expression || ''))).map(item => item.id);
          return json(await store.applyTags(COLLECTION_ID, {
            itemIds: items,
            tags,
            at: now().toISOString(),
            sessionId: body.session_id,
            actionId: idFactory('action'),
          }));
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
