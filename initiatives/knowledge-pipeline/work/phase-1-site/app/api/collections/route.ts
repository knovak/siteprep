import { getChatGPTUser } from '@/app/chatgpt-auth';
import { authorizeUser, listCollections, responseForError } from '@/lib/site-repository';

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({error: 'identity.required'}, {status: 401});
  try {
    return Response.json({collections: await listCollections(await authorizeUser(user))});
  } catch (error) { return responseForError(error); }
}
