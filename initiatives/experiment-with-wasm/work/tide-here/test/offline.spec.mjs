import {test, expect} from '@playwright/test';
import {mkdtemp, copyFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
const url = new URL('../dist/index.html',import.meta.url).href;
async function ready(page, target=url) { await page.goto(target); await expect(page.locator('#runtime-status')).toContainText('Ready offline',{timeout:30000}); }
async function forecast(page, coordinates='37.46, -122.44', date='2026-09-07') {
  await page.locator('#place-input').fill(coordinates); await page.locator('#start-date').fill(date);
  await page.locator('#show-selection').click(); await expect(page.locator('#result')).toBeVisible();
}

test('a copied HTML file computes worldwide forecasts with networking disabled', async ({page,context})=>{
  const directory=await mkdtemp(join(tmpdir(),'tide-alone-')); const copy=join(directory,'Tide Here.html');
  await copyFile(fileURLToPath(url),copy);
  const requests=[],errors=[];
  page.on('request',request=>{if(/^https?:/.test(request.url()))requests.push(request.url());});
  page.on('pageerror',error=>errors.push(error.message));
  await context.setOffline(true);
  try {
    await ready(page,pathToFileURL(copy).href);
    for(const coords of ['37.46,-122.44','53.27,-9.05','-15.47,145.25','-33.92,18.42','-36.85,174.76']) {
      await forecast(page,coords); await expect(page.locator('.day-card')).toHaveCount(5);
      expect(await page.locator('.event-group li').count()).toBeGreaterThan(8);
    }
    await page.locator('.astronomy-details').first().locator('summary').click();
    await expect(page.locator('.astronomy-content').first()).toContainText('Sunrise');
    expect(requests).toEqual([]);expect(errors).toEqual([]);
  } finally { await rm(directory,{recursive:true,force:true}); }
});

test('search, alternative point, future date, inland and invalid input behave honestly',async({page})=>{
  await ready(page,url+'#place=Half%20Moon%20Bay%2C%20California&date=2026-09-07');
  if(await page.locator('#place-choices').isVisible())await page.locator('#place-list button').first().click();
  await expect(page.locator('#result')).toBeVisible();await expect(page.locator('#coast-name')).toContainText('Half Moon Bay');
  const previous=await page.locator('#selected-point').textContent();
  await page.locator('#chooser summary').click();await page.locator('#candidate-list button:not(:disabled)').first().click();
  await expect(page.locator('#result')).toBeVisible();expect(await page.locator('#selected-point').textContent()).not.toBe(previous);
  await forecast(page,'53.27,-9.05','2036-09-07');await expect(page.locator('.day-card').first()).toHaveAttribute('data-date','2036-09-07');
  expect(await page.locator('.day-card').first().textContent()).not.toContain('Today');
  await page.locator('#place-input').fill('Denver, Colorado');await page.locator('#show-selection').click();
  if(await page.locator('#place-choices').isVisible())await page.locator('#place-list button').first().click();
  await expect(page.locator('#state-title')).toHaveText('No coastal coverage here');await expect(page.locator('#result')).toBeHidden();
  await page.locator('#place-input').fill('91,0');await page.locator('#show-selection').click();await expect(page.locator('#state-message')).toContainText('Latitude');
});

test('history reloads, exports and restores; cleared browser storage leaves model intact',async({page})=>{
  await ready(page);await forecast(page);
  await page.reload();await expect(page.locator('#runtime-status')).toContainText('Ready offline');await expect(page.locator('#history-summary')).toContainText('(1)');
  await page.locator('#history-summary').click();const download=page.waitForEvent('download');await page.locator('#download-history').click();
  const file=await (await download).path();
  await page.evaluate(()=>localStorage.clear());await page.reload();await expect(page.locator('#runtime-status')).toContainText('Ready offline');await expect(page.locator('#history-summary')).toContainText('(0)');
  await page.locator('#history-summary').click();await page.locator('#import-history').setInputFiles(file);await expect(page.locator('#history-summary')).toContainText('(1)');
  await forecast(page,'53.27,-9.05');
});

test('storage failure and denied geolocation leave manual forecasts usable on a phone',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>{
    Storage.prototype.setItem=()=>{throw new DOMException('Full','QuotaExceededError');};
    navigator.geolocation.getCurrentPosition=(_ok,fail)=>fail({code:1});
  });
  await ready(page);await page.locator('#show-here').click();await expect(page.locator('#state-title')).toHaveText('Location unavailable');
  await forecast(page);await page.locator('#history-summary').click();await expect(page.locator('#history-status')).toContainText('only in this window');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('the application reports engine failure instead of falling back to host JavaScript',async({page})=>{
  await page.addInitScript(()=>{window.Worker=class {constructor(){setTimeout(()=>this.onerror?.(new Error('disabled')),0);}postMessage(){}};});
  await page.goto(url);await expect(page.locator('#runtime-status')).toContainText('Unable to open');await expect(page.locator('#show-selection')).toBeDisabled();
});
