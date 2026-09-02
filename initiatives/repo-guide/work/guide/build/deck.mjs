import {execFile as execFileCallback} from 'node:child_process';
import {access, mkdir, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

import {BLOCK_CSS, parseBlockDirective, renderBlock} from './blocks.mjs';
import {resolveRepositoryFacts} from './facts.mjs';
import {FIGURE_CSS} from './figures.mjs';
import {compileSections, loadSections} from './sections.mjs';
import {GUIDE_TITLE} from './description.mjs';

const execFile = promisify(execFileCallback);
const SOURCE_LINK = /\[([^\]]+)\]\(source:([^)]+)\)/g;
export const MIN_SLIDES = 10;
export const MAX_SLIDES = 24;
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
    const directive = parseBlockDirective(line.trim());
    if (directive) {
      flushParagraph(); flushList();
      output.push(renderBlock(directive, context.facts));
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) { flushParagraph(); list.push(bullet[1]); continue; }
    flushList(); paragraph.push(line.trim());
  }
  flushParagraph(); flushList();
  return output.join('\n');
}

// A block directive contributes a diagram or a table, not slide copy, so it is
// excluded from the copy budget the way whitespace is.
function withoutBlocks(value) {
  return value
    .replaceAll('\r\n', '\n')
    .split('\n')
    .filter(line => !parseBlockDirective(line.trim()))
    .join('\n');
}

