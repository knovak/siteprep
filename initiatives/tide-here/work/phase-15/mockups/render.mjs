// Renders the extremity mockups to PNG. Run from this directory after
// build-data.mjs: node render.mjs
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium} = require('playwright');

const data = readFileSync(new URL('mockup-data.json', import.meta.url), 'utf8');
const page_url = new URL('mockup.html', import.meta.url).href;
const shots = [
  ...['A', 'B', 'C', 'D', 'E', 'F'].map((option) => ({file: `option-${option}.png`, query: `option=${option}`, width: 1240})),
  {file: 'option-A-phone.png', query: 'option=A', width: 390},
  {file: 'option-B-explanation.png', query: 'option=B&explain=1-3', width: 1240}
];
const browser = await chromium.launch();
for (const shot of shots) {
  const page = await browser.newPage({viewport: {width: shot.width, height: 200}, deviceScaleFactor: 2});
  await page.addInitScript(`window.MOCKUP_DATA = ${data};`);
  await page.goto(`${page_url}?${shot.query}`);
  await page.screenshot({path: shot.file, fullPage: true});
  await page.close();
  console.log('wrote', shot.file);
}
await browser.close();
