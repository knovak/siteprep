import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'description.spec.mjs',
  fullyParallel: false,
  workers: 1,
  reporter: [['line']],
  use: {
    browserName: 'chromium',
    headless: true,
  },
});
