import {defineConfig, devices} from '@playwright/test';
const browserName = process.env.WASM_BROWSER || 'chromium';
const deviceName = process.env.WASM_DEVICE;
const browserUse = deviceName ? {...devices[deviceName], browserName} : {browserName};
if (deviceName && !devices[deviceName]) throw new Error(`Unknown Playwright device: ${deviceName}`);
export default defineConfig({testDir:'.',testMatch:'*.spec.mjs',timeout:45000,workers:2,reporter:'list',
  use:{baseURL:'http://127.0.0.1:8794',headless:true,viewport:{width:1440,height:1000}},
  projects:[{name:deviceName || browserName,use:browserUse}],
  webServer:{command:'node demo-test/server.mjs',cwd:new URL('..',import.meta.url).pathname,url:'http://127.0.0.1:8794/',reuseExistingServer:false}});
