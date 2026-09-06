import {D1BookmarkStore} from './d1-store.mjs';
import {renderSignInPage, renderUnauthorizedPage} from './access-page.mjs';
import {createCapturePipeline} from './capture-pipeline.mjs';
import {R2CaptureImages} from './capture-images.mjs';
import {ingestBookmarkHtml} from './ingest.mjs';
import {renderPilePage} from './pile-page.mjs';
import {acceptProposedTag, exportSelection, importExportDocument, readProposalDocument} from './round-trip.mjs';
import {compileSelection, evaluateSelection, proposeSelections, wrapUiSelection} from './selections.mjs';
import {chatGPTSignInPath, chatGPTSignOutPath, hasCompleteSiteIdentity, readSiteIdentity} from './site-identity.mjs';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const COLLECTION_HEADER = 'x-bookmark-collection-id';
const AUTHORIZED_USER_TYPES = new Set(['admin', 'user']);

function exportFilename(name) {
  const part = String(name || 'collection').normalize('NFKC').trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100) || 'collection';
  return `bookmark-sorter-${part}.json`;
}

function attachmentHeader(filename) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function json(value, status = 200) {
  return Response.json(value, {status, headers: {'cache-control': 'no-store'}});
}

function html(value, status = 200) {
  return new Response(value, {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/html; charset=utf-8',
      'referrer-policy': 'same-origin',
    },
  });
}

async function requestJson(request) {
  const type = request.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) throw new Error('Expected a JSON request');
  return request.json();
}

function withCaptureUrl(item, collectionId) {
  return {
    ...item,
    capture_url: item.capture?.image_ref && item.capture.displayable !== false
      ? `/api/capture-image?collection_id=${encodeURIComponent(collectionId)}&url_key=${encodeURIComponent(item.url_key)}`
      : null,
  };
}

async function selectedItems(store, collectionId, expression) {
  const items = await store.listAllItems(collectionId);
  return evaluateSelection(items, expression, {collectionId});
}

function authorizedUserInput(body) {
  const email = String(body.email || '').trim().toLowerCase();
  const type = String(body.type || 'user').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address');
  if (!AUTHORIZED_USER_TYPES.has(type)) throw new Error('User type must be admin or user');
  return {email, type};
}

