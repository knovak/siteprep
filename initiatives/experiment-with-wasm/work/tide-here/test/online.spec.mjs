import {test,expect} from '@playwright/test';
const url=new URL('../dist/index.html',import.meta.url).href;
const noaa={stations:[{id:'9410170',name:'SAN DIEGO (Broadway)',lat:32.71556,lng:-117.17667}]};
const chs=[{id:'halifax',officialName:'Halifax',latitude:44.659,longitude:-63.583,timeSeries:[{code:'wlp-hilo'}]}];
const predictions={predictions:Array.from({length:24},(_,i)=>({t:'2026-09-'+String(8+Math.floor(i/4)).padStart(2,'0')+' '+String(3+(i%4)*6).padStart(2,'0')+':00',v:i%2?'0.2':'1.7',type:i%2?'L':'H'}))};
const feature=(name,coords=[-117.16277,32.71742],extra={})=>({properties:{osm_type:'N',osm_id:name,name,state:'California',country:'United States',...extra},geometry:{coordinates:coords}});
test.beforeEach(async ({page}) => { await page.clock.setFixedTime(new Date('2026-09-08T20:00:00Z')); });
async function ready(page,target=url){await page.goto(target);await page.evaluate(()=>window.tideReady);}
async function show(page,query='32.71742,-117.16277'){await page.locator('#place-input').fill(query);await page.locator('#show-selection').click();}
async function fixtures(context){
  await context.route('https://photon.komoot.io/**',route=>route.fulfill({json:{features:[feature('San Diego')]}}));
  await context.route('https://api.tidesandcurrents.noaa.gov/**',route=>route.fulfill({json:route.request().url().includes('datagetter')?predictions:noaa}));
  await context.route('https://api-sine.dfo-mpo.gc.ca/**',route=>route.fulfill({json:route.request().url().includes('/data?')?predictions.predictions.map(p=>({eventDate:p.t.replace(' ','T')+'Z',value:Number(p.v)})):chs}));
}

test('Show tides resolves San Diego online and automatically loads NOAA rather than the model',async({page,context})=>{
  await fixtures(context);const requests=[];page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await context.route('https://photon.komoot.io/**',route=>route.fulfill({json:{features:[feature('San Diego'),feature('San Diego',[-116.77,32.96],{type:'county'}),feature('San Diego',[-98.2389,27.7639],{state:'Texas',type:'city'}),feature('San Diego State University')]}}));
  await ready(page);await show(page,'San Diego');
  await expect(page.locator('.model-badge')).toContainText('NOAA');await expect(page.locator('#selected-point')).toContainText('SAN DIEGO (Broadway)');await expect(page.locator('#forecast-note')).toContainText('MLLW');await expect(page.locator('#source-link')).toHaveAttribute('href',/station=9410170/);await expect(page.locator('.day-card')).toHaveCount(5);
  await expect(page.locator('#start-date')).toHaveCount(0);await expect(page.getByText('First day')).toHaveCount(0);await expect(page.locator('#place-choices')).toBeHidden();await expect(page.locator('#other-place-list button')).toHaveCount(4);
  expect(requests.some(u=>u.includes('photon.komoot.io'))).toBe(true);expect(requests.some(u=>u.includes('datagetter'))).toBe(true);await expect(page.locator('#online-panel')).not.toHaveAttribute('open','');
  await context.route('https://api.tidesandcurrents.noaa.gov/**',route=>route.abort());await page.locator('#refresh-official').click();await expect(page.locator('#forecast-note')).toContainText('LIVE SERVICE UNAVAILABLE');await expect(page.locator('#online-status')).toContainText('Saved predictions');
  await page.locator('#chooser > summary').click();await page.locator('#candidate-list button').first().click();await expect(page.locator('.model-badge')).toContainText('FES2022');await expect(page.locator('#source-link')).toBeHidden();
});

test('ordinary form submission resolves a beach address absent from the bundled catalogue',async({page,context})=>{
  await fixtures(context);await context.route('https://photon.komoot.io/**',route=>route.fulfill({json:{features:[feature('Harbor Steps',[-117.176,32.715],{housenumber:'123',street:'Waterfront Walk',city:'San Diego'})]}}));
  await ready(page);await show(page,'123 Waterfront Walk, San Diego');await expect(page.locator('#coast-name')).toContainText('Harbor Steps');await expect(page.locator('.model-badge')).toContainText('NOAA');
});

test('ranked place resolves automatically but ambiguous coastal stations still request a choice',async({page,context})=>{
  await fixtures(context);await context.route('https://photon.komoot.io/**',route=>route.fulfill({json:{features:[feature('Harbor',[-117.17,32.715]),feature('Harbor',[-117.2,32.7],{state:'Another region'})]}}));
  await context.route('https://api.tidesandcurrents.noaa.gov/**',route=>route.fulfill({json:route.request().url().includes('datagetter')?predictions:{stations:[...noaa.stations,{id:'other',name:'Other side of bay',lat:32.7156,lng:-117.162} ]}}));
  await ready(page);await show(page,'Harbor');await expect(page.locator('#place-choices')).toBeHidden();await expect(page.locator('#other-place-list button')).toHaveCount(2);await expect(page.locator('#state-title')).toHaveText('Choose a tide station');await expect(page.locator('#result')).toBeHidden();await expect(page.locator('#online-panel')).toHaveAttribute('open','');
  await page.getByRole('button',{name:/SAN DIEGO \(Broadway\)/}).click();await expect(page.locator('.model-badge')).toContainText('NOAA');
});

