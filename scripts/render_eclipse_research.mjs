import { readFileSync, writeFileSync } from 'node:fs';
import { renderMarkdown } from './initiatives.mjs';

const source = new URL('../decks/eclipse-2027/research-notes.md', import.meta.url);
const output = new URL('../gh-pages/decks/eclipse-2027/research-notes.html', import.meta.url);
// The shared renderer nests document headings one level below a card title.
// This standalone page uses the Markdown title as its own h1 instead.
const rendered = renderMarkdown(readFileSync(source, 'utf8'))
  .replace(/(<\/?h)([2-6])(?=>)/g, (_, tag, level) => `${tag}${Number(level) - 1}`);
const title = rendered.match(/^<h1>(.*?)<\/h1>\n/);
if (!title) throw new Error('Eclipse research notes must begin with a Markdown title');

writeFileSync(output, `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Research and upkeep notes | Eclipse 2027</title>
  <link rel="stylesheet" href="./assets/styles.css">
  <link rel="manifest" href="../../manifest.webmanifest">
  <script defer src="./assets/scripts.js"></script>
</head>
<body>
<header class="card">
  <div class="card-header"><a class="tag" href="./index.html">Eclipse 2027</a><h1>${title[1]}</h1></div>
  <div class="card-content"><p><a href="./sections/package-options/overview.html">Back to Package options</a> · <a href="./sections/package-options/overview-reject.html">Rejected and unverified options</a></p></div>
</header>
<main class="card"><div class="card-content">
${rendered.slice(title[0].length)}
</div></main>
</body>
</html>
`);
