import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  testMatch: 'vertical-slice.spec.mjs',
  fullyParallel: false,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4178',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'python3 -m http.server 4178 --bind 127.0.0.1',
    cwd: '../../../..',
    url: 'http://127.0.0.1:4178/initiatives/body-movement-visual-twin/work/phase-2/index.html',
    reuseExistingServer: false
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['iPhone 13'], browserName: 'chromium' } }
  ]
});
