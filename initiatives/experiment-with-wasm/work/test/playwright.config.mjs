import {defineConfig} from '@playwright/test';
export default defineConfig({testDir: '.', testMatch: '*.spec.mjs', timeout: 30000, fullyParallel: true, reporter: 'list', use: {headless: true, viewport: {width: 1440, height: 1000}}, projects: [{name: 'chromium', use: {browserName: 'chromium'}}]});
