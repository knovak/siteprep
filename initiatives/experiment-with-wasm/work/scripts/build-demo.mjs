import {readFile, writeFile, copyFile, mkdir, rm, mkdtemp, rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {renderMarkdown} from '../../../../scripts/initiatives.mjs';

const work = fileURLToPath(new URL('..', import.meta.url));
const initiative = fileURLToPath(new URL('../..', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const read = name => readFile(join(work, name), 'utf8');

const bookmark = JSON.parse(await read('dist/build.json'));
const tide = JSON.parse(await read('tide-here/dist/build.json'));
const snapshots = JSON.parse(await read('demo-src/applications.json'));
const applications = [
  {name:'Bookmark Sorter',slug:'bookmark-sorter',directory:'dist',manifest:bookmark,bytes:bookmark.html_bytes,hash:bookmark.html_sha256},
  {name:'Tide Here',slug:'tide-here',directory:'tide-here/dist',manifest:tide,bytes:tide.htmlBytes,hash:tide.htmlSha256}
];
for (const app of applications) {
  const html = await readFile(join(work,app.directory,'index.html'));
  if (html.length !== app.bytes || sha(html) !== app.hash) throw new Error(`${app.name}: rebuild the application before packaging the demo.`);
}
const wish = await readFile(join(initiative,'wish.md'),'utf8');
const lead = wish.split(/\n\s*\n/).find(part=>part.trim() && !part.startsWith('#'));
if (!lead) throw new Error('The initiative wish has no text.');
const findings = await readFile(join(initiative,'findings.md'),'utf8');
const headings = [{id:'the-original-wish',title:'The original wish'}];
let findingsHtml = renderMarkdown(findings.replace(/^# .+\n/,''));
findingsHtml = findingsHtml.replace(/<h3>([^<]+)<\/h3>/g, (_,title)=>{
  const id = title.toLowerCase().replace(/&[^;]+;/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  headings.push({id,title}); return `<h2 id="${id}">${title}</h2>`;
}).replaceAll('<table>','<div class="table-scroll" role="region" aria-label="Comparison table" tabindex="0"><table>').replaceAll('</table>','</table></div>');
const replacements = {
  BOOKMARK_MB:(bookmark.html_bytes/1e6).toFixed(1), TIDE_MB:(tide.htmlBytes/1e6).toFixed(1),
  COASTAL_POINTS:tide.coastalPoints.toLocaleString('en-US'), WISH_LEAD:escape(lead.trim()),
  WISH:renderMarkdown(wish.replace(/^# Wish\s*\n/,'')), FINDINGS:findingsHtml,
  CONTENTS:'<ul>'+headings.map(h=>`<li><a href="#${h.id}">${h.title}</a></li>`).join('')+'</ul>'
};
const stage = await mkdtemp(join(work,'.site-staging-'));
try {
  for (const page of ['index.html','findings.html']) {
    let html = await read('demo-src/'+page);
    html = html.replace(/\{\{([A-Z_]+)\}\}/g, (_,key)=>{
      if (!(key in replacements)) throw new Error('Unknown template value: '+key);
      return replacements[key];
    });
    await writeFile(join(stage,page),html);
  }
  await copyFile(join(work,'demo-src/styles.css'),join(stage,'styles.css'));
  await copyFile(join(work,'demo-src/prompts.txt'),join(stage,'prompts.txt'));
  for (const document of ['wish','findings','evaluation','verification']) await copyFile(join(initiative,document+'.md'),join(stage,document+'.txt'));
  const provenance = {schema:'experiment-with-wasm/demo/v1',repository:'https://github.com/knovak/siteprep',
    sourceInitiative:'experiment-with-wasm',sourceArtifact:'work/site',
    note:'Static release snapshot. Application HTML is copied byte for byte. Source initiative names, relative artifact names and commits identify provenance; they are not runtime dependencies.',
    applications:[]};
  for (const app of applications) {
    await mkdir(join(stage,app.slug));
    for (const file of ['index.html','build.json']) await copyFile(join(work,app.directory,file),join(stage,app.slug,file));
    const sourceArtifact = `work/${app.directory}/index.html`;
    const snapshot = snapshots[app.slug];
    const commit = snapshot?.sourceCommit;
    if (!/^[0-9a-f]{40}$/.test(commit || '') || snapshot.sha256 !== app.hash) throw new Error('Record the committed application snapshot before packaging it.');
    const fork = JSON.parse(await readFile(join(initiative,app.slug==='tide-here'?'work/tide-here/fork-provenance.json':'fork-provenance.json'),'utf8'));
    // Published metadata identifies each initiative without pointing back into its mutable tree.
    fork.sourceInitiative = app.slug;
    fork.sourceArtifact = 'work';
    delete fork.source_directory;
    delete fork.sourceDirectory;
    provenance.applications.push({name:app.name,path:app.slug+'/index.html',sourceArtifact,sourceCommit:commit,bytes:app.bytes,sha256:app.hash,fork});
  }
  await copyFile(join(work,'dist/SQLJS-LICENSE.txt'),join(stage,'bookmark-sorter/SQLJS-LICENSE.txt'));
  await copyFile(join(work,'tide-here/vendor/THIRD-PARTY-LICENSES.txt'),join(stage,'tide-here/THIRD-PARTY-LICENSES.txt'));
  await copyFile(join(work,'tide-here/data/AVISO-LICENSE.pdf'),join(stage,'tide-here/AVISO-LICENSE.pdf'));
  await writeFile(join(stage,'provenance.json'),JSON.stringify(provenance,null,2)+'\n');
  await rm(join(work,'site'),{recursive:true,force:true});
  await rename(stage,join(work,'site'));
} finally { await rm(stage,{recursive:true,force:true}); }
console.log('Packaged the demo landing page, complete wish, findings and both standalone applications.');
