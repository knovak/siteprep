// Anonymous hosted interruption/retry receipt. Run from the repository root.
import { chromium, webkit } from '../../../node_modules/playwright/index.mjs';
import { writeFile } from 'node:fs/promises';
const origin = 'https://flings-test.ken-novak.chatgpt.site';
const output = new URL(process.env.FLINGS_EVIDENCE || './hosted-public-retry-20261021.json', import.meta.url);
const receipt = { observedAt: new Date().toISOString(), origin, siteVersion: Number(process.env.FLINGS_SITE_VERSION || 19), accessRevision: 2, scope: 'Anonymous organizer startup only; injected status responses are browser-local. No sign-in or business mutation.', results: [] };
for (const [engine, launcher] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await launcher.launch({ headless: true });
  for (const width of [1280, 390]) for (const failure of ['network', '503', 'invalid-json', 'invalid-shape']) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 800 } });
    const page = await context.newPage();
    const result = { engine, version: browser.version(), width, failure, methods: [], blockedNonReads: [], injected: 0 };
    let intercept = true;
    await context.route('**/*', async route => {
      const request = route.request();
      if (!['GET', 'HEAD'].includes(request.method())) { const path = new URL(request.url()).pathname; result.blockedNonReads.push({ method: request.method(), path: path.startsWith('/cdn-cgi/') ? '/cdn-cgi/challenge-platform/(redacted)' : path }); return route.abort(); }
      result.methods.push(request.method());
      if (new URL(request.url()).pathname === '/api/flings/native/status' && intercept) {
        result.injected++;
        if (failure === 'network') return route.abort();
        return route.fulfill({ status: failure === '503' ? 503 : 200, contentType: 'application/json', body: failure === 'invalid-json' ? '{' : failure === 'invalid-shape' ? '{"native":true}' : '{"error":"Injected test outage"}' });
      }
      return route.continue();
    });
    try {
      await page.goto(origin+'/organizer');
      const reload = page.getByRole('button', { name: 'Reload workspace', exact: true });
      await reload.waitFor({ state: 'visible' });
      await page.waitForFunction(() => !Array.from(document.querySelectorAll('button')).find(x => x.textContent.trim() === 'Reload workspace')?.disabled);
      result.failureAlert = await page.getByRole('alert').innerText();
      if (!/refresh sign-in|Sign-in status is unavailable/.test(result.failureAlert)) throw new Error('Missing actionable startup error');
      result.hiddenIdentity = await page.getByRole('heading', { name: 'Your ChatGPT account', exact: true }).count() === 0;
      if (!result.hiddenIdentity) throw new Error('Identity displayed without valid status');
      intercept = false;
      await reload.focus(); await page.keyboard.press('Enter');
      await page.getByRole('link', { name: 'Sign in with ChatGPT', exact: true }).waitFor({ state: 'visible' });
      await page.waitForFunction(() => !Array.from(document.querySelectorAll('button')).find(x => x.textContent.trim() === 'Reload workspace')?.disabled);
      result.recoveredAlert = await page.getByRole('alert').innerText();
      result.noCreateControls = await page.getByRole('button', { name: /Create gathering|Open my organizer workspace/ }).count() === 0;
      result.fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
      result.pass = result.injected >= 1 && result.hiddenIdentity && result.noCreateControls && result.fits && result.blockedNonReads.every(x => !x.path.startsWith('/api/flings/'));
      if (!result.pass) throw new Error('Recovery conditions failed');
    } catch (error) { result.pass = false; result.error = String(error); }
    receipt.results.push(result); await context.close();
  }
  await browser.close();
}
await writeFile(output, JSON.stringify(receipt, null, 2)+'\n');
console.log(`${receipt.results.filter(x => x.pass).length}/${receipt.results.length} anonymous interruption/retry checks passed`);
if (receipt.results.some(x => !x.pass)) process.exitCode = 1;
