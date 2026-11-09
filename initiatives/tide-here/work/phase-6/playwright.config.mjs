import { defineConfig, devices } from '@playwright/test';

// Chromium can request more modules at once than Python's default five queued
// connections. Keep source-module tests independent of that local server limit.
const serverCode = [
  'from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer',
  'ThreadingHTTPServer.request_queue_size = 128',
  'ThreadingHTTPServer(("127.0.0.1", 4179), SimpleHTTPRequestHandler).serve_forever()'
].join('; ');

export default defineConfig({
  testDir: './test',
  testMatch: 'page.spec.mjs',
  fullyParallel: false,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4179',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: `python3 -c '${serverCode}'`,
    cwd: '../../../..',
    url: 'http://127.0.0.1:4179/initiatives/tide-here/work/phase-6/index.html?fixture=1',
    reuseExistingServer: false
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['iPhone 15 Pro Max'], browserName: 'chromium' } }
  ]
});
