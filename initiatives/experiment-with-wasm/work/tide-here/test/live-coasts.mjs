// Explicit live evidence collector; excluded from the deterministic test suite.
// Run from this directory's package root: node test/live-coasts.mjs <output.json>
import {chromium, firefox} from '@playwright/test';
import {writeFile, readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {localDateForInstant} from '../src/day-model.mjs';

const bundle = new URL('../../site/tide-here/index.html', import.meta.url);
const cases = [
  ['San Diego',32.71556,-117.17667,'America/Los_Angeles'],
  ['Seattle',47.6026,-122.3393,'America/Los_Angeles'],
  ['Boston',42.3548,-71.0534,'America/New_York'],
  ['Pensacola',30.4044,-87.2112,'America/Chicago'],
  ['Honolulu',21.3069,-157.8675,'Pacific/Honolulu'],
  ['Anchorage',61.2375,-149.8904,'America/Anchorage'],
  ['Victoria',48.4247,-123.3717,'America/Vancouver'],
  ['Halifax',44.659,-63.583,'America/Halifax'],
  ["St John's",47.5667,-52.7,'America/St_Johns'],
];
const report = {recordedAt:new Date().toISOString(), platform:process.platform,
  bundleSha256:createHash('sha256').update(await readFile(bundle)).digest('hex'), cases:[]};
for (const [engine, launcher] of Object.entries({chromium,firefox})) {
  const browser = await launcher.launch();
  const page = await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
  const errors=[], failed=[];
  page.on('pageerror', e=>errors.push(String(e)));
  page.on('requestfailed', r=>failed.push({url:r.url(),error:r.failure()?.errorText}));
  await page.goto(bundle.href); await page.evaluate(()=>window.tideReady);
  for (const [place,lat,lon,expectedZone] of cases) {
    const start=new Date(); const failureStart=failed.length;
    const item={engine,place,coordinates:[lat,lon],expectedZone,startedAt:start.toISOString()};
    try {
      await page.locator('#place-input').fill(`${lat},${lon}`);
      await page.locator('#show-selection').click();
      await page.waitForFunction(()=>!document.querySelector('#result').hidden ||
        document.querySelector('#state-title').textContent==='Choose a tide station',null,{timeout:90000});
      item.requiredStationChoice=await page.locator('#result').isHidden();
      if (item.requiredStationChoice) {
        item.stationChoices=await page.locator('#official-stations button').allTextContents();
        item.selectionStatus=await page.locator('#official-status').innerText();
        // Do not mistake a US station across the strait for the Canadian coast.
        // If the requested named station is absent, exercise the explicit local choice.
        const target=page.locator('#official-stations button').filter({hasText:place});
        if(await target.count()) await target.first().click();
        else {item.manualLocal=true; await page.locator('#use-local-model').click();}
        await page.locator('#result').waitFor({state:'visible',timeout:90000});
      }
      const downloadPromise=page.waitForEvent('download');
      await page.locator('#download-forecast').click();
      const download=await downloadPromise;
      const forecast=JSON.parse(await readFile(await download.path(),'utf8'));
      item.provider=forecast.engine.provider || 'fes2022';
      item.station=forecast.point;
      delete item.station.constituents;
      item.zone=forecast.timeZone; item.datum=forecast.datum;
      item.days=forecast.days.map(d=>({date:d.date,events:d.tides.length}));
      item.source=forecast.sources[0]; item.fallback=forecast.fallbackReason || null;
      item.status=await page.locator('#online-status').innerText();
      const instants=forecast.days.flatMap(d=>d.tides.map(t=>t.at));
      item.checks={fiveDays:forecast.days.length===5,
        zone:forecast.timeZone===expectedZone,
        coastToday:forecast.days[0].date===localDateForInstant(start,expectedZone),
        eventsInLocalDay:forecast.days.every(d=>d.tides.every(t=>localDateForInstant(t.at,expectedZone)===d.date)),
        uniqueEvents:new Set(instants).size===instants.length,
        hasEvents:instants.length>0,
        labelledFallback:item.provider!=='fes2022'||!!item.fallback||!!item.manualLocal,
        noOverflow:await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)};
      if(item.provider==='noaa'||item.provider==='chs') {
        const response=await fetch(forecast.sources[0].sourceUrl);
        const payload=await response.json();
        const raw=new Map((item.provider==='noaa'?payload.predictions||[]:payload).map(t=>[
          new Date(item.provider==='noaa'?t.t.replace(' ','T')+'Z':t.eventDate).toISOString(),t]));
        item.checks.providerEvents=forecast.days.every(d=>d.tides.every(t=>{
          const actual=raw.get(t.at);return actual&&Number(item.provider==='noaa'?actual.v:actual.value)===t.height&&
            (item.provider==='chs'||(actual.type==='H'?'high':'low')===t.type);
        }));
        item.providerResponseStatus=response.status;
      }
    } catch(e) { item.error=String(e); }
    item.failedRequests=failed.slice(failureStart); item.pageErrors=[...errors];
    report.cases.push(item);
    await writeFile(process.argv[2]||'/tmp/wasm-live-coasts.json',JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({engine,place,provider:item.provider,zone:item.zone,checks:item.checks,error:item.error}));
  }
  await browser.close();
}
if(report.cases.some(c=>c.error||c.pageErrors.length||Object.values(c.checks).some(v=>!v))) process.exitCode=1;
