import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { authorizeUser, listAuthorizedUsers } from '@/lib/site-repository';
import { addAuthorizedUserAction } from '@/app/actions';
export const dynamic = 'force-dynamic';
export default async function Administration() {
  const user = await getChatGPTUser();
  if (!user) redirect('/');
  const context = await authorizeUser(user);
  if (context.role !== 'admin')
    return <main className="p-8">Administrator access is required.</main>;
  const users = await listAuthorizedUsers(context);
  return (
    <main className="mx-auto grid max-w-3xl gap-6 p-8">
      <Link href="/workspace" className="underline">
        Back to workspace
      </Link>
      <h1 className="text-3xl font-semibold">Application access</h1>
      <p>
        Signing in does not grant collection access. These are the explicitly
        authorized identities.
      </p>
      <ul>
        {users.map((row) => (
          <li key={String(row.id)}>
            {String(row.normalized_email)} — {String(row.role)}
          </li>
        ))}
      </ul>
      <form action={addAuthorizedUserAction} className="grid gap-3">
        <label>
          Email
          <input
            name="email"
            type="email"
            required
            className="ml-3 rounded border p-2"
          />
        </label>
        <label>
          Role
          <select name="role" className="ml-3 rounded border p-2">
            <option value="user">User</option>
            <option value="admin">Administrator</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded bg-primary p-3 text-primary-foreground"
        >
          Authorize this identity
        </button>
      </form>
    </main>
  );
}
