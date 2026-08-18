import {execFile as execFileCallback} from 'node:child_process';
import {access, mkdir, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

import {resolveRepositoryFacts} from './facts.mjs';
import {compileSections, loadSections} from './sections.mjs';

const execFile = promisify(execFileCallback);
const SOURCE_LINK = /\[([^\]]+)\]\(source:([^)]+)\)/g;
export const MIN_SLIDES = 10;
export const MAX_SLIDES = 20;
export const MAX_SLIDE_WORDS = 90;

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
    rendered = rendered.replace(marker, `<a href="${escapeHtml(href)}" data-source-path="${escapeHtml(path)}">${escapeHtml(label)}</a>`);
  });
  return rendered;
}

function renderMarkdown(markdown, context) {
  const output = [];
  let paragraph = [];
  let list = [];
  const flushParagraph = () => {
    if (paragraph.length) output.push(`<p>${renderInline(paragraph.join(' '), context)}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) output.push(`<ul>${list.map(item => `<li>${renderInline(item, context)}</li>`).join('')}</ul>`);
    list = [];
  };
  for (const line of markdown.replaceAll('\r\n', '\n').split('\n')) {
    if (!line.trim()) { flushParagraph(); flushList(); continue; }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) { flushParagraph(); list.push(bullet[1]); continue; }
    flushList(); paragraph.push(line.trim());
  }
  flushParagraph(); flushList();
  return output.join('\n');
}

function words(value) {
  return value
    .replace(SOURCE_LINK, '$1')
    .replace(/[#*_`]/g, ' ')
    .match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) ?? [];
}

function plain(value) {
  return words(value).join(' ').toLocaleLowerCase('en-US');
}

