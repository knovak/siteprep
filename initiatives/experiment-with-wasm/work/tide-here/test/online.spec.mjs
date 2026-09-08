import {test,expect} from '@playwright/test';
const url=new URL('../dist/index.html',import.meta.url).href;
const noaa={stations:[{id:'9414290',name:'San Francisco',lat:37.806,lng:-122.465}]};
const chs=[{id:'halifax',officialName:'Halifax',latitude:44.659,longitude:-63.583,timeSeries:[{code:'wlp-hilo'}]}];
const predictions={predictions:Array.from({length:20},(_,i)=>({t:'2026-09-'+String(8+Math.floor(i/4)).padStart(2,'0')+' '+String(3+(i%4)*6).padStart(2,'0')+':00',v:i%2?'0.2':'1.7',type:i%2?'L':'H'}))};
async function ready(page){await page.goto(url);await page.evaluate(()=>window.tideReady);await page.locator('#start-date').fill('2026-09-08');}
async function choose(page,coords='37.8,-122.46'){await page.locator('#place-input').fill(coords);await page.locator('#show-selection').click();await expect(page.locator('#result')).toBeVisible();}
async function fixtures(context){
  await context.route('https://api.tidesandcurrents.noaa.gov/**',route=>route.fulfill({json:route.request().url().includes('datagetter')?predictions:noaa}));
  await context.route('https://api-sine.dfo-mpo.gc.ca/**',route=>route.fulfill({json:route.request().url().includes('/data?')?predictions.predictions.map(p=>({eventDate:p.t.replace(' ','T')+'Z',value:Number(p.v)})):chs}));
}

test('online address search and NOAA forecast show station, datum and cached fallback',async({page,context})=>{
  await fixtures(context);
  await context.route('https://photon.komoot.io/**',route=>route.fulfill({json:{features:[{properties:{osm_type:'N',osm_id:1,name:'Test pier',city:'San Francisco'},geometry:{coordinates:[-122.46,37.8]}}]}}));
  await ready(page);await page.locator('#place-input').fill('Test pier address');await page.locator('#search-online').click();await expect(page.locator('#place-choices')).toBeVisible();await page.locator('#place-list button').click();await expect(page.locator('#result')).toBeVisible();
  await page.locator('#find-stations').click();await page.locator('#official-stations button').first().click();await expect(page.locator('.model-badge')).toContainText('NOAA');await expect(page.locator('#forecast-note')).toContainText('MLLW');await expect(page.locator('#source-link')).toHaveAttribute('href',/station=9414290/);await expect(page.locator('.day-card')).toHaveCount(5);
  await context.route('https://api.tidesandcurrents.noaa.gov/**',route=>route.abort());await page.locator('#refresh-official').click();await expect(page.locator('#forecast-note')).toContainText('LIVE SERVICE UNAVAILABLE');await expect(page.locator('#online-status')).toContainText('Saved predictions');
  await page.locator('#chooser > summary').click();await page.locator('#candidate-list button').first().click();await expect(page.locator('.model-badge')).toContainText('FES2022');await expect(page.locator('#source-link')).toBeHidden();
});

test('CHS predictions have chart datum and an unavailable service leaves the local forecast',async({page,context})=>{
  await fixtures(context);await ready(page);await choose(page,'44.659,-63.583');await page.locator('#find-stations').click();await page.locator('#official-stations button').first().click();await expect(page.locator('.model-badge')).toContainText('Canadian');await expect(page.locator('#forecast-note')).toContainText('Canadian chart datum');
  await context.route('https://photon.komoot.io/**',route=>route.abort());await page.locator('#place-input').fill('missing address');await page.locator('#search-online').click();await expect(page.locator('#online-status')).toContainText('CORS');await expect(page.locator('#result')).toBeVisible();
  await choose(page);await expect(page.locator('.model-badge')).toContainText('FES2022');
});

test('cancelled station requests cannot overwrite a newer location and phone controls fit',async({page,context})=>{
  await page.setViewportSize({width:390,height:844});await ready(page);await choose(page);
  await context.route('https://api.tidesandcurrents.noaa.gov/**',async route=>{await new Promise(r=>setTimeout(r,400));return route.fulfill({json:noaa});});
  await context.route('https://api-sine.dfo-mpo.gc.ca/**',route=>route.abort());
  await page.locator('#find-stations').click();await page.locator('#cancel-online').click();await choose(page,'53.27,-9.05');await expect(page.locator('#zone-name')).toContainText('Europe/Dublin');await expect(page.locator('#official-stations button')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
