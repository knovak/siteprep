import {execFile as execFileCallback} from 'node:child_process';
import {access, mkdir, writeFile} from 'node:fs/promises';
import {dirname, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

import {resolveDating} from './dating.mjs';
import {resolveRepositoryFacts} from './facts.mjs';
import {compileSections, loadSections} from './sections.mjs';

const execFile = promisify(execFileCallback);
const SOURCE_LINK = /\[([^\]]+)\]\(source:([^)]+)\)/g;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function normaliseRepositoryUrl(value) {
  const trimmed = value.trim().replace(/\.git$/, '');
  if (/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(trimmed)) return trimmed;
  const ssh = trimmed.match(/^git@github\.com:([\w.-]+\/[\w.-]+)$/);
  if (ssh) return `https://github.com/${ssh[1]}`;
  throw new Error(`Unsupported GitHub origin: ${value.trim()}`);
}

async function gitValue(root, args) {
  const {stdout} = await execFile('git', ['-C', root, ...args]);
  return stdout.trim();
}

function sourceHref(repositoryUrl, sha, path) {
  return `${repositoryUrl}/blob/${sha}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

function renderInline(value, context) {
  const links = [];
  const held = value.replace(SOURCE_LINK, (_, label, path) => {
    const marker = `\u0000SOURCE${links.length}\u0000`;
    links.push({label, path});
    return marker;
  });
  let rendered = escapeHtml(held)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  links.forEach(({label, path}, index) => {
    const marker = `\u0000SOURCE${index}\u0000`;
    const href = sourceHref(context.repositoryUrl, context.sha, path);
    const link = `<a href="${escapeHtml(href)}" data-source-path="${escapeHtml(path)}">${escapeHtml(label)}</a>`;
    rendered = rendered.replace(marker, link);
  });
  return rendered;
}

function renderMarkdown(markdown, context) {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n');
  const output = [];
  let paragraph = [];
  let list = [];
  let quote = [];

  const flushParagraph = () => {
    if (paragraph.length) output.push(`<p>${renderInline(paragraph.join(' '), context)}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) output.push(`<ul>${list.map(item => `<li>${renderInline(item, context)}</li>`).join('')}</ul>`);
    list = [];
  };
  const flushQuote = () => {
    if (quote.length) output.push(`<blockquote>${renderInline(quote.join(' '), context)}</blockquote>`);
    quote = [];
  };
  const flush = () => { flushParagraph(); flushList(); flushQuote(); };

  for (const line of lines) {
    if (!line.trim()) { flush(); continue; }
    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      flush();
      const level = Math.min(4, heading[1].length + 1);
      output.push(`<h${level}>${renderInline(heading[2], context)}</h${level}>`);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph(); flushQuote(); list.push(bullet[1]); continue;
    }
    const quoted = line.match(/^>\s?(.*)$/);
    if (quoted) {
      flushParagraph(); flushList(); quote.push(quoted[1]); continue;
    }
    flushList(); flushQuote(); paragraph.push(line.trim());
  }
  flush();
  return output.join('\n');
}

function pdfPanel(dating) {
  const items = dating.pdfs.length
    ? dating.pdfs.map(pdf => `<li data-pdf-id="${escapeHtml(pdf.id)}" data-possibly-stale="${pdf.possibly_stale}">
        <a href="${escapeHtml(pdf.link)}"><strong>${escapeHtml(pdf.label)}</strong></a>
        <span class="pdf-dates">Refreshed ${escapeHtml(pdf.refreshed)} · sources changed ${escapeHtml(pdf.source_date)}</span>
        ${pdf.possibly_stale ? '<mark>Possibly stale</mark>' : ''}
      </li>`).join('')
    : '<li class="pdf-empty">No hand-made PDFs are linked yet.</li>';
  return `<aside class="pdf-panel" aria-labelledby="pdf-heading">
    <div><p class="eyebrow">Portable copies</p><h2 id="pdf-heading">PDFs on Google Drive</h2></div>
    <ul>${items}</ul>
  </aside>`;
}

