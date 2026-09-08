import {test,expect} from '@playwright/test';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const work = fileURLToPath(new URL('..',import.meta.url));
const root = resolve(process.env.WASM_DEMO_ROOT || fileURLToPath(new URL('../../../../demos/experiment-with-wasm/',import.meta.url)));
const hash = bytes=>createHash('sha256').update(bytes).digest('hex');
async function files(path) {
  const list=[];
  for(const entry of await readdir(path,{withFileTypes:true})) {
    const name=join(path,entry.name);
    if(entry.isDirectory())list.push(...await files(name));else list.push(name);
  }
  return list;
}

test('the demo is a complete release snapshot with the full wish and intact standalone downloads',async({page})=>{
  const source=join(work,'site');
  const sourceFiles=(await files(source)).map(p=>relative(source,p)).sort();
  const releaseFiles=(await files(root)).map(p=>relative(root,p)).filter(p=>p!=='demo.json').sort();
  expect(releaseFiles).toEqual(sourceFiles);
  for(const name of sourceFiles)expect(hash(await readFile(join(root,name))),name).toBe(hash(await readFile(join(source,name))));
  expect(await readFile(join(root,'wish.txt'),'utf8')).toBe(await readFile(new URL('../../wish.md',import.meta.url),'utf8'));
  await page.goto('/');
  await expect(page.getByRole('heading',{level:1})).toContainText('Running locally with WASM');
  await page.getByRole('link',{name:'Read the complete wish and findings'}).click();
  await expect(page.locator('.wish-copy')).toContainText('with a wasm-based non-server application');
  await expect(page.locator('.prose')).toContainText('neither app has been verified on an actual iPad');
  const broken = await page.evaluate(()=>Array.from(document.querySelectorAll('a[href^="#"]')).filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.href));
  expect(broken).toEqual([]);
  for(const route of ['/','/findings.html']) {
    await page.goto(route);
    const targets=await page.locator('a[href],link[href]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')).filter(h=>!/^https?:|^#/.test(h)));
    for(const target of targets) {
      expect(target).not.toContain('initiatives/');
      expect((await page.request.get(new URL(target,'http://127.0.0.1:8794'+route).href)).status(),target).toBe(200);
    }
  }
});

test('the published Bookmark Sorter opens from the landing page and edits samples after going offline',async({page,context})=>{
  await page.goto('/');const opened=page.waitForEvent('popup');await page.getByRole('link',{name:'Open Bookmark Sorter'}).click();const app=await opened;
  await expect(app.locator('#local-state')).toContainText('SQLite / WASM');
  const requests=[];app.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});await context.setOffline(true);
  await app.locator('#admin-menu > summary').click();await app.locator('#local-sample').click();await expect(app.locator('#count')).toHaveText('18');
  await app.locator('#admin-menu > summary').click();await app.locator('button[data-verdict=keeper]').click();await expect(app.locator('#status')).toContainText('applied');
  expect(requests).toEqual([]);await context.setOffline(false);
  await app.reload();await expect(app.locator('#local-state')).toContainText('SQLite / WASM');
  await app.locator('#collection-select').selectOption({label:'WASM sample bookmarks · 18'});await expect(app.locator('#backlog')).toHaveText('17');
});

test('the published Tide Here sample uses its embedded model after going offline',async({page,context})=>{
  await context.addInitScript(() => Object.defineProperty(navigator, 'onLine', {get: () => false}));
  await page.goto('/');const opened=page.waitForEvent('popup');await page.getByRole('link',{name:"see Half Moon Bay's next five days"}).click();const app=await opened;
  await expect(app.locator('#result')).toBeVisible();await expect(app.locator('.day-card')).toHaveCount(5);
  const requests=[];app.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});await context.setOffline(true);
  await app.locator('#place-input').fill('53.27,-9.05');await app.locator('#show-selection').click();
  await expect(app.locator('#result')).toBeVisible();await expect(app.locator('#zone-name')).toContainText('Europe/Dublin');
  expect(await app.locator('.event-group li').count()).toBeGreaterThan(8);
  expect(requests).toEqual([]);await context.setOffline(false);
  await app.reload();await expect(app.locator('#runtime-status')).toContainText('Ready ·');await expect(app.locator('#history-summary')).toContainText(/\([1-9]/);
});

test('landing page and findings remain readable on a phone with contained tables',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  for(const route of ['/','/findings.html']) {
    await page.goto(route);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.locator('.contents a[href="#ipad-and-safari-findings"]').click();await expect(page.locator('#ipad-and-safari-findings')).toBeInViewport();
});
