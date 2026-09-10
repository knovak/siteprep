import { env } from 'cloudflare:workers';
import { handle, type Bindings } from '@/lib/http';
export const dynamic = 'force-dynamic';
const run = (request: Request) => handle(request, env as unknown as Bindings);
export const GET = run;
export const POST = run;
export const PUT = run;
