import {
  Archive,
  ArrowRight,
  BookOpenCheck,
  Boxes,
  CheckCircle2,
  LogOut,
  ShieldCheck,
  Tags,
} from 'lucide-react';
import { redirect } from 'next/navigation';
import {
  chatGPTSignInPath,
  chatGPTSignOutPath,
  getChatGPTUser,
} from './chatgpt-auth';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AccessError, authorizeUser } from '@/lib/site-repository';
export const dynamic = 'force-dynamic';
const stageNavigation = [
  { label: 'Harvest', icon: Archive },
  { label: 'Tag', icon: Tags },
  { label: 'Promote', icon: CheckCircle2 },
  { label: 'Integrate', icon: BookOpenCheck },
  { label: 'Archive', icon: Boxes },
];
function PublicGate() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="paper-grid min-h-screen px-5 py-6 sm:px-10 sm:py-10">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
          <header className="flex items-center justify-between border-b border-border pb-5">
            <Brand />
            <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <ShieldCheck
                className="size-4 text-accent-foreground"
                aria-hidden="true"
              />
              Application access is allowlist-gated
            </div>
          </header>
          <section className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.08fr_0.92fr] lg:py-20">
            <div>
              <p className="eyebrow">
                From collected source to standing knowledge
              </p>
              <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-7xl">
                Keep the evidence.
                <br />
                Make the judgement visible.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
                A private, auditable workspace for turning source material into
                tagged evidence, topic narratives, and curated documents—without
                losing the original trail.
              </p>
              <a
                href={chatGPTSignInPath('/')}
                target="_top"
                className={buttonVariants({
                  size: 'lg',
                  className: 'mt-9 h-12 rounded-full px-6 text-base',
                })}
              >
                Sign in with ChatGPT{' '}
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
              <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">
                Signing in identifies you. A separate server-side allowlist
                decides whether you may open any collection or data route.
              </p>
            </div>
            <Card className="border-0 bg-card/94 py-2 shadow-[0_32px_80px_rgb(26_39_45/13%)] ring-1 ring-border/80 backdrop-blur">
              <CardHeader className="border-b border-border/80 px-6 py-5">
                <CardTitle className="text-lg tracking-[-0.02em]">
                  Custody before convenience
                </CardTitle>
                <CardDescription>
                  Every accepted change keeps an actor, activity, exact version,
                  and portable receipt.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 px-6 py-4">
                {stageNavigation
                  .slice(0, 3)
                  .map(({ label, icon: Icon }, index) => (
                    <div
                      key={label}
                      className="grid grid-cols-[36px_1fr_auto] items-center gap-3 border-b border-border/70 py-4 last:border-0"
                    >
                      <span className="grid size-9 place-items-center rounded-full bg-secondary text-secondary-foreground">
                        <Icon className="size-4" />
                      </span>
                      <div>
                        <p className="font-semibold">{label}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {index === 0
                            ? 'Keep source and provenance.'
                            : index === 1
                              ? 'Describe meaning honestly.'
                              : 'Make human decisions explicit.'}
                        </p>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        0{index + 1}
                      </span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </section>
          <footer className="flex flex-col gap-2 border-t border-border py-5 text-xs text-muted-foreground sm:flex-row sm:justify-between">
            <span>Public sign-in surface. Private knowledge routes.</span>
            <span>
              No collection is created until an authorized person asks.
            </span>
          </footer>
        </div>
      </div>
    </main>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
        <BookOpenCheck className="size-5" />
      </span>
      <div>
        <p className="text-sm font-semibold">Knowledge Pipeline</p>
        <p className="text-xs text-muted-foreground">
          Private evidence workspace
        </p>
      </div>
    </div>
  );
}

function NotAuthorized({ email, code }: { email: string; code: string }) {
  return (
    <main className="paper-grid min-h-screen bg-background px-5 py-10 text-foreground">
      <div className="mx-auto max-w-3xl">
        <Brand />
        <Card className="mt-16">
          <CardHeader>
            <CardTitle>Signed in, but not authorized</CardTitle>
            <CardDescription>
              {email} is not on this Site&apos;s application allowlist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="rounded-lg bg-muted p-4 font-mono text-xs text-muted-foreground">
              {code}
            </p>
            <a
              href={chatGPTSignOutPath('/')}
              target="_top"
              className={buttonVariants({
                variant: 'outline',
                className: 'mt-5',
              })}
            >
              <LogOut /> Sign out
            </a>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default async function Home() {
  const user = await getChatGPTUser();
  if (!user) return <PublicGate />;
  try {
    await authorizeUser(user);
  } catch (error) {
    return (
      <NotAuthorized
        email={user.email}
        code={
          error instanceof AccessError ? error.code : 'authorization.failed'
        }
      />
    );
  }
  redirect('/workspace');
}
