import { getChatGPTUser } from '@/app/chatgpt-auth';
import { authorizeUser, readBackupBytes, responseForError } from '@/lib/site-repository';

export async function GET(request: Request, {params}: {params: Promise<{id: string}>}) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({error: 'identity.required'}, {status: 401});
  const collectionId = new URL(request.url).searchParams.get('collection');
  if (!collectionId) return Response.json({error: 'collection.required'}, {status: 400});
  try {
    const bytes = await readBackupBytes(await authorizeUser(user), collectionId, decodeURIComponent((await params).id));
    return new Response(bytes, {
      headers: {
        'content-type': 'application/zip',
        'content-disposition': 'attachment; filename="knowledge-pipeline-backup.kp.zip"',
        'cache-control': 'private, no-store',
      },
    });
  } catch (error) { return responseForError(error); }
}
