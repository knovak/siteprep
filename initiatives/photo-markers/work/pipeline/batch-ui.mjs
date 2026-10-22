import { ExportPipeline, captureRun } from './client.mjs';
import { defaults } from './settings.mjs';
import { columns, parseCSV, reviewRows, settingsFile, limits } from './csv.mjs';
import { BatchRun } from './batch.mjs';
const $=id=>document.getElementById(id);
const detected=captureRun();
let imported=null,selected=null,ready=false,revision=0,frozenRevision=0,fontSequence=0,previewSequence=0,view=[];
const fonts=['noto-bold'];let auxiliaryURL=null;
const pipeline=new ExportPipeline({onProgress:({stage,rowId})=>{if(batch.active)$('batch-progress').textContent=`Record ${rowId}: ${stage}…`;}});
const batch=new BatchRun(pipeline,{onChange:renderOutput});
const labels={shape:'Shape',size:'Image side (256–4096)',timezone:'Timezone',font:'Font key',outline_width:'Outline width (auto / 0–64)',background_color:'Background',shape_color:'Ring / star',center_color:'Center',text_color:'Title color',outline_color:'Outline color'};
for(const key of [...Object.keys(defaults).filter(k=>k!=='title'),'timezone']){
  const wrap=document.createElement('div'),label=document.createElement('label');label.htmlFor=`batch-${key}`;label.textContent=labels[key];
  const input=document.createElement(key==='shape'?'select':'input');input.id=`batch-${key}`;input.name=key;
  if(key==='shape')for(const value of ['donut','star','solid'])input.append(new Option(value,value));
  input.value=key==='timezone'?detected.timezone:defaults[key];
  if(key==='size'){input.type='number';input.min=256;input.max=4096;}
  if(key==='timezone'){input.setAttribute('list','batch-zones');const list=document.createElement('datalist');list.id='batch-zones';let zones=[];try{zones=Intl.supportedValuesOf('timeZone');}catch{}for(const zone of new Set(['UTC',detected.timezone,...zones]))list.append(new Option(zone,zone));wrap.append(list);}
  wrap.append(label,input);$('default-fields').append(wrap);
}
if(detected.fallback)$('batch-timezone').setAttribute('aria-description','Timezone detection failed. Using UTC.');
for(const key of columns)$('edit-field').append(new Option(key,key));
function shared(){return Object.fromEntries(new FormData($('batch-defaults')));}
function error(e){$('batch-error').hidden=false;$('batch-error').textContent=e.message;$('batch-error').focus();}
function clearError(){$('batch-error').hidden=true;$('batch-error').textContent='';}
function downloadText(name,text,type='application/json'){
  // Only one small auxiliary settings/report/template Blob is retained.
  if(auxiliaryURL)URL.revokeObjectURL(auxiliaryURL);
  auxiliaryURL=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=auxiliaryURL;a.download=name;a.click();
}
function button(label,handler,disabled=false){const b=document.createElement('button');b.type='button';b.textContent=label;b.className='secondary';b.disabled=disabled;b.addEventListener('click',()=>{clearError();Promise.resolve().then(handler).catch(error);});return b;}
function controls(){
  $('batch-generate').disabled=!ready||batch.active||!imported||!view.some(r=>!r.excluded)||view.some(r=>!r.excluded&&r.error);
  $('batch-cancel').hidden=!batch.active;
  for(const id of ['batch-resume','batch-package','discard-all','run-report'])$(id).disabled=batch.active||!batch.id;
  $('export-settings').disabled=!imported;
  $('batch-local-font').disabled=!ready||batch.active;
  for(const id of ['csv-file','import-text'])$(id).disabled=batch.active||!!batch.retained;
}
function review(){
  revision++;previewSequence++;
  if(!imported){controls();return;}
  view=reviewRows(imported.rows,shared(),{fonts});
  $('review-summary').textContent=`${view.filter(r=>!r.excluded&&!r.error).length} valid · ${view.filter(r=>!r.excluded&&r.error).length} need correction · ${view.filter(r=>r.excluded).length} excluded`;
  const nodes=view.map(row=>{
    const b=button(`${row.id} · ${row.input.title||'Untitled'} · ${row.excluded?'Excluded':row.error?'Needs correction':row.settings.shape}` ,()=>select(row.id));
    b.dataset.record=row.id;b.classList.toggle('selected',row.id===selected);b.setAttribute('aria-pressed',String(row.id===selected));
    const detail=document.createElement('span');detail.className='hint';detail.textContent=row.error||`${row.filename} · ${row.settings.timestamp.local} ${row.settings.timestamp.offset} · ${row.settings.timestamp.timezone}`;b.append(document.createElement('br'),detail);return b;
  });$('review-list').replaceChildren(...nodes);
  if(selected)select(selected);controls();renderOutput();
}
async function select(id){
  selected=id;const row=view.find(r=>r.id===id);if(!row)return;
  for(const node of $('review-list').children){node.classList.toggle('selected',node.dataset.record===id);node.setAttribute('aria-pressed',String(node.dataset.record===id));}
  $('row-detail').hidden=false;$('detail-id').textContent=id;
  $('detail-summary').textContent=`Source line ${row.line}. ${row.excluded?'Excluded. ':''}${row.error||`${row.filename} · ${row.settings.timestamp.local} ${row.settings.timestamp.offset} · ${row.settings.timestamp.timezone}`}${row.choices?.length?' Choices: '+row.choices.map(t=>`${t.occurrence}: ${t.offset} (${t.instant})`).join('; '):''}`;
  $('exclude').textContent=row.excluded?'Restore record':'Exclude record';
  $('row-settings').textContent=JSON.stringify({effective:row.settings||row.input,CSV:row.values,edits:row.edits,unused:row.unused||[]},null,2);editValue();
  const seq=++previewSequence;$('row-preview').hidden=true;
  if(!ready||batch.active||row.error){$('row-preview-status').textContent=row.error||'Preview available when generation is idle.';return;}
  $('row-preview-status').textContent='Preparing draft…';
  try{const {image}=await pipeline.preview(row.settings);if(seq!==previewSequence||batch.active)return;$('row-preview').getContext('2d').putImageData(image,0,0);$('row-preview').hidden=false;$('row-preview-status').textContent='Draft · provisional time and settings, not a verified JPEG.';}
  catch(e){if(seq===previewSequence)$('row-preview-status').textContent=e.message;}
}
function editValue(){const row=imported?.rows.find(r=>r.id===selected);if(!row)return;const field=$('edit-field').value;$('edit-value').value=Object.hasOwn(row.edits,field)?row.edits[field]:row.values[field]||'';}
function importSource(source){
  clearError();if(batch.active||batch.retained)throw Error('Save or discard retained output before replacing the imported list.');
  const next=parseCSV(source);imported=next;selected=next.rows[0].id;
  $('import-summary').textContent=`${next.rows.length} records imported · ${next.ignored} physical empty lines ignored. Record IDs stay fixed.`;review();
}
function renderOutput(){
  controls();if(!batch.id)return;
  $('batch-progress').textContent=batch.active?`Record ${batch.current||'…'} · ${batch.rows.filter(r=>r.status==='verified').length}/${batch.rows.filter(r=>r.status!=='excluded').length} verified`:batch.message;
  $('run-summary').textContent=`Frozen run ${batch.id} · captured ${batch.captured.now}${revision===frozenRevision?'':' · Previous settings: current review edits belong to a new run.'}`;
  $('budget-summary').textContent=`Retained ${(batch.retained/1024/1024).toFixed(2)} / 50 MiB · peak accounted ${(batch.peak/1024/1024).toFixed(2)} MiB, including reservations.`;
  $('part-list').replaceChildren(...batch.parts.map(part=>{
    const wrap=document.createElement('div');wrap.className='inset part';const text=document.createElement('p');text.textContent=`Part ${part.number} · ${part.rows.length} JPEGs · ${(part.size/1024).toFixed(1)} KiB · ${part.availability}`;wrap.append(text);
    for(const [label,action]of [['Download ZIP',()=>fileDownload(part,'application/zip')],['I saved this part — release copies',()=>batch.releasePart(part.number,'user reported saving')],['Discard part',()=>batch.releasePart(part.number,'discarded')]])wrap.append(button(label,action,batch.active||!part.bytes));
    wrap.dataset.part=part.number;return wrap;
  }));
  $('output-list').replaceChildren(...batch.rows.map(row=>{
    const wrap=document.createElement('div');wrap.className='output-row';wrap.dataset.output=row.id;
    const text=document.createElement('p');text.textContent=`${row.id} · ${row.filename||'Excluded invalid record'} · ${row.status} · ${row.availability}${row.part?' · part '+row.part:''}${row.error?' · '+row.error:''}`;wrap.append(text);
    if(['failed','cancelled'].includes(row.status)){const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.value=row.id;check.checked=true;check.name='retry-row';label.append(check,document.createTextNode(' Retry this frozen record'));wrap.append(label);}
    if(row.status==='verified'){
      wrap.append(button('Download JPEG',()=>fileDownload(row,'image/jpeg'),batch.active||!row.bytes));
      if(row.bytes)wrap.append(button('I saved this JPEG — release copy',()=>batch.releaseRow(row.id,'user reported saving'),batch.active),button('Discard JPEG',()=>batch.releaseRow(row.id,'discarded'),batch.active));
    }
    return wrap;
  }));
}
function fileDownload(item,type){const a=document.createElement('a');a.href=batch.downloadURL(item,type);a.download=item.filename;a.click();renderOutput();}
async function prepare(){
  $('batch-prepare').hidden=true;clearError();
  try{await pipeline.ready();ready=true;$('batch-runtime').textContent='Ready · local image tools and bundled font loaded';review();}
  catch(e){ready=false;$('batch-runtime').textContent=e.message;$('batch-prepare').hidden=false;}
  controls();
}
$('batch-defaults').addEventListener('submit',e=>e.preventDefault());
$('batch-defaults').addEventListener('input',review);
$('edit-field').addEventListener('change',editValue);
$('apply-edit').addEventListener('click',()=>{const row=imported?.rows.find(r=>r.id===selected);if(row){row.edits[$('edit-field').value]=$('edit-value').value;review();}});
$('inherit').addEventListener('click',()=>{const row=imported?.rows.find(r=>r.id===selected);if(row){delete row.edits[$('edit-field').value];review();}});
$('exclude').addEventListener('click',()=>{const row=imported?.rows.find(r=>r.id===selected);if(row){row.excluded=!row.excluded;review();}});
$('import-text').addEventListener('click',()=>{try{importSource($('csv-text').value);}catch(e){error(e);}});
$('csv-file').addEventListener('change',async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>limits.csv)throw Error('CSV exceeds 1 MiB. Split the file.');importSource(new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer()));}catch(e){error(e);}finally{e.target.value='';}});
$('template').addEventListener('click',()=>downloadText('photo-markers-template.csv','title,date,time,timezone,occurrence,shape,filename\nA new chapter,2026-10-22,,Australia/Brisbane,,donut,chapter\n,,,,,solid,\n','text/csv'));
$('export-settings').addEventListener('click',()=>downloadText('photo-markers-settings.json',settingsFile(imported.rows,shared())));
$('batch-generate').addEventListener('click',async()=>{clearError();try{previewSequence++;batch.start(imported.rows,shared(),fonts);frozenRevision=revision;await batch.process();}catch(e){error(e);}});
$('batch-cancel').addEventListener('click',()=>batch.cancel());
$('batch-resume').addEventListener('click',async()=>{clearError();const ids=[...document.querySelectorAll('[name=retry-row]:checked')].map(n=>n.value);await batch.process(ids);});
$('batch-package').addEventListener('click',async()=>{clearError();try{await batch.packageAvailable();}catch(e){error(e);}renderOutput();});
$('run-report').addEventListener('click',()=>downloadText(`markers-${batch.id}-report.json`,JSON.stringify(batch.report(),null,2)));
$('discard-all').addEventListener('click',()=>batch.discardAll());
$('batch-prepare').addEventListener('click',prepare);
$('batch-local-font').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>16*1024*1024)throw Error('Font exceeds 16 MiB.');ready=false;controls();const key=`local-${++fontSequence}`;await pipeline.loadFont(key,await file.arrayBuffer());fonts.push(key);$('font-keys').textContent=`Loaded keys: ${fonts.join(', ')}`;$('batch-font').value=key;review();}catch(e){error(e);}finally{e.target.value='';ready=true;controls();}});
window.addEventListener('pagehide',e=>{if(!e.persisted){batch.discardAll();pipeline.close();if(auxiliaryURL)URL.revokeObjectURL(auxiliaryURL);}});
prepare();