export function createPileApp({
  storeFactory = (env, identity) => new D1BookmarkStore(env.DB, {ownerId: identity.id, ownerEmail: identity.email}),
  identityFromRequest = readSiteIdentity,
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
  personalCollectionIdFactory = () => idFactory('collection'),
} = {}) {
  return {
    async fetch(request, env = {}, context = {}) {
      const url = new URL(request.url);
      const identity = identityFromRequest(request);
      if (request.method === 'GET' && url.pathname === '/') {
        if (!hasCompleteSiteIdentity(identity)) {
          return html(renderSignInPage({signInPath: chatGPTSignInPath('/')}));
        }
        const store = storeFactory(env, identity);
        const authorizedUser = await store.authorizeIdentity(identity);
        if (!authorizedUser) {
          return html(renderUnauthorizedPage({
            email: identity.email,
            signOutPath: chatGPTSignOutPath('/'),
          }), 403);
        }
        return html(renderPilePage({isAdmin: authorizedUser.type === 'admin'}));
      }

      if (!url.pathname.startsWith('/api/')) return new Response('Not found', {status: 404});

      try {
        if (!hasCompleteSiteIdentity(identity)) return json({
          error: 'Sign in with ChatGPT to continue',
          code: 'authentication_required',
          sign_in_url: chatGPTSignInPath('/'),
        }, 401);
        const store = storeFactory(env, identity);
        const authorizedUser = await store.authorizeIdentity(identity);
        if (!authorizedUser) return json({
          error: 'You are signed in, but not yet authorized',
          code: 'authorization_required',
        }, 403);
        const isAdmin = authorizedUser.type === 'admin';
        const capture = captureFactory(env, store);
        await store.ensureUser();
        const personal = await store.ensurePersonalCollection({
          id: personalCollectionIdFactory(identity),
          name: 'My bookmarks',
          createdAt: now().toISOString(),
        });

        if (request.method === 'GET' && url.pathname === '/api/collections') {
          const [collections, templates, canEditTemplates] = await Promise.all([
            store.listCollections(),
            store.listTemplates(),
            store.canEditTemplates(),
          ]);
          return json({
            active_collection_id: request.headers.get(COLLECTION_HEADER) || personal.id,
            can_edit_templates: canEditTemplates || isAdmin,
            collections,
            templates,
          });
        }

        if (request.method === 'POST' && url.pathname === '/api/collections') {
          const body = await requestJson(request);
          const at = now().toISOString();
          let collection;
          if (body.action === 'copy-template') {
            collection = await store.copyTemplate(body.template_id, {
              id: idFactory('collection'), name: body.name, copiedAt: at, createdAt: at,
            });
          } else if (body.action === 'fresh-copy') {
            const source = await store.ownedCollection(body.collection_id);
            if (!source || source.kind !== 'demo-copy') throw new Error('Choose one of your demo copies');
            collection = await store.copyTemplate(source.template_id, {
              id: idFactory('collection'), name: body.name || `${source.name} fresh`, copiedAt: at, createdAt: at,
            });
          } else if (body.action === 'rename') {
            collection = await store.renameCollection(body.collection_id, body.name);
          } else if (body.action === 'create') {
            const name = String(body.name || '').trim();
            if (!name) throw new Error('Collection name is required');
            collection = await store.ensureCollection({
              id: idFactory('collection'), name, kind: 'private', createdAt: at,
            });
          } else if (body.action === 'delete-copy') {
            collection = await store.deleteDemoCopy(body.collection_id);
          } else if (body.action === 'erase') {
            const result = await store.eraseCollection(body.collection_id);
            return json({action: body.action, ...result});
          } else if (body.action === 'create-template') {
            if (!isAdmin) return json({error: 'Admin access required'}, 403);
            collection = await store.ensureCollection({
              id: idFactory('collection'), name: body.name || 'New demo', kind: 'demo-template', createdAt: at,
            });
          } else {
            throw new Error('Unsupported collection action');
          }
          return json({action: body.action, collection});
        }

        if (request.method === 'GET' && url.pathname === '/api/authorized-users') {
          if (!isAdmin) return json({error: 'Admin access required'}, 403);
          return json({users: await store.listAuthorizedUsers()});
        }

        if (request.method === 'POST' && url.pathname === '/api/authorized-users') {
          if (!isAdmin) return json({error: 'Admin access required'}, 403);
          const body = await requestJson(request);
          const {email, type} = authorizedUserInput(body);
          if (body.action === 'add') return json({user: await store.addAuthorizedUser(email, type)}, 201);
          if (body.action === 'remove') return json({user: await store.removeAuthorizedUser(email)});
          throw new Error('Unsupported authorized-user action');
        }

        const collectionId = url.searchParams.get('collection_id')
          || request.headers.get(COLLECTION_HEADER)
          || personal.id;

        if (request.method === 'GET' && url.pathname === '/api/items') {
          const limit = url.searchParams.get('limit') ?? 200;
          const offset = url.searchParams.get('offset') ?? 0;
          const [items, total, backlog] = await Promise.all([
            store.listItems(collectionId, {limit, offset}),
            store.countItems(collectionId),
            store.countUntriagedItems(collectionId),
          ]);
          const captureStatus = capture ? await capture.status(collectionId) : null;
          return json({
            collection_id: collectionId,
            total,
            backlog,
            captures: captureStatus,
            items: items.map(item => withCaptureUrl(item, collectionId)),
          });
        }

        if (request.method === 'GET' && url.pathname === '/api/selection') {
          const expression = url.searchParams.get('expression') || '';
          const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit')) || 200));
          const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
          const matches = await selectedItems(store, collectionId, expression);
          const [collectionTotal, collectionBacklog, captureStatus] = await Promise.all([
            store.countItems(collectionId),
            store.countUntriagedItems(collectionId),
            capture ? capture.status(collectionId) : null,
          ]);
          return json({
            collection_id: collectionId,
            expression,
            effective_expression: wrapUiSelection(collectionId, expression),
            collection_total: collectionTotal,
            collection_backlog: collectionBacklog,
            total: matches.length,
            backlog: matches.filter(item => !item.verdict).length,
            captures: captureStatus,
            items: matches.slice(offset, offset + limit).map(item => withCaptureUrl(item, collectionId)),
          });
        }

        if (request.method === 'GET' && url.pathname === '/api/selections') {
          return json({selections: await store.listSelections(collectionId)});
        }

        if (request.method === 'GET' && url.pathname === '/api/selection-history') {
          return json({selections: await store.listSelectionHistory()});
        }

        if (request.method === 'POST' && url.pathname === '/api/selection-history') {
          const body = await requestJson(request);
          const expression = String(body.expression || '').trim();
          if (!expression) throw new Error('Selection expression is required');
          compileSelection(wrapUiSelection(collectionId, expression));
          return json(await store.recordSelection(expression, now().toISOString()), 201);
        }

        if (request.method === 'POST' && url.pathname === '/api/selections') {
          const body = await requestJson(request);
          const name = String(body.name || '').trim();
          const expression = String(body.expression || '').trim();
          if (!name) throw new Error('Selection name is required');
          compileSelection(wrapUiSelection(collectionId, expression));
          const selection = await store.saveSelection(collectionId, {
            id: body.id || idFactory('selection'),
            name,
            expression,
          });
          return json(selection, 201);
        }

        if (request.method === 'GET' && url.pathname === '/api/proposals') {
          return json({proposals: proposeSelections(await store.listAllItems(collectionId), {
            expression: url.searchParams.get('expression') || '',
          })});
        }

        if (request.method === 'GET' && url.pathname === '/api/export') {
          const document = await exportSelection({
            store,
            collectionId,
            expression: url.searchParams.get('expression') || '',
            exportedAt: now().toISOString(),
          });
          const collection = await store.ownedCollection(collectionId);
          if (!collection) throw new Error(`Unknown collection: ${collectionId}`);
          return new Response(`${JSON.stringify(document, null, 2)}\n`, {
            headers: {
              'content-type': 'application/json; charset=utf-8',
              'content-disposition': attachmentHeader(exportFilename(collection.name)),
              'cache-control': 'no-store',
            },
          });
        }

        if (request.method === 'GET' && url.pathname === '/api/capture-image') {
          if (!capture) return json({error: 'Capture storage is not configured'}, 503);
          const urlKey = url.searchParams.get('url_key');
          if (!urlKey) return json({error: 'url_key is required'}, 400);
          if (!await store.collectionHasUrlKey(collectionId, urlKey)) return json({error: 'Capture not found'}, 404);
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
            ? await importExportDocument({store, collectionId, document: text, importedAt: now().toISOString()})
            : await ingestBookmarkHtml({
              store,
              collectionId,
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
            collectionId,
            document: await requestJson(request),
            importedAt: now().toISOString(),
          }), 201);
        }

        if (request.method === 'POST' && url.pathname === '/api/proposal-file') {
          return json(await readProposalDocument({
            store,
            collectionId,
            document: await requestJson(request),
          }));
        }

        if (request.method === 'POST' && url.pathname === '/api/proposal-file/accept') {
          const body = await requestJson(request);
          if (!body.session_id) throw new Error('Session id is required');
          return json(await acceptProposedTag({
            store,
            collectionId,
            document: body.document,
            tag: body.tag,
            sessionId: body.session_id,
            actionId: idFactory('action'),
            at: now().toISOString(),
          }));
        }

        if (request.method === 'POST' && url.pathname === '/api/captures/gaps') {
          if (!isAdmin) return json({error: 'Admin access required'}, 403);
          if (!capture) return json({error: 'Capture storage is not configured'}, 503);
          const body = await requestJson(request);
          return json(await capture.processGaps({limit: body.limit, collectionId}));
        }

        if (request.method === 'POST' && url.pathname === '/api/captures/pass-one') {
          if (!isAdmin) return json({error: 'Admin access required'}, 403);
          if (!capture) return json({error: 'Capture storage is not configured'}, 503);
          const retry = url.searchParams.get('retry') === '1';
          const candidates = await store[retry ? 'listRetryableCaptureItems' : 'listUncapturedItems'](collectionId, {
            limit: url.searchParams.get('limit'),
          });
          return json(await capture.captureMany(collectionId, candidates, {
            force: retry,
            markRetried: retry,
          }));
        }

        if (request.method === 'GET' && url.pathname === '/api/session') {
          if (!isAdmin) return json({error: 'Admin access required'}, 403);
          return json(await store.sittingReport(collectionId, url.searchParams.get('session_id')));
        }

        if (request.method === 'POST' && url.pathname === '/api/session') {
          const body = await requestJson(request);
          if (body.action === 'start') {
            const existing = await store.latestSession(collectionId, {openOnly: true});
            if (existing) return json(existing);
            const session = await store.startSession(collectionId, {
              id: idFactory('session'),
              startedAt: now().toISOString(),
            });
            return json(session, 201);
          }
          if (body.action === 'finish') {
            if (!isAdmin) return json({error: 'Admin access required'}, 403);
            if (!body.session_id) throw new Error('Session id is required');
            return json(await store.finishSession(collectionId, {
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
          const result = await store.applyVerdict(collectionId, {
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
          if (body.selection_id) expression = (await store.selection(collectionId, body.selection_id)).expression;
          const excluded = new Set(Array.isArray(body.exclude_item_ids) ? body.exclude_item_ids : []);
          const matches = (await selectedItems(store, collectionId, expression)).filter(item => !excluded.has(item.id));
          if (!body.visible && !body.confirmed) {
            return json({confirmation_required: true, count: matches.length}, 409);
          }
          if (!matches.length) throw new Error('The selection has no items to judge');
          return json(await store.applyVerdict(collectionId, {
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
          const mode = String(body.mode || 'apply');
          if (mode !== 'apply' && mode !== 'remove') throw new Error(`Unsupported tag mode: ${mode}`);
          const tags = Array.isArray(body.tags) ? body.tags : String(body.tags || '').split(/[\s,]+/);
          const items = Array.isArray(body.item_ids) && body.item_ids.length
            ? body.item_ids
            : (await selectedItems(store, collectionId, String(body.expression || ''))).map(item => item.id);
          const updateTags = mode === 'remove' ? store.removeTags.bind(store) : store.applyTags.bind(store);
          return json(await updateTags(collectionId, {
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
          return json(await store.undoLast(collectionId, {
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
