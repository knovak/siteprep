import { captureRun, defaults, resolveSettings } from './settings.mjs';
import { filenameFor } from './filenames.mjs';
export const columns = Object.freeze(['title','date','time','timezone','occurrence','shape',
  'background_color','shape_color','center_color','text_color','outline_color','size','font','outline_width','filename']);
export const limits = Object.freeze({csv: 1024*1024, rows:100, payload:25*1024*1024, retained:50*1024*1024});
const blank = value => value == null || !String(value).trim();
export function parseCSV(source) {
  if (new TextEncoder().encode(source).length > limits.csv) throw Error('CSV exceeds 1 MiB. Split the file.');
  source = source.replace(/^\uFEFF/, '');
  const records = []; let fields=[], field='', quoted=false, closed=false, touched=false;
  let line=1, start=1, ignored=0;
  const fail = message => { throw Error(`Source line ${line}, column ${fields.length+1}: ${message}`); };
  const finish = () => {
    fields.push(field);
    if (touched) records.push({fields, line:start}); else ignored++;
    fields=[]; field=''; closed=false; touched=false; start=line+1;
  };
  for (let i=0; i<source.length; i++) {
    const ch=source[i];
    if (quoted) {
      if (ch==='"') { if (source[i+1]==='"') {field+='"'; i++;} else {quoted=false;closed=true;} }
      else { field+=ch; if(ch==='\n') line++; else if(ch==='\r' && source[i+1]!=='\n') line++; }
    } else if (ch===',') { touched=true; fields.push(field); field=''; closed=false; }
    else if (ch==='\r' || ch==='\n') { finish(); if(ch==='\r' && source[i+1]==='\n') i++; line++; start=line; }
    else if (ch==='"') { if(field || closed) fail('Unexpected quote.'); quoted=true;touched=true; }
    else { if(closed) fail('Only a comma or record ending may follow a closing quote.'); field+=ch;touched=true; }
  }
  if(quoted) fail('Quoted field is not closed.');
  if(touched || fields.length || field || closed) finish();
  if(records.length<2) throw Error('Supply a header and at least one data record. A blank-cell record can be written as "".');
  const headers=records.shift().fields;
  if(new Set(headers).size!==headers.length) throw Error('Duplicate CSV header.');
  for(const h of headers) if(!columns.includes(h)) throw Error(`Unknown header ${JSON.stringify(h)}. Use exact lower-case column names.`);
  if(records.length>limits.rows) throw Error('CSV exceeds 100 records. Split the file.');
  const rows=records.map((r,index)=>{
    if(r.fields.length!==headers.length) throw Error(`Record ${index+1}, source line ${r.line}: expected ${headers.length} columns, found ${r.fields.length}.`);
    return {id:String(index+1).padStart(4,'0'),line:r.line,values:Object.fromEntries(headers.map((h,j)=>[h,r.fields[j]])),edits:{},excluded:false};
  });
  return {headers, rows, ignored};
}
export function effectiveInput(row, shared) {
  const input={...defaults, timezone:shared.timezone};
  for(const key of Object.keys(defaults)) if(key!=='title' && !blank(shared[key])) input[key]=shared[key];
  // Title and wall time always start blank, independently of the single-image editor.
  for(const [key,value] of Object.entries(row.values)) if(key!=='filename' && !blank(value)) input[key]=key==='title'?value:String(value).trim();
  for(const [key,value] of Object.entries(row.edits)) if(key!=='filename') {
    if(blank(value) && !['title','date','time','occurrence'].includes(key))continue;
    input[key]=key==='title'?value:String(value).trim();
  }
  return input;
}
export function reviewRows(rows, shared, {run=captureRun(),fonts=['noto-bold']}={}) {
  return rows.map(row=>{
    const input=effectiveInput(row,shared);
    try {
      const settings=resolveSettings(input,run);
      if(!fonts.includes(settings.font)) throw Error(`Font ${settings.font} is not loaded. Load that font in this session or choose a bundled key.`);
      const preferred=Object.hasOwn(row.edits,'filename')?row.edits.filename:row.values.filename;
      const filename=filenameFor({...settings,title:blank(preferred)?settings.title:preferred.trim()},row.id);
      const unused=[];
      if(settings.shape==='solid') unused.push('shape_color','center_color');
      else if(settings.shape==='star') unused.push('center_color');
      if(blank(settings.title)) unused.push('font','text_color','outline_color','outline_width');
      if(!blank(input.occurrence) && !settings.timestamp.occurrence) unused.push('occurrence');
      return {...row,input,settings,filename,unused,error:null};
    } catch(error) {return {...row,input,error:error.message,choices:error.details?.choices||[]};}
  });
}
export function settingsFile(rows,shared) {
  return JSON.stringify({schema:'photo-markers-settings-v1',defaults:shared,rows,
    notice:'Settings only; no JPEG bytes. Session-local font keys require reloading the original fonts.'},null,2);
}
