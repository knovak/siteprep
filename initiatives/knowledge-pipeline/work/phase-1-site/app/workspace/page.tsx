import { getChatGPTUser, chatGPTSignInPath } from '@/app/chatgpt-auth';
import Workspace from './workspace';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const user = await getChatGPTUser();
  if (!user)
    return (
      <main className="p-8">
        <h1 className="text-3xl">Knowledge Pipeline</h1>
        <p className="my-4">Sign in to open your private workspace.</p>
        <a
          href={chatGPTSignInPath('/workspace')}
          target="_top"
          className="underline"
        >
          Sign in with ChatGPT
        </a>
      </main>
    );
  return <Workspace />;
}
