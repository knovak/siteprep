import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'*.spec.mjs',timeout:45000,workers:2,reporter:'list',
  use:{baseURL:'http://127.0.0.1:8794',headless:true,viewport:{width:1440,height:1000}},
  projects:[{name:'chromium',use:{browserName:'chromium'}}],
  webServer:{command:'node demo-test/server.mjs',cwd:new URL('..',import.meta.url).pathname,url:'http://127.0.0.1:8794/',reuseExistingServer:false}});
