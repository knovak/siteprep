import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import {
  authorizeUser,
  listCollections,
  currentSelection,
  createCollection,
  selectCollection,
} from '@/lib/site-repository';
import { workflowStore } from '@/lib/workflow-store.mjs';
import { MAX_UPLOAD_BYTES } from '@/lib/workflow.mjs';

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : 'Request failed.';
  const status =
    error instanceof Error &&
    'status' in error &&
    typeof error.status === 'number'
      ? error.status
      : 400;
  return Response.json(
    { error: message },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function GET(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user)
      return Response.json({ error: 'Sign in is required.' }, { status: 401 });
    const context = await authorizeUser(user);
    const store = workflowStore(env.DB, env.FILES, {
      id: context.actorId,
      kind: 'human',
      role: context.role,
    });
    const url = new URL(request.url);
    if (url.searchParams.has('export')) {
      const { bytes } = await store.readExport(url.searchParams.get('export'));
      return new Response(bytes, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'Content-Disposition':
            'attachment; filename="knowledge-pipeline.json"',
        },
      });
    }
    const selection = await currentSelection(context);
    return Response.json(
      {
        collections: await listCollections(context),
        selectedId: selection.collection?.id ?? null,
        workspace: selection.collection
          ? await store.load(selection.collection.id)
          : null,
        role: context.role,
        displayName: user.displayName,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin)
      return Response.json(
        { error: 'A same-origin request is required.' },
        { status: 403 },
      );
    const user = await getChatGPTUser();
    if (!user)
      return Response.json({ error: 'Sign in is required.' }, { status: 401 });
    const context = await authorizeUser(user);
    if (Number(request.headers.get('content-length') ?? 0) > MAX_UPLOAD_BYTES)
      throw new Error('Upload is too large.');
    const reader = request.body?.getReader();
    if (!reader) throw new Error('Request body is required.');
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_UPLOAD_BYTES) {
        await reader.cancel();
        throw new Error('Upload is too large.');
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const input = JSON.parse(new TextDecoder().decode(bytes));
    const store = workflowStore(env.DB, env.FILES, {
      id: context.actorId,
      kind: 'human',
      role: context.role,
    });
    let result;
    if (input.type === 'create-collection')
      result = await createCollection(context, input.name);
    else if (input.type === 'select-collection')
      result = await selectCollection(context, input.collectionId);
    else if (input.type === 'export')
      result = await store.exportCollection(
        input.collectionId,
        input.caller === 'admin' ? 'admin' : 'web',
        input.operationId,
      );
    else if (input.type === 'restore-preview')
      result = await store.previewRestore(
        input.collectionId,
        input.package,
        input,
      );
    else if (input.type === 'restore-commit')
      result = await store.commitRestore(input.collectionId, input.previewId);
    else result = await store.mutate(input.collectionId, input);
    return Response.json(
      { result },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return failure(error);
  }
}
