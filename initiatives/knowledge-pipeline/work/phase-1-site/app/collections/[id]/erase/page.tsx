import { redirect } from 'next/navigation';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { eraseCollectionAction } from '@/app/actions';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authorizeUser, previewErase } from '@/lib/site-repository';

export const dynamic = 'force-dynamic';

export default async function EraseCollection({params}: {params: Promise<{id: string}>}) {
  const user = await getChatGPTUser();
  if (!user) redirect('/');
  const context = await authorizeUser(user);
  const preview = await previewErase(context, decodeURIComponent((await params).id));

  return <main className="paper-grid min-h-screen bg-background px-5 py-10 text-foreground"><div className="mx-auto max-w-2xl"><a href="/" className={buttonVariants({variant:'ghost'})}><ArrowLeft /> Back to workspace</a><Card className="mt-8 border-destructive/30"><CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><ShieldAlert className="size-5" /> Erase {preview.collectionName}</CardTitle><CardDescription>This two-phase request first tombstones the collection, then removes accepted content in bounded resumable work. Retained private backups stay available for recovery.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Object.entries(preview.counts).map(([label, count]) => <div key={label} className="rounded-lg bg-muted p-3"><p className="text-xl font-semibold">{count}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}</div><form action={eraseCollectionAction} className="space-y-4"><input type="hidden" name="collectionId" value={preview.collectionId} /><input type="hidden" name="collectionRevision" value={preview.token.split('.').at(-1)} /><input type="hidden" name="token" value={preview.token} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="finalExport" value="yes" defaultChecked /> Create a final private backup before tombstoning</label><div><label htmlFor="collectionName" className="text-sm font-medium">Type the collection name exactly to confirm</label><input id="collectionName" name="collectionName" required autoComplete="off" className="mt-2 h-10 w-full rounded-lg border border-input bg-card px-3" /></div><button className={buttonVariants({variant:'destructive', className:'h-10'})}>Tombstone and erase collection</button></form></CardContent></Card></div></main>;
}
