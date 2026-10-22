import {chromium,webkit} from '../../../../../node_modules/playwright/index.mjs';
import AxeBuilder from '../../../../../node_modules/@axe-core/playwright/dist/index.mjs';
import {unzipSync,strFromU8} from 'fflate';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),out=resolve(root,'evidence/batch');await mkdir(out,{recursive:true});
const types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;const prefix='/nested/markers/';if(!path.startsWith(prefix))throw Error();const file=resolve(root,'dist',path.slice(prefix.length)||'batch.html');if(!file.startsWith(root+'/dist/'))throw Error();res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/nested/markers/batch.html`;
const sha=b=>createHash('sha256').update(b).digest('hex');
const receipt={at:new Date().toISOString(),engines:[],files:[],limitations:'Playwright desktop engines; branded browsers, physical iOS/Files, screen reader and full zoom/performance matrix remain unrun. Budget faults use pure model tests with injected bytes.'};
const fixture='title,date,time,timezone,occurrence,shape,shape_color,filename\n"Comma, title",2026-10-22,,Australia/Brisbane,,donut,red,same\n"A ""quote""",2026-10-22,12:34:56,UTC,,star,blue,same\n,,,,,solid,,\nRepeat,2026-11-01,01:30,America/Los_Angeles,earlier,donut,,con\nRepeat,2026-11-01,01:30,America/Los_Angeles,later,star,,con\nDate,2026-10-22,,Asia/Kathmandu,,solid,,../path\nSeconds,2026-10-22,01:02:03,UTC,,donut,,\nBlank,2026-10-22,,UTC,earlier,star,,\nNow,,,,,solid,,\nLast,2026-10-22,,Australia/Brisbane,,donut,,\n';
const expected=[['2026:10:22 00:00:00','+10:00'],['2026:10:22 12:34:56','+00:00'],['2026:10:22 00:00:01','+10:00'],['2026:11:01 01:30:00','-07:00'],['2026:11:01 01:30:00','-08:00'],['2026:10:22 00:00:00','+05:45'],['2026:10:22 01:02:03','+00:00'],['2026:10:22 00:00:00','+00:00'],['2026:10:22 00:00:01','+10:00'],['2026:10:22 00:00:00','+10:00']];
try{for(const[engine,launcher]of[['chromium',chromium],['webkit',webkit]]){
  const browser=await launcher.launch(),context=await browser.newContext({viewport:{width:1280,height:900},timezoneId:'Australia/Brisbane',acceptDownloads:true});const page=await context.newPage();
  const row={engine,version:browser.version(),cases:[],pageErrors:[]};receipt.engines.push(row);page.on('pageerror',e=>row.pageErrors.push(e.message));let downloads=0;page.on('download',()=>downloads++);
  const idle=()=>page.waitForFunction(()=>document.getElementById('batch-cancel').hidden);
  async function paste(csv){await page.locator('details').filter({has:page.locator('#csv-text')}).evaluate(e=>e.open=true);await page.locator('#csv-text').fill(csv);await page.locator('#import-text').click();}
  async function download(locator,name){const event=page.waitForEvent('download');await locator.click();const d=await event;await d.saveAs(resolve(out,name));return {bytes:await readFile(resolve(out,name)),filename:d.suggestedFilename()};}
  try{
    await page.clock.setFixedTime(new Date('2026-10-21T14:00:01Z'));await page.goto(url);await page.waitForFunction(()=>document.getElementById('batch-runtime').textContent.startsWith('Ready'));
    await paste('title,shape_color\n<script>alert(1)</script>,invalid\nGood,red\n,\n');assert.equal(await page.locator('#batch-generate').isDisabled(),true);assert.equal(await page.locator('#review-list script').count(),0);
    await page.locator('#exclude').click();assert.equal(await page.locator('#batch-generate').isEnabled(),true);
    await page.locator('[data-record="0002"]').click();await page.locator('#edit-field').selectOption('shape');await page.locator('#edit-value').fill('star');await page.locator('#apply-edit').click();assert.match(await page.locator('[data-record="0002"]').textContent(),/star/);
    await page.locator('#inherit').click();assert.match(await page.locator('[data-record="0002"]').textContent(),/donut/);
    await page.locator('[data-record="0001"]').click();await page.locator('#edit-field').selectOption('shape_color');await page.locator('#edit-value').fill('red');await page.locator('#apply-edit').click();await page.locator('#exclude').click();assert.equal(await page.locator('[data-record="0003"]').count(),1);
    row.cases.push('Invalid CSV values block; explicit exclusion/correction/restoration preserves IDs; row override inheritance; imported HTML stays text');
    await paste(fixture);assert.match(await page.locator('#review-summary').textContent(),/10 valid/);assert.equal(await page.locator('#review-list button').count(),10);
    const start=performance.now();await page.locator('#batch-generate').click();await idle();row.tenRowMs=performance.now()-start;assert.match(await page.locator('#batch-progress').textContent(),/^Finished/);assert.equal(downloads,0);
    const zip=await download(page.getByRole('button',{name:'Download ZIP',exact:true}).first(),`${engine}-ten.zip`);const entries=unzipSync(zip.bytes),manifest=JSON.parse(strFromU8(entries['manifest.json']));assert.equal(manifest.files.length,10);
    for(const[itemIndex,item]of manifest.files.entries()){
      const bytes=entries[item.filename];assert.equal(sha(bytes),item.sha256);assert.equal(item.id,String(itemIndex+1).padStart(4,'0'));assert.deepEqual([item.settings.timestamp.local,item.settings.timestamp.offset],expected[itemIndex]);
      const file=`${engine}-${item.id}.jpg`;await writeFile(resolve(out,file),bytes);receipt.files.push({file,sha256:item.sha256,local:expected[itemIndex][0],offset:expected[itemIndex][1],size:2000});
    }
    const single=await download(page.locator('[data-output="0001"]').getByRole('button',{name:'Download JPEG',exact:true}),`${engine}-individual.jpg`);assert.equal(sha(single.bytes),manifest.files[0].sha256);
    row.cases.push('Ten default-size markers with exact independent time expectations; one frozen run; deliberate ZIP and JPEG retrieval; byte-identical extraction and manifest hashes');
    await page.locator('#batch-timezone').fill('UTC');assert.match(await page.locator('#run-summary').textContent(),/Previous settings/);
    await page.locator('[data-part="1"]').getByRole('button',{name:'I saved this part',exact:false}).click();assert.equal(await page.locator('[data-part="1"]').getByRole('button',{name:'Download ZIP',exact:true}).isDisabled(),true);assert.equal(await page.locator('[data-output="0001"]').getByRole('button',{name:'Download JPEG',exact:true}).isDisabled(),true);
    const report=await download(page.locator('#run-report'),`${engine}-report.json`);const final=JSON.parse(report.bytes);assert.equal(final.rows.length,10);assert(final.rows.every(r=>r.availability==='user reported saving'));assert.equal(final.retainedBytes,0);assert.equal(final.parts[0].number,1);assert(final.peakAccountedBytes<=50*1024*1024);
    row.cases.push('Shared edits retain old-run label; explicit save acknowledgement releases part and individual URLs; lightweight report retains outcomes and original part assignment');
    // Start with known cached assets, then block all network while importing and generating.
    let attempts=0;await context.route(/^https?:\/\//,route=>{attempts++;return route.abort();});await context.setOffline(true);
    await page.locator('#batch-size').fill('256');await paste('title,shape\nOffline,solid\n');await page.locator('#batch-generate').click();await idle();
    await download(page.getByRole('button',{name:'Download ZIP',exact:true}).last(),`${engine}-offline.zip`);assert.equal(attempts,0);
    row.cases.push('Offline CSV import, draft, real WASM export, ZIP creation and retrieval with zero HTTP attempts');
    await page.locator('#discard-all').click();await paste('title\n'+Array.from({length:100},(_,i)=>'Record '+i).join('\n'));
    assert.match(await page.locator('#review-summary').textContent(),/100 valid/);
    await page.locator('#batch-generate').click();await page.waitForFunction(()=>document.querySelector('[data-output="0001"]').textContent.includes('verified'));await page.locator('#batch-cancel').click();await idle();assert.match(await page.locator('#batch-progress').textContent(),/Cancelled/);assert(await page.locator('[name=retry-row]').count()>0);
    const frozen=await page.locator('#run-summary').textContent();await page.clock.setFixedTime(new Date('2026-10-25T14:00:01Z'));
    await page.locator('[name=retry-row]').evaluateAll(nodes=>nodes.forEach((n,i)=>n.checked=i===0));await page.locator('#batch-resume').click();await idle();assert.equal(await page.locator('#run-summary').textContent(),frozen);
    row.cases.push('100-row preflight; cancellation keeps completed files; selected retry keeps frozen timestamp across days');
    await page.locator('#batch-resume').click();await idle();assert.equal(await page.locator('[name=retry-row]').count(),0);
    const fullReport=await download(page.locator('#run-report'),`${engine}-100-report.json`);const full=JSON.parse(fullReport.bytes);assert.equal(full.rows.filter(r=>r.status==='verified').length,100);
    for(const part of full.parts){const saved=await download(page.locator(`[data-part="${part.number}"]`).getByRole('button',{name:'Download ZIP',exact:true}),`${engine}-100-part-${part.number}.zip`);const files=unzipSync(saved.bytes);const m=JSON.parse(strFromU8(files['manifest.json']));for(const f of m.files){assert.equal(sha(files[f.filename]),f.sha256);assert.equal(f.settings.timestamp.local,'2026:10:21 14:00:01');assert.equal(f.settings.timestamp.offset,'+00:00');const file=`${engine}-100-${f.id}.jpg`;await writeFile(resolve(out,file),files[f.filename]);receipt.files.push({file,sha256:f.sha256,local:'2026:10:21 14:00:01',offset:'+00:00',size:256});}}
    row.cases.push('All 100 real exports complete after cancellation; earlier part remains immutable; every retrieved part extracted and audited against frozen pre-midnight time');
    for(const width of[1280,430,320]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const audit=await new AxeBuilder({page}).analyze();assert.deepEqual(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);row.cases.push(`No horizontal overflow or detected axe violation at ${width}px`);}
    assert.deepEqual(row.pageErrors,[]);row.pass=true;
  }catch(e){row.pass=false;row.error=e.stack;await page.screenshot({path:resolve(out,`${engine}-failure.png`),fullPage:true}).catch(()=>{});}
  finally{await context.close();await browser.close();}
}}finally{server.close();await writeFile(resolve(out,'browser.json'),JSON.stringify(receipt,null,2)+'\n');}
console.log(JSON.stringify(receipt.engines,null,2));if(receipt.engines.some(r=>!r.pass))process.exitCode=1;