function titleAndBody(section, markdown, index) {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n');
  const first = lines.findIndex(line => line.trim());
  const heading = first >= 0 ? lines[first].match(/^#{1,2}\s+(.+)$/) : null;
  if (!heading) {
    const suffix = index === 0 ? '' : ` — ${index + 1}`;
    return {title: `${section.slide_title}${suffix}`, body: markdown};
  }
  return {title: heading[1].trim(), body: [...lines.slice(0, first), ...lines.slice(first + 1)].join('\n').trim()};
}

export function flattenSlides(sections) {
  return sections
    .filter(section => section.slide)
    .flatMap(section => section.slideTexts.map((markdown, sectionSlideIndex) => ({
      section_id: section.id,
      section_order: section.order,
      audience: section.audience,
      section_title: section.title,
      section_slide_index: sectionSlideIndex,
      page_text: section.pageText,
      markdown,
      ...titleAndBody(section, markdown, sectionSlideIndex),
    })));
}

export function validateSlides(slides) {
  if (slides.length < MIN_SLIDES || slides.length > MAX_SLIDES) {
    throw new Error(`Deck must contain ${MIN_SLIDES}-${MAX_SLIDES} rendered slides; found ${slides.length}`);
  }
  for (const [index, slide] of slides.entries()) {
    const count = words(`${slide.title}\n${slide.body}`).length;
    if (count > MAX_SLIDE_WORDS) {
      throw new Error(`Slide ${index + 1} (${slide.section_id}) has ${count} words; limit is ${MAX_SLIDE_WORDS}`);
    }
    const page = plain(slide.page_text);
    const body = plain(slide.body);
    if (body && page.startsWith(body)) {
      throw new Error(`Slide ${index + 1} (${slide.section_id}) truncates the section page text`);
    }
  }
  return slides;
}

function sourcePaths(slides) {
  const paths = [];
  for (const slide of slides) {
    for (const match of slide.markdown.matchAll(SOURCE_LINK)) paths.push(match[2]);
  }
  return [...new Set(paths)];
}

function deckHtml({slides, generatedDate, sha, repositoryUrl}) {
  const context = {sha, repositoryUrl};
  const rendered = slides.map((slide, index) => `
    <article class="slide${index === 0 ? ' title-slide' : ''}" data-index="${index}" data-section-id="${escapeHtml(slide.section_id)}" data-audience="${escapeHtml(slide.audience)}" ${index === 0 ? '' : 'hidden'} aria-hidden="${index === 0 ? 'false' : 'true'}">
      <div class="slide-inner">
        <p class="section-label">${escapeHtml(slide.section_title)}</p>
        <h1>${renderInline(slide.title, context)}</h1>
        <div class="slide-copy">${renderMarkdown(slide.body, context)}</div>
        <footer>
          <span>${escapeHtml(slide.audience)}</span>
          <span>${escapeHtml(generatedDate)} · ${escapeHtml(sha)}</span>
        </footer>
      </div>
    </article>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>How work moves through this repository</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #172033; background: #10182d; }
    * { box-sizing: border-box; }
    body { min-width: 320px; min-height: 100vh; margin: 0; display: grid; place-items: center; overflow: hidden; background: radial-gradient(circle at 15% 15%, #2f4d8b 0, #172747 34%, #10182d 72%); }
    button { font: inherit; }
    #frame { width: min(100vw, calc(100vh * 16 / 9)); height: min(100vh, calc(100vw * 9 / 16)); position: relative; }
    #deck { position: absolute; inset: 0; overflow: hidden; background: #f5f1e8; box-shadow: 0 28px 80px #0008; }
    .slide { position: absolute; inset: 0; background: linear-gradient(115deg, #fbf8f1 0 73%, #dfe8ff 73% 100%); }
    .slide::after { content: ''; position: absolute; right: 0; top: 0; width: 2.2%; height: 100%; background: #ff6a3d; }
    .slide[hidden] { display: none; }
    .slide-inner { height: 100%; padding: 7.5% 10% 6.5%; display: flex; flex-direction: column; }
    .section-label { margin: 0 0 2.4%; color: #49608f; font-size: clamp(11px, 1.25vw, 20px); font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    h1 { max-width: 88%; margin: 0; color: #152b56; font-size: clamp(32px, 4.05vw, 65px); line-height: 1.02; letter-spacing: -.045em; text-wrap: balance; }
    .slide-copy { max-width: 80%; margin-top: 4.2%; color: #2c3446; font-size: clamp(17px, 1.72vw, 28px); line-height: 1.38; }
    .slide-copy p { margin: 0; }
    .slide-copy p + p, .slide-copy ul + p { margin-top: .75em; }
    .slide-copy ul { margin: 0; padding-left: 1.15em; }
    .slide-copy li + li { margin-top: .35em; }
    a { color: #214f9d; text-underline-offset: .16em; }
    code { padding: .08em .28em; border-radius: .22em; color: #823419; background: #ffe2d7; font-size: .88em; }
    footer { margin-top: auto; padding-top: 2.2%; display: flex; justify-content: space-between; border-top: 1px solid #bfc9db; color: #5b6578; font-size: clamp(10px, .92vw, 15px); letter-spacing: .04em; text-transform: uppercase; }
    .title-slide { background: linear-gradient(125deg, #132b5c 0 73%, #ff6a3d 73% 100%); }
    .title-slide::after { display: none; }
    .title-slide .slide-inner { justify-content: center; padding-right: 18%; }
    .title-slide .section-label, .title-slide footer { color: #b9c9e9; border-color: #516a9a; }
    .title-slide h1 { color: white; font-size: clamp(44px, 5.7vw, 91px); }
    .title-slide .slide-copy { max-width: 70%; color: #e5ebf8; font-size: clamp(19px, 2vw, 32px); }
    #controls { position: absolute; left: 0; right: 0; bottom: 1.5%; z-index: 3; display: flex; justify-content: center; align-items: center; gap: 1.1em; color: #556177; font-size: clamp(10px, .9vw, 14px); }
    #controls button { border: 0; padding: .25em .45em; color: inherit; background: transparent; cursor: pointer; }
    #controls button:disabled { opacity: .3; cursor: default; }
    #progress { min-width: 5em; text-align: center; font-variant-numeric: tabular-nums; }
    @media (max-aspect-ratio: 4/3) { .slide-copy { max-width: 88%; } h1 { max-width: 92%; } }
  </style>
</head>
<body data-generated-date="${escapeHtml(generatedDate)}" data-source-sha="${escapeHtml(sha)}">
  <div id="frame">
    <main id="deck" aria-live="polite">${rendered}
    </main>
    <nav id="controls" aria-label="Slide navigation">
      <button id="previous" type="button" aria-label="Previous slide">←</button>
      <span id="progress" aria-label="Slide position">1 / ${slides.length}</span>
      <button id="next" type="button" aria-label="Next slide">→</button>
    </nav>
  </div>
  <script>
    (() => {
      const slides = [...document.querySelectorAll('.slide')];
      const previous = document.querySelector('#previous');
      const next = document.querySelector('#next');
      const progress = document.querySelector('#progress');
      let current = 0;
      function show(index) {
        current = Math.max(0, Math.min(slides.length - 1, index));
        slides.forEach((slide, slideIndex) => {
          const active = slideIndex === current;
          slide.hidden = !active;
          slide.setAttribute('aria-hidden', String(!active));
        });
        previous.disabled = current === 0;
        next.disabled = current === slides.length - 1;
        progress.textContent = (current + 1) + ' / ' + slides.length;
      }
      previous.addEventListener('click', () => show(current - 1));
      next.addEventListener('click', () => show(current + 1));
      document.addEventListener('keydown', event => {
        const forward = ['ArrowRight', 'PageDown'].includes(event.key) || (event.key === ' ' && !event.shiftKey);
        const back = ['ArrowLeft', 'PageUp'].includes(event.key) || (event.key === ' ' && event.shiftKey);
        if (forward) { event.preventDefault(); show(current + 1); }
        else if (back) { event.preventDefault(); show(current - 1); }
        else if (event.key === 'Home') { event.preventDefault(); show(0); }
        else if (event.key === 'End') { event.preventDefault(); show(slides.length - 1); }
      });
      window.deckState = {current: () => current, count: slides.length, show};
      show(0);
    })();
  </script>
</body>
</html>\n`;
}

export async function generateDeck({root, outputPath, now = new Date(), sha, repositoryUrl, sections} = {}) {
  if (!root || !outputPath) throw new Error('root and outputPath are required');
  const contentDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../content');
  const facts = await resolveRepositoryFacts(root);
  const compiled = compileSections(sections ?? await loadSections(contentDirectory), facts);
  const slides = validateSlides(flattenSlides(compiled.sections));
  const resolvedSha = sha || await gitValue(root, ['rev-parse', '--short=12', 'HEAD']);
  const resolvedRepository = repositoryUrl || normaliseRepositoryUrl(await gitValue(root, ['remote', 'get-url', 'origin']));
  const generatedDate = new Date(now).toISOString().slice(0, 10);
  const sources = sourcePaths(slides);
  for (const path of sources) {
    if (path.startsWith('/') || path.split('/').includes('..')) throw new Error(`Unsafe source link: ${path}`);
    await access(resolve(root, path));
  }
  await mkdir(dirname(outputPath), {recursive: true});
  await writeFile(outputPath, deckHtml({slides, generatedDate, sha: resolvedSha, repositoryUrl: resolvedRepository}), 'utf8');
  const slidesPerSection = Object.fromEntries(compiled.sections
    .filter(section => section.slide)
    .map(section => [section.id, section.slideTexts.length]));
  return {
    output: outputPath,
    generated_date: generatedDate,
    sha: resolvedSha,
    slides: slides.length,
    slides_per_section: slidesPerSection,
    source_paths: sources,
    diagnostics: compiled.diagnostics,
  };
}

export async function runDeckBrowserChecks({root, outputPath} = {}) {
  const guideRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const playwright = resolve(root, 'node_modules', '.bin', 'playwright');
  const config = resolve(guideRoot, 'test', 'deck.playwright.config.mjs');
  const {stdout, stderr} = await execFile(playwright, ['test', '--config', config], {
    cwd: root,
    env: {...process.env, GUIDE_REPO_ROOT: root, GUIDE_DECK_PATH: outputPath},
  });
  return {stdout, stderr};
}
