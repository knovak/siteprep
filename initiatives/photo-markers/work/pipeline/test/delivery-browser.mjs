import { chromium, webkit } from '../../../../../node_modules/playwright/index.mjs';
import AxeBuilder from '../../../../../node_modules/@axe-core/playwright/dist/index.mjs';
import { unzipSync, strFromU8 } from 'fflate';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { createHash } from 'node:crypto';
import os from 'node:os';
const root = resolve(import.meta.dirname, '..'), evidence = resolve(root, 'evidence/delivery');
await mkdir(evidence, { recursive: true });
const prefix = '/nested/photo-markers/';
const mime = { '.js':'text/javascript', '.html':'text/html', '.css':'text/css', '.wasm':'application/wasm' };
const served = [];
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    assert(path.startsWith(prefix));
    const file = resolve(root, 'dist', path.slice(prefix.length) || 'index.html');
    assert(file.startsWith(root + '/dist/'));
    const bytes = await readFile(file); served.push({ path, bytes:bytes.length, method:req.method });
    res.writeHead(200, { 'Content-Type':mime[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' }); res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}${prefix}`;
const receipt = { at:new Date().toISOString(), host:{ platform:os.platform(), release:os.release(), arch:os.arch(), cpus:os.cpus()[0]?.model },
  sourceCommit:process.env.PHOTO_SOURCE_COMMIT || null, engines:[], files:[],
  caveats:'Installed Google Chrome runs headless with an isolated automation profile. Playwright WebKit is supplementary engine evidence, not branded Safari. Context-cold means a new context/no-store responses; OS/WASM caches are not reset. UI timings include driver latency. Physical iOS/Files, real screen reader and total process peak memory remain unrun.' };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function stats(samples) { const sorted=[...samples].sort((a,b)=>a-b); return { samples, median:sorted[Math.floor(sorted.length/2)], min:sorted[0], max:sorted.at(-1) }; }
const ready = page => page.waitForFunction(() => document.querySelector('#runtime')?.textContent.startsWith('Ready') && !document.querySelector('#draft').hidden);
const generated = page => page.waitForFunction(() => !document.querySelector('#generate').disabled && document.querySelector('#progress').textContent.startsWith('Verified'));
async function save(page, locator, name) {
  const event=page.waitForEvent('download'); await locator.click(); const download=await event;
  const path=resolve(evidence,name); await download.saveAs(path); return {bytes:await readFile(path),filename:download.suggestedFilename()};
}
async function auditZip(bytes, engine, label) {
  const zip=unzipSync(bytes), manifest=JSON.parse(strFromU8(zip['manifest.json']));
  for (const item of manifest.files) {
    const b=zip[item.filename]; assert.equal(sha(b),item.sha256);
    const archive=`${engine}-${label}.zip`;
    // Independent constants, not the application's settings object, drive the native oracle.
    receipt.files.push({archive,member:item.filename,sha256:item.sha256,size:2000,local:'2026:10:22 00:00:00',offset:'+10:00'});
  }
  return manifest;
}
async function pasteBatch(page, count) {
  await page.locator('details').filter({has:page.locator('#csv-text')}).evaluate(e=>e.open=true);
  await page.locator('#csv-text').fill('title,date,timezone,shape\n'+Array.from({length:count},(_,i)=>`Chapter ${i+1},2026-10-22,Australia/Brisbane,${['donut','star','solid'][i%3]}`).join('\n'));
  await page.locator('#import-text').click(); assert.match(await page.locator('#review-summary').textContent(),new RegExp(`^${count} valid`));
}
try {
  for (const [engine,launcher,options] of [['chrome',chromium,{channel:'chrome'}],['webkit',webkit,{}]]) {
    const row={engine,cases:[],errors:[]};receipt.engines.push(row);
    let browser;
    try {
      browser=await launcher.launch(options);row.version=browser.version();
      const cold=[], requests=[];
      for(let i=0;i<3;i++){
        const context=await browser.newContext({viewport:{width:1280,height:900},timezoneId:'Australia/Brisbane'}),page=await context.newPage();
        page.on('request',r=>requests.push({url:r.url(),method:r.method(),bytes:r.postDataBuffer()?.length||0}));
        const start=performance.now();await page.goto(base);await ready(page);cold.push(performance.now()-start);await context.close();
      }
      row.coldReadyMs=stats(cold);row.initialRequests=requests;
      assert(requests.every(r=>r.url.startsWith(base)&&r.method==='GET'&&r.bytes===0));
      row.cases.push('Three context-cold starts; initial static requests confined to the nested output, no posted data');
      const context=await browser.newContext({viewport:{width:1280,height:900},timezoneId:'Australia/Brisbane',acceptDownloads:true}),page=await context.newPage();
      page.on('pageerror',e=>row.errors.push(e.message));await page.goto(base);await ready(page);
      await page.locator('#date').fill('2026-10-22');await page.locator('#timezone').fill('Australia/Brisbane');
      const draft=[], single=[];
      for(let i=0;i<5;i++){
        const start=performance.now();await page.locator('#title').fill(`Warm marker ${i+1}`);await ready(page);draft.push(performance.now()-start);
        const t=performance.now();await page.locator('#generate').click();await generated(page);single.push(performance.now()-t);
        const file=`${engine}-warm-${i+1}.jpg`,d=await save(page,page.locator('#download'),file);
        receipt.files.push({file,sha256:sha(d.bytes),size:2000,local:'2026:10:22 00:00:00',offset:'+10:00'});
      }
      row.draftMs=stats(draft);row.warmSingleMs=stats(single);
      row.targets={draft500ms:draft.every(x=>x<=500),warmSingle2000ms:single.every(x=>x<=2000)};
      row.cases.push('Five actual warm UI exports and draft updates with deliberate retrieved JPEGs');
      await page.locator('#advanced').evaluate(e=>e.open=true);
      await page.locator('#size').fill('4096');const maxStart=performance.now();await page.locator('#generate').click();await generated(page);row.max4096Ms=performance.now()-maxStart;
      const max=await save(page,page.locator('#download'),`${engine}-4096.jpg`);receipt.files.push({file:`${engine}-4096.jpg`,sha256:sha(max.bytes),size:4096,local:'2026:10:22 00:00:00',offset:'+10:00'});
      await page.locator('#size').fill('2000');await ready(page);
      // Traverse every open editor field without activating a browser file picker.
      const forward=[];
      for(const key of engine==='webkit'?['Tab','Alt+Tab']:['Tab']) {
        await page.locator('#title').focus();
        for(let i=0;i<45;i++){
          forward.push(await page.evaluate(key=>{const e=document.activeElement;return {key,id:e.id,tag:e.tagName,type:e.type||'',outline:getComputedStyle(e).outlineStyle};},key));
          await page.keyboard.press(key);
        }
      }
      const required=['shape','background_color','shape_color','center_color','text_color','outline_color','size','font','local-font','outline_width','date','time','timezone','generate','download','discard'];
      row.keyboardFocus=forward;row.keyboardMissing=required.filter(id=>!forward.some(x=>x.id===id));
      if(engine==='chrome')assert.deepEqual(row.keyboardMissing,[]);
      row.cases.push('Maximum-size verified export; keyboard focus traversal recorded separately for Tab and WebKit Option-Tab; any omitted controls remain an explicit acceptance gap');
      const batch=await context.newPage();batch.on('pageerror',e=>row.errors.push(e.message));await batch.goto(base+'batch.html');await batch.waitForFunction(()=>document.querySelector('#batch-runtime').textContent.startsWith('Ready'));
      const ten=[];
      for(let i=0;i<3;i++){
        await pasteBatch(batch,10);const t=performance.now();await batch.locator('#batch-generate').click();await batch.waitForFunction(()=>document.querySelector('#batch-cancel').hidden&&document.querySelector('#batch-progress').textContent.startsWith('Finished'));ten.push(performance.now()-t);
        const d=await save(batch,batch.getByRole('button',{name:'Download ZIP',exact:true}).last(),`${engine}-ten-${i+1}.zip`);await auditZip(d.bytes,engine,`ten-${i+1}`);await batch.locator('#discard-all').click();
      }
      row.tenRowMs=stats(ten);row.targets.tenRow30000ms=ten.every(x=>x<=30000);
      // The worst configured batch is exercised at default resolution, acknowledging
      // real saved files when admission pauses. Retrieval time is tracked separately.
      await pasteBatch(batch,100);await batch.evaluate(()=>{window.deliveryLags=[];let last=performance.now();window.deliveryTimer=setInterval(()=>{const n=performance.now();window.deliveryLags.push(n-last);last=n;},25);});
      const worstStart=performance.now();let retrievalMs=0,pauses=0,partCount=0;
      await batch.locator('#batch-generate').click();
      while(true){
        await batch.waitForFunction(()=>document.querySelector('#batch-cancel').hidden,{},{timeout:180000});
        const status=await batch.locator('#batch-progress').textContent();
        const before=performance.now();
        const parts=await batch.locator('[data-part]').all();
        for(const part of parts){const b=part.getByRole('button',{name:'Download ZIP',exact:true});if(await b.isEnabled()){
          const number=await part.getAttribute('data-part');const d=await save(batch,b,`${engine}-100-part-${number}.zip`);await auditZip(d.bytes,engine,`100-part-${number}`);partCount++;
          await part.getByRole('button',{name:'I saved this part',exact:false}).click();
        }}
        // A failed ZIP allocation must still leave individual delivery possible.
        if(!status.startsWith('Finished') && await batch.locator('[data-part] button:enabled').count()===0){
          const outputs=await batch.locator('[data-output]').all();for(const out of outputs){const b=out.getByRole('button',{name:'Download JPEG',exact:true});if(await b.count()&&await b.isEnabled()){
            const id=await out.getAttribute('data-output');const name=`${engine}-100-individual-${id}.jpg`;const d=await save(batch,b,name);receipt.files.push({file:name,sha256:sha(d.bytes),size:2000,local:'2026:10:22 00:00:00',offset:'+10:00'});await out.getByRole('button',{name:'I saved this JPEG',exact:false}).click();
          }}
        }
        retrievalMs+=performance.now()-before;
        if(status.startsWith('Finished'))break;
        assert.match(status,/Paused|Packaging paused/);pauses++;assert(pauses<30);await batch.locator('#batch-resume').click();
      }
      row.worst100={elapsedMs:performance.now()-worstStart,retrievalMs,activeApproxMs:performance.now()-worstStart-retrievalMs,pauses,parts:partCount};
      row.eventLoop=await batch.evaluate(()=>{clearInterval(window.deliveryTimer);return {samples:window.deliveryLags.length,maxGapMs:Math.max(...window.deliveryLags)};});
      const report=await save(batch,batch.locator('#run-report'),`${engine}-100-report.json`),summary=JSON.parse(report.bytes);
      assert.equal(summary.rows.filter(r=>r.status==='verified').length,100);assert(summary.peakAccountedBytes<=50*1024*1024);row.worst100.peakAccountedBytes=summary.peakAccountedBytes;
      row.cases.push('Three timed ten-row packages and a 100-record default-size run with real saved parts, budget pauses and event-loop sampling');
      await batch.locator('#discard-all').click();await pasteBatch(batch,100);await batch.locator('#batch-generate').click();await batch.waitForFunction(()=>document.querySelector('[data-output="0001"]').textContent.includes('verified'));
      await batch.locator('#batch-cancel').focus();const cancelStart=performance.now();await batch.keyboard.press('Enter');await batch.waitForFunction(()=>document.querySelector('#batch-cancel').hidden);row.cancelResponseMs=performance.now()-cancelStart;
      assert.match(await batch.locator('#batch-progress').textContent(),/Cancelled/);assert(await batch.locator('[name=retry-row]').count()>0);await batch.locator('#discard-all').click();
      for(const [width,height] of [[1280,900],[430,932],[932,430],[320,900]]){
        await batch.setViewportSize({width,height});assert(await batch.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const audit=await new AxeBuilder({page:batch}).analyze();assert.deepEqual(audit.violations.map(v=>v.id),[]);
      }
      row.cases.push('Keyboard Cancel remains usable during a 100-row run; zero detected axe violations/overflow at desktop, portrait, landscape and 320px');
      let laterRequests=0;await context.route(/^https?:\/\//,r=>{laterRequests++;return r.abort();});if(engine==='chrome')await context.setOffline(true);row.networkMode=engine==='chrome'?'context offline plus HTTP deny':'HTTP deny; context-offline File I/O fails separately in this environment';
      await page.locator('#local-font').setInputFiles(resolve(root,'dist/NotoSans-Bold.ttf'));await page.waitForFunction(()=>document.querySelector('#font').value.startsWith('local-'));
      await page.locator('#title').fill('Offline local font');await ready(page);await page.locator('#generate').click();await generated(page);
      const offline=await save(page,page.locator('#download'),`${engine}-offline-font.jpg`);receipt.files.push({file:`${engine}-offline-font.jpg`,sha256:sha(offline.bytes),size:2000,local:'2026:10:22 00:00:00',offset:'+10:00'});
      await pasteBatch(batch,10);await batch.locator('#batch-generate').click();await batch.waitForFunction(()=>document.querySelector('#batch-cancel').hidden&&document.querySelector('#batch-progress').textContent.startsWith('Finished'));
      const offlineZip=await save(batch,batch.getByRole('button',{name:'Download ZIP',exact:true}).last(),`${engine}-offline-ten.zip`);await auditZip(offlineZip.bytes,engine,'offline-ten');assert.equal(laterRequests,0);
      row.cases.push('Offline local-font single and ten-row generation/packaging/retrieval with no later HTTP attempts');
      assert.deepEqual(row.errors,[]);await context.close();
      const broken=await browser.newContext(),bp=await broken.newPage();await broken.route('**/mozjpeg_enc.wasm',r=>r.fulfill({status:404,body:'missing'}));await bp.goto(base);await bp.locator('#prepare').waitFor();assert(await bp.locator('#generate').isDisabled());await broken.unroute('**/mozjpeg_enc.wasm');await bp.locator('#prepare').click();await ready(bp);await broken.close();
      row.cases.push('Missing WASM disables export; explicit preparation retry recovers without an encoder fallback');row.pass=true;
    } catch(error){row.pass=false;row.error=error.stack;}
    finally {if(browser)await browser.close();await writeFile(resolve(evidence,'browser.json'),JSON.stringify(receipt,null,2)+'\n');}
    console.log(JSON.stringify(row,null,2));
  }
} finally {server.close();receipt.served=served;await writeFile(resolve(evidence,'browser.json'),JSON.stringify(receipt,null,2)+'\n');}
if(receipt.engines.some(r=>!r.pass))process.exitCode=1;
