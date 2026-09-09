import {defineConfig, devices} from '@playwright/test';
const browserName = process.env.WASM_BROWSER || 'chromium';
const deviceName = process.env.WASM_DEVICE;
const browserUse = deviceName ? {...devices[deviceName], browserName} : {browserName};
if (deviceName && !devices[deviceName]) throw new Error(`Unknown Playwright device: ${deviceName}`);
export default defineConfig({testDir: '.', testMatch: '*.spec.mjs', timeout: 60000, workers: 2,
  reporter: 'list', use: {headless: true, viewport: {width: 1440, height: 1000}},
  projects: [{name: deviceName || browserName, use: browserUse}]});
