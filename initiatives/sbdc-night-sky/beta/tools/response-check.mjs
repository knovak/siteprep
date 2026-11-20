import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(pathToFileURL(resolve(process.argv[2] ?? 'dist/sbdc-sky-simulator.html')).href);
  await page.waitForFunction(() => document.querySelector('#readout').textContent.includes('sunlit'));
  await page.locator('#night-grp summary').click();
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const timings = [];
  for (let trial = 0; trial < 5; trial++) {
    timings.push(await page.evaluate(() => new Promise((resolve, reject) => {
      const deadline = performance.now() + 50;
      setTimeout(() => {
        const cancel = document.querySelector('#analysis-stop');
        if (cancel.hidden) { reject(new Error('No analysis to cancel')); return; }
        cancel.click();
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (!document.querySelector('#night-status').textContent.includes('cancelled')) reject(new Error('No acknowledgement'));
          else resolve(Math.round(performance.now() - deadline));
        }));
      }, 50);
      document.querySelector('#night-run').click();
    })));
  }
  console.log(`Chromium ${browser.version()}, 390×844, 4× CPU: cancel to painted acknowledgement (ms): ${timings.join(', ')}`);
  await page.evaluate(() => {
    window.longTasks = [];
    const observer = new PerformanceObserver(list => window.longTasks.push(...list.getEntries().map(entry => entry.duration)));
    observer.observe({ type: 'longtask' });
    window.nightStart = performance.now();
    document.querySelector('#night-run').click();
  });
  await page.waitForFunction(() => document.querySelector('#night-status').textContent.includes('computed for'));
  console.log(await page.evaluate(() => ({ elapsedMs: Math.round(performance.now() - window.nightStart), longestMainTaskMs: Math.max(0, ...window.longTasks) })));
} finally { await browser.close(); }
