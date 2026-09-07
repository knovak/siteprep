import {defineConfig} from '@playwright/test';
export default defineConfig({testDir: '.', testMatch: '*.spec.mjs', timeout: 60000, workers: 2,
  reporter: 'list', use: {headless: true, viewport: {width: 1440, height: 1000}},
  projects: [{name: 'chromium', use: {browserName: 'chromium'}}]});
