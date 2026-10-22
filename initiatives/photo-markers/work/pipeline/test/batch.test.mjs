import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {unzipSync,strFromU8} from 'fflate';
import {parseCSV,reviewRows,effectiveInput,limits} from '../csv.mjs';
import {BatchRun} from '../batch.mjs';
import {captureRun,defaults,resolveSettings} from '../settings.mjs';
const now='2026-10-21T14:00:01Z',shared={...defaults,timezone:'Australia/Brisbane'};
const review=source=>reviewRows(parseCSV(source).rows,shared,{run:captureRun({now})});
const source=(count=3)=>parseCSV('title,shape\n'+Array.from({length:count},(_,i)=>`Row ${i+1},solid`).join('\n')).rows;
const hash=b=>createHash('sha256').update(b).digest('hex');
class FakePipeline{
  constructor(){this.owner='fake';this.fail=new Set();this.calls=[];this.size=1000;}
  createRun(inputs,options){const captured=captureRun(options);return {id:crypto.randomUUID(),captured,jobs:inputs.map(input=>({owner:this.owner,settings:resolveSettings(input,captured)}))};}
  async export(job){this.calls.push(job);if(this.fail.has(job.id))throw Error('injected encoding error');const bytes=new Uint8Array(this.size).fill(Number(job.id));return {bytes,sha256:hash(bytes),verified:true};}
  cancel(){}
}
test('BOM, CRLF, escaped quotes, commas, blank-cell and multiline records retain logical IDs/source lines',()=>{
  const p=parseCSV('\uFEFFtitle,shape\r\n"A, ""quote""",star\r\n\r\n,\r\n"line\r\nbreak",solid\r\n');
  assert.equal(p.ignored,1);assert.deepEqual(p.rows.map(r=>[r.id,r.line,r.values.title]),[['0001',2,'A, "quote"'],['0002',4,''],['0003',5,'line\r\nbreak']]);
  assert.match(reviewRows(p.rows,shared)[2].error,/one line/);
});
for(const [name,input,pattern]of [
  ['duplicate','title,title\nx,y',/Duplicate/],['unknown','Title\nx',/Unknown/],['unclosed','title\n"x',/not closed/],
  ['quote after content','title\nx"',/Unexpected/],['after quote','title\n"x"z',/closing quote/],['column count','title,size\nx',/expected 2/],
  ['header only','title\n',/at least/],['empty','',/at least/],['101 rows','title\n'+Array(101).fill('x').join('\n'),/100 records/],
])test(`CSV rejects ${name} with actionable location`,()=>assert.throws(()=>parseCSV(input),pattern));
test('100 rows and exact UTF-8 byte bound; quoted empty one-column marker retained',()=>{
  assert.equal(source(100).length,100);const exact='title\n'+ 'x'.repeat(limits.csv-6);assert.equal(parseCSV(exact).rows.length,1);
  assert.throws(()=>parseCSV(exact+'x'),/1 MiB/);assert.equal(parseCSV('title\n""\n').rows.length,1);
});
test('precedence, clearing override, supplied unused colors and unavailable font keys',()=>{
  const r=parseCSV('title,shape,shape_color,date\nCSV,solid,red,').rows[0];
  r.edits.title='';r.edits.shape_color='blue';assert.equal(effectiveInput(r,shared).title,'');assert.equal(effectiveInput(r,shared).shape_color,'blue');
  delete r.edits.shape_color;assert.equal(effectiveInput(r,shared).shape_color,'red');
  r.edits.shape_color=' ';assert.equal(effectiveInput(r,shared).shape_color,'red');
  r.edits.shape_color='bad';assert.match(reviewRows([r],shared)[0].error,/shape_color/);
  r.edits.shape_color='red';r.edits.font='https://example.org/font';assert.match(reviewRows([r],shared)[0].error,/font/i);
  r.edits.font='local-1';assert.match(reviewRows([r],shared)[0].error,/not loaded/);
  assert.equal(reviewRows([r],shared,{fonts:['local-1']})[0].error,null);
});
test('ten-row time/style fixture has independently specified expectations',()=>{
  const rows=review('title,date,time,timezone,occurrence,shape,filename\n"Comma, title",2026-10-22,,Australia/Brisbane,,donut,same\n"A ""quote""",2026-10-22,12:34:56,UTC,,star,same\n,,,,,solid,\nRepeat,2026-11-01,01:30,America/Los_Angeles,earlier,donut,con\nRepeat,2026-11-01,01:30,America/Los_Angeles,later,star,con\nDate,2026-10-22,,Asia/Kathmandu,,solid,../path\nSeconds,2026-10-22,01:02:03,UTC,,donut,\nBlank,2026-10-22,,UTC,earlier,star,\nNow,,,,,solid,\nLast,2026-10-22,,Australia/Brisbane,,donut,');
  assert.equal(rows.length,10);assert(rows.every(r=>!r.error));assert.equal(new Set(rows.map(r=>r.filename)).size,10);
  assert.deepEqual(rows.map(r=>[r.settings.timestamp.local,r.settings.timestamp.offset]),[
    ['2026:10:22 00:00:00','+10:00'],['2026:10:22 12:34:56','+00:00'],['2026:10:22 00:00:01','+10:00'],
    ['2026:11:01 01:30:00','-07:00'],['2026:11:01 01:30:00','-08:00'],['2026:10:22 00:00:00','+05:45'],
    ['2026:10:22 01:02:03','+00:00'],['2026:10:22 00:00:00','+00:00'],['2026:10:22 00:00:01','+10:00'],['2026:10:22 00:00:00','+10:00']]);
  assert(rows[7].unused.includes('occurrence'));assert.match(rows[3].filename,/^marker-con/);assert(!rows[5].filename.includes('/'));
  assert(rows.every((r,i)=>r.id===String(i+1).padStart(4,'0')));
});
test('invalid rows block until exclusion; frozen IDs and now survive edits and retries',async()=>{
  const p=new FakePipeline(),b=new BatchRun(p);const rows=source();rows[1].edits.date='bad';
  assert.throws(()=>b.start(rows,shared,['noto-bold'],now),/Correct/);rows[1].excluded=true;
  b.start(rows,shared,['noto-bold'],now);p.fail.add('0003');await b.process();assert.deepEqual(p.calls.map(j=>j.id),['0001','0003']);
  rows[2].edits.title='later edit';const old=b.rows[2].job;const firstManifest=JSON.stringify(b.parts[0].manifest);
  p.fail.clear();await b.process(['0003']);assert.equal(b.rows[2].job,old);assert.equal(b.rows[2].settings.title,'Row 3');assert.equal(b.rows[2].settings.capturedNow,now);
  assert.equal(JSON.stringify(b.parts[0].manifest),firstManifest);assert.equal(b.rows[1].status,'excluded');
});
test('ZIP extraction preserves original bytes, hash/part membership and original order',async()=>{
  const p=new FakePipeline(),b=new BatchRun(p,{partTarget:1500});b.start(source(),shared,['noto-bold'],now);await b.process();assert.equal(b.parts.length,3);
  for(const part of b.parts){const files=unzipSync(part.bytes),m=JSON.parse(strFromU8(files['manifest.json']));assert.equal(m.runId,b.id);assert.equal(m.part,part.number);
    for(const item of m.files){assert.equal(hash(files[item.filename]),item.sha256);assert.deepEqual(files[item.filename],b.rows.find(r=>r.id===item.id).bytes);}}
});
test('packaging failure preserves individual JPEGs, import and retryable packaging',async()=>{
  const p=new FakePipeline(),b=new BatchRun(p,{pack:()=>{throw Error('injected packaging failure');}});b.start(source(),shared,['noto-bold'],now);await b.process();
  assert.match(b.message,/Packaging/);assert(b.rows.every(r=>r.bytes&&r.status==='verified'));assert.equal(b.parts.length,0);
});
test('50 MiB budget reserves ZIP headers/copies, splits early and releases only on acknowledgement',async()=>{
  const p=new FakePipeline();p.size=9*1024*1024;
  const b=new BatchRun(p,{reserve:()=>10*1024*1024});b.start(source(6),shared,['noto-bold'],now);await b.process();
  assert(b.rows.some(r=>r.status==='queued'));assert(b.parts.length>0);assert(b.peak<=limits.retained);
  const original=JSON.stringify(b.parts[0].manifest);const first=b.parts[0];const url=b.downloadURL(first,'application/zip');assert.equal(b.downloadURL(first,'application/zip'),url);assert(first.bytes);
  b.releasePart(first.number,'user reported saving');assert(!first.bytes);assert.equal(first.availability,'user reported saving');assert.throws(()=>b.downloadURL(first,'application/zip'),/released/);
  assert.equal(JSON.stringify(first.manifest),original);await b.process();assert(b.peak<=limits.retained);b.discardAll();assert.equal(b.retained,0);
  assert(!JSON.stringify(b.report()).includes('"bytes"'));
});
test('oversize JPEG offered individually; impossible outputs fail without a pause loop',async()=>{
  const p=new FakePipeline();p.size=1000;const b=new BatchRun(p,{partTarget:900,reserve:()=>30*1024*1024});b.start(source(1),shared,['noto-bold'],now);await b.process();assert.equal(b.parts.length,0);assert.equal(b.rows[0].status,'verified');
  b.discardAll();p.size=51*1024*1024;b.start(source(1),shared,['noto-bold'],now);await b.process();assert.equal(b.rows[0].status,'failed');assert.match(b.rows[0].error,/allowance/);assert.equal(b.retained,0);
});
test('cancel ignores late result, preserves verified files and retries only selected frozen rows',async()=>{
  const p=new FakePipeline(),b=new BatchRun(p);const real=p.export.bind(p);let release;
  p.export=async job=>job.id==='0002'?new Promise(r=>release=async()=>r(await real(job))):real(job);
  b.start(source(),shared,['noto-bold'],now);const running=b.process();while(!release)await new Promise(r=>setTimeout(r,1));b.cancel();await release();await running;
  assert.equal(b.rows[0].status,'verified');assert.equal(b.rows[1].status,'cancelled');assert(!b.rows[1].bytes);assert.equal(b.rows[2].status,'cancelled');
  p.export=real;await b.process(['0002']);assert.equal(b.rows[1].status,'verified');assert.equal(b.rows[2].status,'cancelled');
});
