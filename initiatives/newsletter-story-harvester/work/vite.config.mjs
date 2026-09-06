import {defineConfig} from 'vite';
import {cloudflare} from '@cloudflare/vite-plugin';
import {sites} from '@openai/sites-vite-plugin';

process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
export default defineConfig({
  plugins: [sites(), cloudflare({
    viteEnvironment: {name: 'server'},
    config: {
      name: 'newsletter-story-review',
      main: './worker/index.mjs',
      compatibility_date: '2026-09-01',
      d1_databases: [{binding: 'DB', database_name: 'newsletter-review-local', database_id: '00000000-0000-4000-8000-000000000000'}],
    },
  })],
});