test('failed online search and predictions use labelled local fallbacks; local-only mode sends no requests',async({page,context})=>{
  await context.route(/^https?:/,route=>route.abort());await ready(page);await show(page,'San Diego, California, United States');await expect(page.locator('#coast-name')).toContainText('San Diego');await expect(page.locator('.model-badge')).toContainText('Local fallback');await expect(page.locator('#online-status')).toContainText('lookup failed');
  await page.locator('#online-panel > summary').click();await page.locator('#data-mode').selectOption('local');await expect(page.locator('.model-badge')).toContainText('Calculated here');const requests=[];page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});await show(page,'53.27,-9.05');await expect(page.locator('#zone-name')).toContainText('Europe/Dublin');expect(requests).toEqual([]);
});

test('prediction failure after successful station lookup falls back without hiding the reason',async({page,context})=>{
  await fixtures(context);await context.route('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter**',route=>route.fulfill({status:503,body:'Unavailable'}));await ready(page);await show(page);await expect(page.locator('.model-badge')).toContainText('Local fallback');await expect(page.locator('#online-status')).toContainText('Official predictions failed');await expect(page.locator('.day-card')).toHaveCount(5);
});

test('CHS is used automatically where it is the clear nearby station',async({page,context})=>{
  await fixtures(context);await ready(page);await show(page,'44.659,-63.583');await expect(page.locator('.model-badge')).toContainText('Canadian');await expect(page.locator('#forecast-note')).toContainText('Canadian chart datum');
});

test('late station and place searches cannot replace a newer choice, and phone controls fit',async({page,context})=>{
  await fixtures(context);await page.setViewportSize({width:390,height:844});let release;const delay=new Promise(r=>{release=r;});
  await context.route('https://photon.komoot.io/**',async route=>{await delay;return route.fulfill({json:{features:[feature('Old place')]}});});
  await ready(page);await show(page,'Old place');await expect(page.locator('#state-title')).toHaveText('Finding your place online');await show(page,'53.27,-9.05');await expect(page.locator('#zone-name')).toContainText('Europe/Dublin');release();await expect(page.locator('#place-choices')).toBeHidden();
  await context.route('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter**',async route=>{await new Promise(r=>setTimeout(r,300));return route.fulfill({json:predictions});});await show(page);await expect(page.locator('#online-status')).toContainText('Loading NOAA');await page.locator('#cancel-online').click();await show(page,'53.27,-9.05');await expect(page.locator('#zone-name')).toContainText('Europe/Dublin');await expect(page.locator('#official-stations button')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('deep links, geolocation and history use the same automatic online forecast flow',async({page,context})=>{
  await fixtures(context);await context.addInitScript(()=>{navigator.geolocation.getCurrentPosition=ok=>ok({coords:{latitude:32.71742,longitude:-117.16277}});});await ready(page,url+'#place=San%20Diego%2C%20California&date=1999-01-01');await expect(page.locator('.model-badge')).toContainText('NOAA');
  await expect(page.locator('.day-card').first()).toHaveAttribute('data-date','2026-09-08');
  await page.locator('#show-here').click();await expect(page.locator('#coast-name')).toContainText('Your location');await expect(page.locator('.model-badge')).toContainText('NOAA');await page.locator('#history-summary').click();await page.locator('.history-entry button').first().click();await expect(page.locator('.model-badge')).toContainText('NOAA');
});


test('Maroochydore uses Mooloolaba Bureau tables and Australia-local today, also offline', async ({page, context}) => {
  await fixtures(context);
  await context.route('https://photon.komoot.io/**', route => route.fulfill({json:{features:[feature('Maroochydore',[153.091,-26.655],{state:'Queensland',country:'Australia',type:'town'})]}}));
  const requests=[];page.on('request',r=>{if(/^https?:/.test(r.url())) requests.push(r.url());});
  await ready(page); await show(page,'Maroochydore');
  await expect(page.locator('.model-badge')).toHaveText('Bureau of Meteorology · 2026 tables');
  await expect(page.locator('#selected-point')).toContainText('Mooloolaba');
  await expect(page.locator('#zone-name')).toContainText('Australia/Brisbane');
  await expect(page.locator('.day-card').first()).toHaveAttribute('data-date','2026-09-09');
  await expect(page.locator('.day-card').first()).toContainText('Today');
  await expect(page.locator('.day-card').first()).toContainText('Low · 12:49 AM');
  await expect(page.locator('.day-card').first()).toContainText('High · 6:32 AM');
  await expect(page.locator('#forecast-note')).toContainText('Lowest Astronomical Tide');
  await expect(page.locator('#source-link')).toHaveAttribute('href',/2026_QLD_TP019.pdf/);
  await page.locator('#bureau-source summary').click(); await expect(page.locator('#bureau-attribution')).toContainText('subsequently been modified');
  expect(requests.length).toBe(1); expect(requests[0]).toContain('photon');
  // WebKit's automation transport cannot navigate file URLs while setOffline.
  // Reload the self-contained file with storage cleared, then cut connectivity.
  await page.evaluate(()=>localStorage.clear()); await page.reload(); await page.evaluate(()=>window.tideReady); await context.setOffline(true); requests.length=0;
  await show(page,'Maroochydore, Queensland, Australia');
  await expect(page.locator('.model-badge')).toContainText('Bureau');expect(requests).toEqual([]);
  await page.clock.setFixedTime(new Date('2026-12-29T20:00:00Z'));await show(page,'-26.655,153.091');
  await expect(page.locator('.model-badge')).toContainText('Local fallback');
  await expect(page.locator('#online-status')).toContainText('tables cover 2026-01-01 through 2026-12-31');
  await expect(page.locator('#bureau-source')).toBeHidden();
});
