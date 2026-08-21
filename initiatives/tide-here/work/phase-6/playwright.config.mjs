import { defineConfig, devices } from '@playwright/test';

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
    command: 'python3 -m http.server 4179 --bind 127.0.0.1',
    cwd: '../../../..',
    url: 'http://127.0.0.1:4179/initiatives/tide-here/work/phase-6/index.html?fixture=1',
    reuseExistingServer: false
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['iPhone 13'], browserName: 'chromium' } }
  ]
});
