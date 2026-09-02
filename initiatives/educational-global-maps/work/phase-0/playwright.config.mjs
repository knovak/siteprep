import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: './test/browser',
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:4176',
    colorScheme: 'dark',
  },
  webServer: {
    command: 'python3 -m http.server 4176 --bind 127.0.0.1 --directory .',
    url: 'http://127.0.0.1:4176/app/',
    reuseExistingServer: false,
  },
  projects: [
    {name: 'phone', use: {viewport: {width: 430, height: 932}}},
    {name: 'laptop', use: {viewport: {width: 1440, height: 900}}},
    {name: 'display-4k', use: {viewport: {width: 3840, height: 2160}}},
  ],
});
