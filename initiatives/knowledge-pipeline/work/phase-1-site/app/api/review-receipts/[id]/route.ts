import { getChatGPTUser } from '@/app/chatgpt-auth';
import { authorizeUser, readReviewReceipt, responseForError } from '@/lib/site-repository';

export async function GET(request: Request, {params}: {params: Promise<{id: string}>}) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({error: 'identity.required'}, {status: 401});
  const collectionId = new URL(request.url).searchParams.get('collection');
  if (!collectionId) return Response.json({error: 'collection.required'}, {status: 400});
  try {
    const body = await readReviewReceipt(await authorizeUser(user), collectionId, decodeURIComponent((await params).id));
    return new Response(body, {headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': 'attachment; filename="knowledge-pipeline-review-receipt.json"',
      'cache-control': 'private, no-store',
    }});
  } catch (error) { return responseForError(error); }
}
