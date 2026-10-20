import { readFileSync, writeFileSync } from 'node:fs';
import { renderMarkdown } from './initiatives.mjs';

// Keep the existing build entry point; both comparisons use the same renderer.
const documents = [
  {
    deck: 'eclipse-2027',
    deckTitle: 'Eclipse 2027',
    filename: 'research-notes',
    section: 'package-options',
    backLabel: 'Back to Package options',
    holdingLabel: 'Rejected and unverified options',
  },
  {
    deck: 'ecuador',
    deckTitle: 'Ecuador',
    filename: 'galapagos-research-notes',
    section: 'galapagos-packages',
    backLabel: 'Back to Galápagos packages',
    holdingLabel: 'Rejected options and research holding',
  },
];

for (const document of documents) {
  const source = new URL(`../decks/${document.deck}/${document.filename}.md`, import.meta.url);
  const output = new URL(`../gh-pages/decks/${document.deck}/${document.filename}.html`, import.meta.url);
  // The shared renderer nests document headings one level below a card title.
  // This standalone page uses the Markdown title as its own h1 instead.
  const rendered = renderMarkdown(readFileSync(source, 'utf8'))
    .replace(/(<\/?h)([2-6])(?=>)/g, (_, tag, level) => `${tag}${Number(level) - 1}`);
  const title = rendered.match(/^<h1>(.*?)<\/h1>\n/);
  if (!title) throw new Error(`${document.deckTitle} research notes must begin with a Markdown title`);

  writeFileSync(output, `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Research and upkeep notes | ${document.deckTitle}</title>
  <link rel="stylesheet" href="./assets/styles.css">
  <link rel="manifest" href="../../manifest.webmanifest">
  <script defer src="./assets/scripts.js"></script>
</head>
<body>
<header class="card">
  <div class="card-header"><a class="tag" href="./index.html">${document.deckTitle}</a><h1>${title[1]}</h1></div>
  <div class="card-content"><p><a href="./sections/${document.section}/overview.html">${document.backLabel}</a> · <a href="./sections/${document.section}/overview-reject.html">${document.holdingLabel}</a></p></div>
</header>
<main class="card"><div class="card-content">
${rendered.slice(title[0].length)}
</div></main>
</body>
</html>
`);
}