function words(value) {
  return withoutBlocks(value)
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

// Thirteen identically shaped slides read as one slide shown thirteen times.
// The layout follows what the slide actually carries, so a diagram slide, a
// data slide, and a statement slide look different from across a room.
export function slideLayout(markdown) {
  const directives = markdown
    .replaceAll('\r\n', '\n')
    .split('\n')
    .map(line => parseBlockDirective(line.trim()))
    .filter(Boolean);
  if (directives.some(directive => directive.kind === 'figure')) return 'figure';
  if (directives.length > 0) return 'data';
  return 'statement';
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
      layout: slideLayout(markdown),
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

function deckHtml({slides, facts, generatedDate, sha, repositoryUrl}) {
  const context = {sha, repositoryUrl, facts};
  const rendered = slides.map((slide, index) => `
    <article class="slide${index === 0 ? ' title-slide' : ''}" data-index="${index}" data-section-id="${escapeHtml(slide.section_id)}" data-audience="${escapeHtml(slide.audience)}" data-layout="${escapeHtml(slide.layout)}" ${index === 0 ? '' : 'hidden'} aria-hidden="${index === 0 ? 'false' : 'true'}">
      <div class="slide-inner">
        <header class="slide-bar">
          <span class="section-label">${index === 0 ? escapeHtml(GUIDE_TITLE) : escapeHtml(slide.section_title)}</span>
          <span class="slide-count">${index + 1} / ${slides.length}</span>
        </header>
        <h1>${renderInline(slide.title, context)}</h1>
        <div class="slide-copy">${renderMarkdown(slide.body, context)}</div>
        <footer>
          <span>${escapeHtml(GUIDE_TITLE)} · Ken Novak</span>
          <span>${escapeHtml(generatedDate)} · ${escapeHtml(sha)}</span>
        </footer>
      </div>
    </article>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(GUIDE_TITLE)}</title>
  <style>
    :root {
      color-scheme: light; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1a2233; background: #0f1830;
      --fig-ink: #1a2233; --fig-muted: #5b6578; --fig-line: #d7dce6; --fig-fill: #f4f6fa; --fig-surface: #ffffff;
      --fig-accent: #1e4bb8; --fig-accent-soft: #e9effc; --fig-accent-ink: #163a8f;
      --fig-warn: #c77700; --fig-warn-soft: #fff5e5; --fig-warn-ink: #7a4a00;
      --fig-go: #2a8c5c; --fig-go-soft: #e6f5ec; --fig-go-ink: #1c5f3f;
      --fig-doc: #e8ecf4; --fig-doc-ink: #45536f;
    }
    * { box-sizing: border-box; }
    body { min-width: 320px; min-height: 100vh; margin: 0; display: grid; place-items: center; overflow: hidden; background: #0f1830; }
    button { font: inherit; }
    #frame { width: min(100vw, calc(100vh * 16 / 9)); height: min(100vh, calc(100vw * 9 / 16)); position: relative; }
    #deck { position: absolute; inset: 0; overflow: hidden; background: #ffffff; box-shadow: 0 28px 80px #0008; }
    .slide { position: absolute; inset: 0; background: #ffffff; }
    .slide[hidden] { display: none; }
    .slide-inner { height: 100%; padding: 0 6.5% 3.6%; display: flex; flex-direction: column; }
    .slide-bar { display: flex; justify-content: space-between; align-items: center; margin: 0 -7.47% 3.4%; padding: 1.5% 7.47%; background: #163a8f; color: #dfe7ff; font-size: clamp(10px, 1.05vw, 17px); font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
    .slide-count { font-variant-numeric: tabular-nums; letter-spacing: .04em; opacity: .85; }
    h1 { max-width: 92%; margin: 0; color: #163a8f; font-size: clamp(28px, 3.6vw, 58px); line-height: 1.06; letter-spacing: -.03em; text-wrap: balance; }
    .slide-copy { max-width: 84%; margin-top: 3.2%; color: #263047; font-size: clamp(16px, 1.62vw, 27px); line-height: 1.42; }
    .slide-copy p { margin: 0; }
    .slide-copy p + p, .slide-copy ul + p { margin-top: .75em; }
    .slide-copy ul { margin: 0; padding-left: 1.15em; }
    .slide-copy li + li { margin-top: .4em; }
    a { color: #1e4bb8; text-underline-offset: .16em; }
    code { padding: .06em .3em; border-radius: .22em; color: #163a8f; background: #e9effc; font-size: .9em; }
    footer { margin-top: auto; padding-top: 1.8%; display: flex; justify-content: space-between; border-top: 1px solid #d7dce6; color: #5b6578; font-size: clamp(9px, .85vw, 14px); letter-spacing: .04em; text-transform: uppercase; }
    /* The title slide is the one dark slide. */
    .title-slide { background: linear-gradient(135deg, #0f1f4d, #163a8f 70%, #1e4bb8); }
    .title-slide .slide-bar { background: transparent; color: #b7c6f2; }
    .title-slide .slide-inner { justify-content: center; }
    .title-slide h1 { max-width: 80%; color: #ffffff; font-size: clamp(42px, 6vw, 96px); }
    .title-slide .slide-copy { max-width: 68%; color: #dfe7ff; font-size: clamp(17px, 1.85vw, 30px); }
    .title-slide footer { border-color: #3a56a5; color: #b7c6f2; }
    #controls { position: absolute; left: 0; right: 0; bottom: 1.2%; z-index: 3; display: flex; justify-content: center; align-items: center; gap: 1.1em; color: #5b6578; font-size: clamp(10px, .9vw, 14px); }
    #controls button { border: 0; padding: .2em .5em; color: inherit; background: transparent; font-size: clamp(22px, 2vw, 32px); font-weight: 850; line-height: .75; cursor: pointer; }
    #controls button:disabled { opacity: .3; cursor: default; }
    #progress { min-width: 5em; text-align: center; font-variant-numeric: tabular-nums; }
    #frame:has(.title-slide:not([hidden])) #controls { color: #eef2ff; text-shadow: 0 1px 6px #0009; }
    #frame:has(.title-slide:not([hidden])) #controls button:disabled { opacity: .5; }
    @media (max-aspect-ratio: 4/3) { .slide-copy { max-width: 92%; } h1 { max-width: 96%; } }

    /* Layout variants. A slide's shape follows what it carries. */
    .slide[data-layout="figure"] .slide-bar { margin-bottom: 2.2%; }
    .slide[data-layout="figure"] h1 { font-size: clamp(24px, 2.9vw, 46px); }
    .slide[data-layout="figure"] .slide-copy { max-width: 100%; margin-top: 1.6%; flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 1.6%; font-size: clamp(13px, 1.25vw, 20px); }
    .slide[data-layout="figure"] .figure { margin: 0; flex: 1; min-height: 0; display: flex; align-items: center; }
    .slide[data-layout="figure"] .figure-svg { max-width: 100%; max-height: 100%; }
    .slide[data-layout="figure"] p { max-width: 86%; margin: 0; }
    .slide[data-layout="data"] h1 { font-size: clamp(26px, 3.2vw, 50px); }
    .slide[data-layout="data"] .slide-copy { max-width: 100%; margin-top: 2.4%; font-size: clamp(14px, 1.42vw, 23px); overflow: hidden; }
    .slide[data-layout="data"] .fact-block { margin: 2.4% 0 0; }
    .slide[data-layout="statement"] .slide-copy { max-width: 80%; margin-top: 4%; font-size: clamp(19px, 2.05vw, 33px); line-height: 1.45; }
    /* A slide is a fixed frame. However long a description grows in the
       repository, a card clamps rather than pushing the deck off the slide. */
    .slide-copy .fact-cards { grid-template-columns: repeat(auto-fit, minmax(min(200px, 45%), 1fr)); align-content: start; }
    .slide-copy .fact-cards article { overflow: hidden; }
    .slide-copy .fact-cards p { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 5; overflow: hidden; }
${FIGURE_CSS}${BLOCK_CSS}  </style>
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
  await writeFile(outputPath, deckHtml({slides, facts, generatedDate, sha: resolvedSha, repositoryUrl: resolvedRepository}), 'utf8');
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
