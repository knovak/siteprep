import {
  Archive,
  ArrowRight,
  BookOpenCheck,
  Boxes,
  CheckCircle2,
  DatabaseBackup,
  FileJson2,
  FileUp,
  FolderPlus,
  LogOut,
  ShieldCheck,
  Tags,
  Users,
} from 'lucide-react';
import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from './chatgpt-auth';
import {
  addAuthorizedUserAction,
  createBackupAction,
  createCollectionAction,
  restoreBackupAction,
  selectCollectionAction,
  commitHarvestAction,
  previewHarvestAction,
} from './actions';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AccessError,
  adminCollectionPreview,
  authorizeUser,
  currentSelection,
  harvestCounts,
  listAuthorizedUsers,
  listBackups,
  listCollections,
  listHarvestPreviews,
  listHarvestReceipts,
  listHarvestSources,
  tagInventory,
} from '@/lib/site-repository';

export const dynamic = 'force-dynamic';

const stageNavigation = [
  {label: 'Harvest', icon: Archive, current: true},
  {label: 'Tag', icon: Tags, current: false},
  {label: 'Promote', icon: CheckCircle2, current: false},
  {label: 'Integrate', icon: BookOpenCheck, current: false},
  {label: 'Archive', icon: Boxes, current: false},
];

function PublicGate() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="paper-grid min-h-screen px-5 py-6 sm:px-10 sm:py-10">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
          <header className="flex items-center justify-between border-b border-border pb-5">
            <Brand />
            <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <ShieldCheck className="size-4 text-accent-foreground" aria-hidden="true" />
              Application access is allowlist-gated
            </div>
          </header>
          <section className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.08fr_0.92fr] lg:py-20">
            <div>
              <p className="eyebrow">From collected source to standing knowledge</p>
              <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-7xl">
                Keep the evidence.<br />Make the judgement visible.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
                A private, auditable workspace for turning source material into tagged evidence, topic narratives, and curated documents—without losing the original trail.
              </p>
              <a href={chatGPTSignInPath('/')} target="_top" className={buttonVariants({size: 'lg', className: 'mt-9 h-12 rounded-full px-6 text-base'})}>
                Sign in with ChatGPT <ArrowRight className="size-4" aria-hidden="true" />
              </a>
              <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">
                Signing in identifies you. A separate server-side allowlist decides whether you may open any collection or data route.
              </p>
            </div>
            <Card className="border-0 bg-card/94 py-2 shadow-[0_32px_80px_rgb(26_39_45/13%)] ring-1 ring-border/80 backdrop-blur">
              <CardHeader className="border-b border-border/80 px-6 py-5">
                <CardTitle className="text-lg tracking-[-0.02em]">Custody before convenience</CardTitle>
                <CardDescription>Every accepted change keeps an actor, activity, exact version, and portable receipt.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 px-6 py-4">
                {stageNavigation.slice(0, 3).map(({label, icon: Icon}, index) => (
                  <div key={label} className="grid grid-cols-[36px_1fr_auto] items-center gap-3 border-b border-border/70 py-4 last:border-0">
                    <span className="grid size-9 place-items-center rounded-full bg-secondary text-secondary-foreground"><Icon className="size-4" /></span>
                    <div><p className="font-semibold">{label}</p><p className="mt-0.5 text-sm text-muted-foreground">{index === 0 ? 'Keep source and provenance.' : index === 1 ? 'Describe meaning honestly.' : 'Make human decisions explicit.'}</p></div>
                    <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
          <footer className="flex flex-col gap-2 border-t border-border py-5 text-xs text-muted-foreground sm:flex-row sm:justify-between">
            <span>Public sign-in surface. Private knowledge routes.</span><span>No collection is created until an authorized person asks.</span>
          </footer>
        </div>
      </div>
    </main>
  );
}

function Brand() {
  return <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground"><BookOpenCheck className="size-5" /></span><div><p className="text-sm font-semibold">Knowledge Pipeline</p><p className="text-xs text-muted-foreground">Private evidence workspace</p></div></div>;
}

function NotAuthorized({email, code}: {email: string; code: string}) {
  return <main className="paper-grid min-h-screen bg-background px-5 py-10 text-foreground"><div className="mx-auto max-w-3xl"><Brand /><Card className="mt-16"><CardHeader><CardTitle>Signed in, but not authorized</CardTitle><CardDescription>{email} is not on this Site&apos;s application allowlist.</CardDescription></CardHeader><CardContent><p className="rounded-lg bg-muted p-4 font-mono text-xs text-muted-foreground">{code}</p><a href={chatGPTSignOutPath('/')} target="_top" className={buttonVariants({variant: 'outline', className: 'mt-5'})}><LogOut /> Sign out</a></CardContent></Card></div></main>;
}

export default async function Home({searchParams}: {searchParams: Promise<{notice?: string; tag?: string}>}) {
  const user = await getChatGPTUser();
  if (!user) return <PublicGate />;
  let context;
  try { context = await authorizeUser(user); } catch (error) {
    const code = error instanceof AccessError ? error.code : 'authorization.failed';
    return <NotAuthorized email={user.email} code={code} />;
  }
  const collections = await listCollections(context);
  const selection = await currentSelection(context);
  const current = selection.collection;
  const backups = current ? await listBackups(context, current.id) : [];
  const [counts, sources, inventory, previews, harvestReceipts] = current ? await Promise.all([
    harvestCounts(context, current.id),
    listHarvestSources(context, current.id),
    tagInventory(context, current.id),
    listHarvestPreviews(context, current.id),
    listHarvestReceipts(context, current.id),
  ]) : [{sources: 0, tags: 0, receipts: 0}, [], [], [], []];
  const authorizedUsers = context.role === 'admin' ? await listAuthorizedUsers(context) : [];
  const adminCollections = context.role === 'admin' ? await adminCollectionPreview(context) : [];
  const {notice, tag} = await searchParams;
  const normalizedTagFilter = String(tag ?? '').trim().toLocaleLowerCase('en-US');
  const visibleInventory = normalizedTagFilter
    ? inventory.filter((item: any) => String(item.label).toLocaleLowerCase('en-US').includes(normalizedTagFilter) || String(item.tag_key).includes(normalizedTagFilter))
    : inventory;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/90 px-5 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between"><Brand /><div className="text-right"><p className="text-sm font-medium">{user.displayName}</p><p className="text-xs text-muted-foreground">{context.role} · allowlisted</p></div></div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8">
        <aside className="space-y-6">
          <nav aria-label="Pipeline stages" className="grid grid-cols-2 gap-1 lg:grid-cols-1">
            {stageNavigation.map(({label, icon: Icon, current: isCurrent}) => <span key={label} aria-current={isCurrent ? 'page' : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${isCurrent ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}><Icon className="size-4" />{label}</span>)}
          </nav>
          <a href={chatGPTSignOutPath('/')} target="_top" className={buttonVariants({variant: 'ghost', className: 'w-full justify-start'})}><LogOut /> Sign out</a>
        </aside>
        <section className="min-w-0 space-y-6">
          {notice ? <p role="status" className="rounded-lg border border-border bg-accent/50 px-4 py-3 text-sm">{notice}</p> : null}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Harvest workspace</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">{current?.name ?? 'Choose a collection'}</h1><p className="mt-2 text-muted-foreground">Original evidence stays intact while accepted work gains provenance and receipts.</p></div><span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">Selection revision {selection.selectionRevision}</span></div>

          <Card><CardHeader><CardTitle>Collections</CardTitle><CardDescription>Names are labels; ownership and selection are enforced with stable ids.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="flex flex-wrap gap-2">{collections.length ? collections.map((collection) => <form key={collection.id} action={selectCollectionAction}><input type="hidden" name="collectionId" value={collection.id} /><button className={buttonVariants({variant: current?.id === collection.id ? 'default' : 'outline'})}>{collection.name}</button></form>) : <p className="text-sm text-muted-foreground">Your workspace is empty. Create the first collection explicitly.</p>}</div>
            <form action={createCollectionAction} className="flex gap-2"><label className="sr-only" htmlFor="collection-name">Collection name</label><input id="collection-name" name="name" required maxLength={80} placeholder="New collection" className="h-8 min-w-0 rounded-lg border border-input bg-card px-3 text-sm" /><button className={buttonVariants()}><FolderPlus /> Create</button></form>
          </CardContent></Card>

          {current ? <>
            <div className="grid gap-3 sm:grid-cols-4">{[['Sources',String(counts.sources)],['Topics','0'],['Tags',String(counts.tags)],['Harvest receipts',String(counts.receipts)]].map(([label,value]) => <Card key={label} size="sm"><CardContent><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></CardContent></Card>)}</div>

            <Card><CardHeader><CardTitle>Preview source intake</CardTitle><CardDescription>Every route validates into a collection-pinned preview. Only the separate commit writes source versions, tags, activity, and a receipt.</CardDescription></CardHeader><CardContent className="grid gap-5 xl:grid-cols-2">
              <form action={previewHarvestAction} className="space-y-3 rounded-xl border border-border p-4">
                <input type="hidden" name="collectionId" value={current.id} />
                <div className="flex items-center justify-between"><h2 className="font-semibold">Direct or browser-saved source</h2><FileUp className="size-4 text-accent-foreground" /></div>
                <label className="block text-xs font-medium">Intake route<select name="kind" className="mt-1 h-8 w-full rounded-lg border border-input bg-card px-2 text-sm"><option value="direct">Direct intake</option><option value="browser-saved">Browser-saved intake</option></select></label>
                <label className="block text-xs font-medium">Source URL<input name="url" type="url" required placeholder="https://example.org/report" className="mt-1 h-8 w-full rounded-lg border border-input bg-card px-3 text-sm" /></label>
                <label className="block text-xs font-medium">Title<input name="title" required maxLength={300} placeholder="Source title" className="mt-1 h-8 w-full rounded-lg border border-input bg-card px-3 text-sm" /></label>
                <label className="block text-xs font-medium">Optional retained text<textarea name="body" rows={3} placeholder="Leave blank for metadata-only intake" className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" /></label>
                <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-medium">Text status<select name="bodyForm" defaultValue="quoted" className="mt-1 h-8 w-full rounded-lg border border-input bg-card px-2 text-sm"><option value="quoted">Quoted source text</option><option value="summary">Contributor summary</option><option value="retained">Retained source body</option></select></label><label className="block text-xs font-medium">Contributor<input name="contributor" placeholder="Name or system" className="mt-1 h-8 w-full rounded-lg border border-input bg-card px-3 text-sm" /></label></div>
                <label className="block text-xs font-medium">Captured at<input name="capturedAt" type="datetime-local" className="mt-1 h-8 w-full rounded-lg border border-input bg-card px-3 text-sm" /></label>
                <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-medium">Rights<select name="rightsState" defaultValue="unknown" className="mt-1 h-8 w-full rounded-lg border border-input bg-card px-2 text-sm"><option value="cleared">Cleared</option><option value="metadata-only">Metadata only</option><option value="restricted">Restricted</option><option value="unknown">Unknown</option></select></label><label className="block text-xs font-medium">Capture<select name="captureState" defaultValue="metadata-only" className="mt-1 h-8 w-full rounded-lg border border-input bg-card px-2 text-sm"><option value="complete">Complete</option><option value="metadata-only">Metadata only</option><option value="missing">Missing</option><option value="restricted">Restricted</option></select></label></div>
                <label className="block text-xs font-medium">Accepted tags<input name="tags" placeholder="heat, community" className="mt-1 h-8 w-full rounded-lg border border-input bg-card px-3 text-sm" /></label>
                <button className={buttonVariants({variant:'outline'})}>Create preview</button>
              </form>
              <form action={previewHarvestAction} className="space-y-3 rounded-xl border border-border p-4">
                <input type="hidden" name="collectionId" value={current.id} />
                <div className="flex items-center justify-between"><h2 className="font-semibold">Native collection adapter</h2><FileJson2 className="size-4 text-accent-foreground" /></div>
                <label className="block text-xs font-medium">Format<select name="kind" className="mt-1 h-8 w-full rounded-lg border border-input bg-card px-2 text-sm"><option value="bookmark-sorter">Bookmark Sorter v1</option><option value="newsletter-story-harvester">Newsletter Story Harvester store v1</option></select></label>
                <label className="block text-xs font-medium">Recorded JSON<textarea name="nativePayload" required rows={10} spellCheck={false} placeholder={'{"format":"bookmark-sorter/v1","items":[…]}'} className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 font-mono text-xs" /></label>
                <p className="text-xs leading-5 text-muted-foreground">External verdicts stay attributed external judgements. Missing, restricted, and metadata-only bodies remain explicit.</p>
                <button className={buttonVariants({variant:'outline'})}>Validate native preview</button>
              </form>
            </CardContent></Card>

            {previews.length ? <Card><CardHeader><CardTitle>Ready to commit</CardTitle><CardDescription>These previews still name this collection and selection revision. Switching collections invalidates them.</CardDescription></CardHeader><CardContent className="space-y-3">{previews.map((preview: any) => <div key={preview.id} className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{preview.kind} · {preview.counts.sources} source{preview.counts.sources === 1 ? '' : 's'}</p><p className="mt-1 text-xs text-muted-foreground">{preview.counts.tags} tags · {preview.counts.withBodies} retained bodies · {preview.counts.unknownRights} unknown rights · {preview.counts.dependencyProposals} dependency proposals · {preview.counts.nativeActivities} recorded runs</p>{preview.findings.map((item: any) => <p key={`${item.code}:${item.path}`} className="mt-1 text-xs text-amber-700">{item.code}: {item.message}</p>)}</div><form action={commitHarvestAction}><input type="hidden" name="collectionId" value={current.id} /><input type="hidden" name="previewId" value={preview.id} /><button className={buttonVariants()}>Commit with receipt</button></form></div>)}</CardContent></Card> : null}

            <Card><CardHeader><CardTitle>Accepted sources</CardTitle><CardDescription>Current immutable versions in the selected collection. External judgements stay attributed and never become pipeline decisions.</CardDescription></CardHeader><CardContent>{sources.length ? <Table><TableHeader><TableRow><TableHead>Source</TableHead><TableHead>Intake</TableHead><TableHead>Custody</TableHead><TableHead>Tags</TableHead></TableRow></TableHeader><TableBody>{sources.map((source: any) => <TableRow key={source.id}><TableCell className="max-w-[360px] whitespace-normal"><p className="font-medium">{source.title}</p>{source.url ? <a href={source.url} className="mt-1 block truncate text-xs text-muted-foreground underline underline-offset-2">{source.url}</a> : <p className="mt-1 text-xs text-muted-foreground">Native record without a URL</p>}{source.externalJudgement ? <p className="mt-1 text-xs text-muted-foreground">External {source.externalJudgement.system}: {source.externalJudgement.verdict}</p> : null}</TableCell><TableCell><Badge variant="outline">{source.source_kind}</Badge></TableCell><TableCell className="space-x-1"><Badge variant={source.rights_state === 'cleared' ? 'secondary' : 'outline'}>{source.rights_state}</Badge><Badge variant="outline">{source.capture_state}</Badge><Badge variant="outline">{source.body_state}</Badge></TableCell><TableCell className="max-w-[260px] whitespace-normal">{source.tags.length ? source.tags.filter((item: any) => !item.archived_at).map((item: any) => <Badge key={`${item.label}:${item.status}`} variant={item.status === 'accepted' ? 'secondary' : 'outline'} className="mr-1 mb-1">{item.label}</Badge>) : <span className="text-xs text-muted-foreground">No tags</span>}</TableCell></TableRow>)}</TableBody></Table> : <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No accepted sources yet. Create and review a preview above.</p>}</CardContent></Card>

            <Card><CardHeader><CardTitle>Tag inventory</CardTitle><CardDescription>Measurements stay separated by accepted/proposed, vocabulary status, active/archived, type, and pipeline stage.</CardDescription></CardHeader><CardContent><form method="get" className="mb-4 flex max-w-sm gap-2"><label className="sr-only" htmlFor="tag-filter">Filter tags</label><input id="tag-filter" name="tag" defaultValue={tag} placeholder="Filter tags" className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-sm" /><button className={buttonVariants({variant:'outline'})}>Filter</button></form>{inventory.length ? visibleInventory.length ? <Table><TableHeader><TableRow><TableHead>Tag</TableHead><TableHead>Status</TableHead><TableHead>Vocabulary</TableHead><TableHead>Type</TableHead><TableHead>Stage</TableHead><TableHead>Sources</TableHead><TableHead>Active / archived</TableHead></TableRow></TableHeader><TableBody>{visibleInventory.map((item: any) => <TableRow key={`${item.tag_key}:${item.status}:${item.type}:${item.stage}`}><TableCell className="font-medium">{item.label}</TableCell><TableCell>{item.status}</TableCell><TableCell>{item.vocabulary_status}</TableCell><TableCell>{item.type}</TableCell><TableCell>{item.stage}</TableCell><TableCell>{item.sources} · {Number(item.percentage).toFixed(1)}%</TableCell><TableCell>{item.active} / {item.archived}</TableCell></TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">No tags match this filter.</p> : <p className="text-sm text-muted-foreground">The inventory will appear after the first accepted tagged source.</p>}</CardContent></Card>

            <Card><CardHeader><CardTitle>Harvest receipts</CardTitle><CardDescription>The stage shows the same durable receipts used by collection administration.</CardDescription></CardHeader><CardContent>{harvestReceipts.length ? <Table><TableHeader><TableRow><TableHead>Created</TableHead><TableHead>Intake</TableHead><TableHead>Sources</TableHead><TableHead>Result</TableHead></TableRow></TableHeader><TableBody>{harvestReceipts.map((receipt: any) => <TableRow key={receipt.id}><TableCell>{receipt.created_at}</TableCell><TableCell>{receipt.activity.kind}</TableCell><TableCell>{receipt.activity.sources}</TableCell><TableCell>{receipt.result.created} created · {receipt.result.updated} updated</TableCell></TableRow>)}</TableBody></Table> : <p className="text-sm text-muted-foreground">No accepted Harvest receipt yet.</p>}</CardContent></Card>

            <Card><CardHeader><CardTitle>Portable collection custody</CardTitle><CardDescription>Harvest import and export use the same canonical collection package boundary as administration.</CardDescription></CardHeader><CardContent className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-xl border border-border p-4"><DatabaseBackup className="size-5 text-accent-foreground" /><h2 className="mt-3 font-semibold">Current-collection backup</h2><p className="mt-1 text-sm text-muted-foreground">Creates a private R2 package containing source versions, aliases, tags, dependency proposals, activities, and receipts.</p><form action={createBackupAction} className="mt-4"><input type="hidden" name="collectionId" value={current.id} /><button className={buttonVariants({variant:'outline'})}>Create backup</button></form></div>
              <div className="rounded-xl border border-border p-4"><FileUp className="size-5 text-accent-foreground" /><h2 className="mt-3 font-semibold">Restore verified backup</h2><p className="mt-1 text-sm text-muted-foreground">Checks package scope and source hashes before an idempotent collection-scoped restore.</p>{backups.length ? <form action={restoreBackupAction} className="mt-4 flex gap-2"><input type="hidden" name="collectionId" value={current.id} /><select name="backupId" className="h-8 min-w-0 rounded-lg border border-input bg-card px-2 text-sm">{backups.map((backup: any) => <option key={backup.id} value={backup.id}>{backup.created_at}</option>)}</select><button className={buttonVariants({variant:'outline'})}>Restore</button></form> : <p className="mt-4 text-sm text-muted-foreground">No backup yet.</p>}</div>
            </CardContent></Card>
            <div className="flex justify-end"><a href={`/collections/${encodeURIComponent(current.id)}/erase`} className={buttonVariants({variant:'destructive'})}>Erase collection…</a></div>
          </> : null}

          {context.role === 'admin' ? <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-4" /> Administration</CardTitle><CardDescription>User routes never expose this cross-collection scope. This preview names every affected collection.</CardDescription></CardHeader><CardContent className="space-y-5"><form action={addAuthorizedUserAction} className="grid gap-2 sm:grid-cols-[1fr_120px_auto]"><input name="email" type="email" required placeholder="curator@example.com" className="h-8 rounded-lg border border-input bg-card px-3 text-sm" /><select name="role" className="h-8 rounded-lg border border-input bg-card px-2 text-sm"><option value="user">User</option><option value="admin">Admin</option></select><button className={buttonVariants()}>Add to allowlist</button></form><div className="grid gap-4 md:grid-cols-3"><div><h2 className="text-sm font-semibold">Authorized identities</h2><ul className="mt-2 space-y-2 text-sm text-muted-foreground">{authorizedUsers.map((record: any) => <li key={record.id}>{record.normalized_email} · {record.role}{record.site_user_id ? ' · linked' : ' · awaiting first sign-in'}</li>)}</ul></div><div><h2 className="text-sm font-semibold">Cross-collection preview</h2><ul className="mt-2 space-y-2 text-sm text-muted-foreground">{adminCollections.length ? adminCollections.map((record: any) => <li key={record.id}>{record.name} · {record.owner_email} · {record.state}</li>) : <li>No collections.</li>}</ul></div><div><h2 className="text-sm font-semibold">Selected collection receipts</h2><p className="mt-2 text-sm text-muted-foreground">{current ? `${harvestReceipts.length} recent Harvest receipt${harvestReceipts.length === 1 ? '' : 's'} shown above.` : 'Select a collection to inspect its receipts.'}</p></div></div></CardContent></Card> : null}
        </section>
      </div>
    </main>
  );
}
