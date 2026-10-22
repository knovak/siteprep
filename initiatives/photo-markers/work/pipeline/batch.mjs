import { zipSync } from 'fflate';
import { captureRun, freeze } from './settings.mjs';
import { limits, reviewRows } from './csv.mjs';
const encoder=new TextEncoder();
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
export class BatchRun {
  constructor(pipeline,{onChange=()=>{},budget=limits.retained,partTarget=limits.payload,
    pack=files=>zipSync(files,{level:0,mtime:new Date(1980,0,1)}),
    reserve=settings=>3*settings.size**2+65536}={}) {
    this.pipeline=pipeline;this.onChange=onChange;this.budget=budget;this.partTarget=partTarget;
    this.pack=pack;this.reserve=reserve;this.rows=[];this.parts=[];this.active=false;this.token=0;this.peak=0;
  }
  get retained(){return this.rows.reduce((n,r)=>n+(r.bytes?.byteLength||0)+(r.url?r.size:0),0)+this.parts.reduce((n,p)=>n+(p.bytes?.byteLength||0)+(p.url?p.size:0),0);}
  record(extra=0){const amount=this.retained+extra; if(amount>this.budget) throw Error('Output budget exceeded. Save or discard retained files.');this.peak=Math.max(this.peak,amount);}
  notify(){this.onChange(this);}
  start(source,shared,fonts,now=Date.now()) {
    if(this.active || this.retained) throw Error('Save or discard previous output before starting a new run. Its frozen report remains available.');
    const captured=captureRun({now});
    const reviewed=reviewRows(source,shared,{run:captured,fonts});
    if(reviewed.some(r=>!r.excluded && r.error)) throw Error('Correct or explicitly exclude invalid records before generation.');
    if(!reviewed.some(r=>!r.excluded)) throw Error('Include at least one valid record.');
    const included=reviewed.filter(r=>!r.excluded);
    const run=this.pipeline.createRun(included.map(r=>r.input),{now:captured.now});
    this.id=run.id;this.captured=run.captured;this.created=new Date().toISOString();this.parts=[];this.peak=0;
    let index=0;
    this.rows=reviewed.map(r=>({id:r.id,line:r.line,filename:r.filename||null,
      source:freeze({values:{...r.values},edits:{...r.edits}}),
      settings:r.settings||null,status:r.excluded?'excluded':'queued',error:r.error||null,
      availability:'not generated',part:null,size:0,sha256:null,
      job:r.excluded?null:freeze({...run.jobs[index++],id:r.id})}));
    this.message='Frozen run ready. Now and all settings are fixed for retries.';this.notify();
  }
  async process(ids=null) {
    if(this.active) return;
    if(ids) for(const r of this.rows) if(ids.includes(r.id) && ['failed','cancelled'].includes(r.status)) {r.status='queued';r.error=null;}
    this.active=true;const token=++this.token;this.message='Generating frozen records…';this.notify();
    try {
      for(const row of this.rows) {
        if(token!==this.token) return;
        if(row.status!=='queued') continue;
        const rawReservation=this.reserve(row.settings);
        if(rawReservation>this.budget) {row.status='failed';row.error='Image output allowance exceeds the budget. Reduce image size for a new run.';continue;}
        const reservation=Math.min(2*rawReservation,this.budget);
        const pendingPayload=this.pending().reduce((n,r)=>n+r.size,0);
        if(pendingPayload && this.retained+reservation+2*pendingPayload+1024*1024>this.budget)await this.packagePending();
        if(this.retained+reservation>this.budget) {
          await this.packagePending();
          this.message='Paused for space. Save or discard available output, then Resume.';return;
        }
        this.record(reservation);row.status='generating';this.current=row.id;this.notify();
        try {
          const result=await this.pipeline.export(row.job);
          if(token!==this.token) return;
          if(!result.verified || !(result.bytes instanceof Uint8Array)) throw Error('Export did not pass verification.');
          if(result.bytes.byteLength>rawReservation || this.retained+2*result.bytes.byteLength>this.budget)
            throw Error('JPEG exceeds the reserved output allowance. Reduce image size for a new run.');
          this.record(2*result.bytes.byteLength);
          const url=URL.createObjectURL(new Blob([result.bytes],{type:'image/jpeg'}));
          row.bytes=result.bytes;row.url=url;row.size=result.bytes.byteLength;row.sha256=result.sha256;
          row.status='verified';row.error=null;row.availability='available';this.record();
        } catch(error) {if(token!==this.token)return;row.status='failed';row.error=`${error.stage?error.stage+': ':''}${error.message}`;row.availability='not generated';}
        this.notify();
        if(this.pending().reduce((n,r)=>n+r.size,0)>=this.partTarget) await this.packagePending();
        await pause();
      }
      if(token!==this.token) return;
      await this.packagePending();
      this.message=this.pending().length?'Packaging paused for space. Download individual JPEGs, acknowledge saving or discard, then Resume.':this.rows.some(r=>['failed','cancelled'].includes(r.status))?'Finished with failed or cancelled records. Retry selected records using their frozen settings.':'Finished. Download each part deliberately, then check your saved files.';
    } catch(error) {this.message=`Packaging: ${error.message} Individual verified JPEGs remain available.`;}
    finally {if(token===this.token){this.active=false;this.current=null;this.notify();}}
  }
  pending(){return this.rows.filter(r=>r.bytes && r.part===null && r.size<=this.partTarget);}
  async packagePending() {
    while(this.pending().length) {
      const selected=[];let payload=0,manifest,manifestBytes,zipUpper,reservation;
      const number=this.parts.length+1;
      for(const row of this.pending()) {
        const next=[...selected,row],size=payload+row.size;
        if(size>this.partTarget) break;
        const candidate=this.manifest(number,next);
        const mb=encoder.encode(JSON.stringify(candidate,null,2));
        // Stored ZIP has one output allocation, no deflated JPEG copies. Keep a
        // larger reservation for manifest strings/encoding, headers and Blob delivery.
        const upper=size+mb.byteLength+next.reduce((n,r)=>n+76+2*encoder.encode(r.filename).length,0)+76+26+22;
        const extra=2*upper+4*mb.byteLength+65536;
        if(this.retained+extra>this.budget) break;
        selected.push(row);payload=size;manifest=candidate;manifestBytes=mb;zipUpper=upper;reservation=extra;
      }
      if(!selected.length) {this.message='Not enough packaging space. Download individual JPEGs and acknowledge saving or discard them, then Resume.';return;}
      const token=this.token;this.record(reservation);await pause();if(token!==this.token)return;
      const files=Object.fromEntries(selected.map(r=>[r.filename,r.bytes]));files['manifest.json']=manifestBytes;
      const bytes=await this.pack(files);
      if(token!==this.token) return;
      if(bytes.byteLength>zipUpper) throw Error('ZIP exceeded its reserved allocation. Individual JPEGs are still available.');
      const url=URL.createObjectURL(new Blob([bytes],{type:'application/zip'}));
      const part={number,filename:`markers-${this.id}-part-${String(number).padStart(3,'0')}.zip`,bytes,url,size:bytes.byteLength,
        rows:selected.map(r=>r.id),manifest:freeze(manifest),availability:'available'};
      this.parts.push(part);for(const r of selected) r.part=number;
      this.record();this.notify();
    }
  }
  manifest(number,rows){return {schema:'photo-markers-part-v1',runId:this.id,part:number,createdAt:new Date().toISOString(),captured:this.captured,
    files:rows.map(r=>({id:r.id,sourceLine:r.line,filename:r.filename,sha256:r.sha256,size:r.size,status:'verified',settings:r.settings}))};}
  async packageAvailable(){if(this.active)return;this.active=true;const token=++this.token;this.notify();try{await this.packagePending();}finally{if(token===this.token){this.active=false;this.notify();}}}
  cancel() {
    if(!this.active)return;
    this.token++;this.pipeline.cancel();this.active=false;this.current=null;
    for(const r of this.rows) if(['queued','generating'].includes(r.status)) {r.status='cancelled';r.error='Cancelled. Retry retains the original frozen settings.';}
    this.message='Cancelled. Completed files remain available. Retry keeps the frozen time and settings.';this.notify();
  }
  downloadURL(item,type) {
    if(!item.bytes) throw Error('These bytes were released. Download is unavailable in this page.');
    if(!item.url){this.record(item.size);item.url=URL.createObjectURL(new Blob([item.bytes],{type}));this.record();}
    return item.url;
  }
  releaseRow(id,reason) {
    const row=this.rows.find(r=>r.id===id);if(!row||(!row.bytes&&!row.url))return;
    if(row.url) URL.revokeObjectURL(row.url);delete row.url;delete row.bytes;row.availability=reason;this.notify();
  }
  releasePart(number,reason) {
    const part=this.parts.find(p=>p.number===number);if(!part)return;
    if(part.url)URL.revokeObjectURL(part.url);delete part.url;delete part.bytes;part.availability=reason;
    for(const id of part.rows)this.releaseRow(id,reason);this.notify();
  }
  discardAll(){if(this.active)this.cancel();for(const p of this.parts)this.releasePart(p.number,'discarded');for(const r of this.rows)this.releaseRow(r.id,'discarded');}
  report(){return {schema:'photo-markers-run-v1',runId:this.id,createdAt:this.created,reportedAt:new Date().toISOString(),captured:this.captured,
    retainedBytes:this.retained,peakAccountedBytes:this.peak,budgetBytes:this.budget,message:this.message,
    rows:this.rows.map(({job,bytes,url,...row})=>row),parts:this.parts.map(({bytes,url,manifest,...part})=>part)};}
}