function descriptionHtml({sections, generatedDate, sha, repositoryUrl, dating}) {
  const context = {sha, repositoryUrl};
  const cards = sections.map(section => `
    <section id="${escapeHtml(section.id)}" data-audience="${escapeHtml(section.audience)}">
      <aside class="audience" aria-label="Audience">${escapeHtml(section.audience)}</aside>
      <div class="section-copy">
        <h2>${escapeHtml(section.title)}</h2>
        ${renderMarkdown(section.pageText, context)}
      </div>
    </section>`).join('');
  const navigation = sections.map(section => `<a href="#${escapeHtml(section.id)}">${escapeHtml(section.title)}</a>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>How work moves through this repository</title>
  <style>
    :root { color-scheme: light; font: 17px/1.58 ui-sans-serif, system-ui, sans-serif; color: #172033; background: #f2f5fa; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    a { color: #1647a5; text-underline-offset: .18em; }
    .hero { padding: 72px max(24px, calc((100vw - 1100px) / 2)) 48px; color: white; background: linear-gradient(135deg, #102452, #2551ad 65%, #5075cc); }
    .eyebrow { margin: 0 0 10px; color: #c8d6ff; font-size: .78rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
    h1 { max-width: 900px; margin: 0; font-size: clamp(2.6rem, 7vw, 5.5rem); line-height: .98; letter-spacing: -.055em; }
    .lede { max-width: 720px; margin: 24px 0 0; color: #e7ecff; font-size: 1.15rem; }
    nav { display: flex; gap: 8px; overflow-x: auto; padding: 16px max(24px, calc((100vw - 1100px) / 2)); border-bottom: 1px solid #d9dfeb; background: rgba(255,255,255,.96); position: sticky; top: 0; z-index: 4; }
    nav a { flex: 0 0 auto; padding: 7px 10px; border-radius: 999px; background: #edf2ff; font-size: .78rem; font-weight: 700; text-decoration: none; }
    main { width: min(1100px, calc(100% - 32px)); margin: 32px auto 70px; display: grid; gap: 18px; }
    .pdf-panel { display: grid; grid-template-columns: minmax(190px, .38fr) 1fr; gap: 28px; padding: 28px 34px; border-radius: 20px; color: white; background: #102452; }
    .pdf-panel .eyebrow { margin-bottom: 4px; }
    .pdf-panel h2 { margin: 0; color: white; font-size: 1.45rem; }
    .pdf-panel ul { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
    .pdf-panel li { display: grid; grid-template-columns: 1fr auto; gap: 2px 16px; align-items: center; padding: 12px 14px; border-radius: 12px; color: #dfe7fa; background: #ffffff12; }
    .pdf-panel a { color: white; }
    .pdf-dates { grid-column: 1; color: #becbec; font-size: .78rem; }
    .pdf-panel mark { grid-column: 2; grid-row: 1 / span 2; padding: 4px 7px; border-radius: 999px; color: #5d3100; background: #ffd982; font-size: .72rem; font-weight: 850; text-transform: uppercase; }
    .pdf-panel .pdf-empty { display: block; color: #c9d5ef; }
    section { display: grid; grid-template-columns: 115px minmax(0, 1fr); gap: 26px; padding: 34px; border: 1px solid #dce2ed; border-radius: 20px; background: white; box-shadow: 0 10px 30px #2637570d; scroll-margin-top: 82px; }
    .audience { align-self: start; padding: 5px 8px; border-radius: 999px; color: #31508d; background: #edf2ff; font-size: .72rem; font-style: normal; font-weight: 850; letter-spacing: .07em; text-align: center; text-transform: uppercase; }
    h2 { margin: 0 0 18px; color: #17397f; font-size: clamp(1.6rem, 3vw, 2.2rem); line-height: 1.12; letter-spacing: -.025em; }
    h3, h4 { color: #263e6d; }
    p:first-of-type { margin-top: 0; }
    p:last-child { margin-bottom: 0; }
    li + li { margin-top: 8px; }
    blockquote { margin: 20px 0; padding: 16px 20px; border-left: 4px solid #6b8bd3; background: #f5f7fd; color: #394969; }
    code { padding: 2px 5px; border-radius: 5px; background: #eef1f7; font-size: .88em; }
    footer { padding: 28px max(24px, calc((100vw - 1100px) / 2)); border-top: 1px solid #d9dfeb; color: #566078; background: white; font-size: .85rem; }
    footer strong { color: #263e6d; }
    @media (max-width: 700px) { .hero { padding-top: 48px; } .pdf-panel, section { grid-template-columns: 1fr; padding: 24px; } .audience { justify-self: start; } }
  </style>
</head>
<body>
  <header class="hero">
    <p class="eyebrow">Repo guide · generated from live sources</p>
    <h1>How work moves through this repository</h1>
    <p class="lede">A short way into the lifecycle, the division of labour, and the files that remain authoritative.</p>
  </header>
  <nav aria-label="Guide sections">${navigation}</nav>
  <main>${pdfPanel(dating)}${cards}
  </main>
  <footer data-generated-date="${escapeHtml(generatedDate)}" data-source-sha="${escapeHtml(sha)}">
    Generated <strong>${escapeHtml(generatedDate)}</strong> from source commit
    <a href="${escapeHtml(`${repositoryUrl}/tree/${sha}`)}"><strong>${escapeHtml(sha)}</strong></a>.
    Authored explanation is dated; linked values are resolved from that commit.
  </footer>
</body>
</html>\n`;
}

function sourcePaths(sections) {
  const paths = [];
  for (const section of sections) {
    for (const match of section.pageText.matchAll(SOURCE_LINK)) paths.push(match[2]);
  }
  return [...new Set(paths)];
}

export async function generateDescription({root, outputPath, now = new Date(), sha, repositoryUrl, dating} = {}) {
  if (!root || !outputPath) throw new Error('root and outputPath are required');
  const contentDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../content');
  const facts = await resolveRepositoryFacts(root);
  const compiled = compileSections(await loadSections(contentDirectory), facts);
  const resolvedSha = sha || await gitValue(root, ['rev-parse', '--short=12', 'HEAD']);
  const resolvedRepository = repositoryUrl || normaliseRepositoryUrl(await gitValue(root, ['remote', 'get-url', 'origin']));
  const generatedDate = new Date(now).toISOString().slice(0, 10);
  const guideRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const resolvedDating = dating || await resolveDating({root, guideRoot});
  const sources = sourcePaths(compiled.sections);
  for (const path of sources) {
    if (path.startsWith('/') || path.split('/').includes('..')) throw new Error(`Unsafe source link: ${path}`);
    await access(resolve(root, path));
  }
  const html = descriptionHtml({sections: compiled.sections, generatedDate, sha: resolvedSha, repositoryUrl: resolvedRepository, dating: resolvedDating});
  await mkdir(dirname(outputPath), {recursive: true});
  await writeFile(outputPath, html, 'utf8');
  return {
    output: outputPath,
    generated_date: generatedDate,
    sha: resolvedSha,
    sections: compiled.sections.length,
    source_paths: sources,
    metrics: compiled.metrics,
    diagnostics: compiled.diagnostics,
    dating: resolvedDating,
  };
}

export async function runDescriptionBrowserChecks({root, outputPath} = {}) {
  const guideRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const playwright = resolve(root, 'node_modules', '.bin', 'playwright');
  const config = resolve(guideRoot, 'test', 'playwright.config.mjs');
  const {stdout, stderr} = await execFile(playwright, ['test', '--config', config], {
    cwd: root,
    env: {...process.env, GUIDE_REPO_ROOT: root, GUIDE_DESCRIPTION_PATH: outputPath},
  });
  return {stdout, stderr};
}

export function relativeOutput(root, outputPath) {
  return relative(root, outputPath);
}
