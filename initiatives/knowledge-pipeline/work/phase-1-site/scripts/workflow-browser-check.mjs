import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const baseURL = process.env.KP_BROWSER_URL ?? 'http://localhost:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname))
  throw new Error('This automated test uses the local sign-in fixture only.');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const at = Date.now();
const report = {
  automatedRehearsal: true,
  independentHumanWitness: false,
  startedAt: new Date().toISOString(),
};
async function tab(name) {
  await page.getByRole('tab', { name, exact: true }).click();
}
async function saved(text) {
  await expect(page.getByRole('status')).toContainText(text, {
    timeout: 30000,
  });
  await expect(page.getByRole('alert')).toHaveCount(0);
}
try {
  await page.goto(baseURL + '/workspace');
  await page
    .getByRole('link', { name: 'Sign in with ChatGPT', exact: true })
    .click();
  await page
    .getByLabel('New collection', { exact: true })
    .fill('Browser rehearsal ' + at);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await saved('Collection created');
  await page
    .getByRole('button', { name: 'Load 18-source practice collection' })
    .click();
  await saved('Practice collection prepared');
  await page.reload();
  await expect(page.getByText('18 sources', { exact: true })).toBeVisible();
  await page
    .getByLabel('Source title', { exact: true })
    .fill('Browser-added cleared original');
  await page
    .getByLabel('Source URL', { exact: true })
    .fill('https://example.org/browser-' + at);
  await page
    .getByLabel('Retained text', { exact: true })
    .fill('Project-authored browser evidence.');
  await page.getByLabel('Rights', { exact: true }).selectOption('cleared');
  await page
    .getByRole('button', { name: 'Preview intake', exact: true })
    .click();
  await saved('Review the intake preview');
  await page
    .getByRole('button', { name: 'Commit intake to Browser rehearsal ' + at })
    .click();
  await saved('Intake committed');
  await tab('Tag & Promote');
  await page
    .getByLabel('Corrected tags, comma separated')
    .fill('curator-corrected, fixture');
  await page.getByLabel('Promotion decision').selectOption('promoted');
  await page
    .getByLabel('Rationale and corrections')
    .fill(
      'Automated rehearsal: corrected tag and retained unknown dimensions.',
    );
  await page.getByRole('button', { name: 'Record review decision' }).click();
  await saved('Source review recorded');
  await tab('Topics & Narratives');
  await page
    .getByRole('button', { name: 'Assign source to Community heat resilience' })
    .click();
  await saved('Source assigned');
  await page
    .getByLabel('Topic', { exact: true })
    .selectOption({ label: 'Cooling access' });
  await page
    .getByRole('button', { name: 'Assign source to Cooling access' })
    .click();
  await saved('Source assigned');
  await page.getByLabel('Narrative title').fill('Browser narrative');
  await page
    .getByLabel('Your accepted wording')
    .fill('Rewritten browser narrative with an exact original.');
  await page
    .getByRole('group', { name: 'Evidence sources' })
    .getByRole('checkbox')
    .first()
    .check();
  await page
    .getByRole('button', { name: 'Accept narrative', exact: true })
    .click();
  await saved('Narrative accepted');
  await tab('Documents');
  await expect(
    page.getByRole('heading', { name: 'No standing document', exact: true }),
  ).toBeVisible();
  await page
    .getByLabel('Comparison rationale', { exact: true })
    .fill('No baseline exists; first document is explicit.');
  await page
    .getByLabel('Proposed document text', { exact: true })
    .fill('Proposed browser document. Overstated part.');
  await page
    .getByRole('button', { name: 'Save comparison and proposal' })
    .click();
  await saved('Comparison and document proposal saved');
  await page
    .getByLabel('Final text you approve')
    .fill('Corrected browser document.');
  await page
    .getByLabel('Parts rejected or corrected')
    .fill('Removed overstated part.');
  await page.getByRole('button', { name: 'Approve this final text' }).click();
  await saved('approved document revision');
  await tab('Archive');
  const archiveCard = page
    .locator('[data-slot="card"]')
    .filter({
      has: page.getByRole('heading', {
        name: 'Browser narrative',
        exact: true,
      }),
    });
  await archiveCard
    .getByLabel('Reason', { exact: true })
    .fill('Automated test rejection reason.');
  await archiveCard
    .getByRole('button', { name: 'Archive narrative', exact: true })
    .click();
  await saved('Archive disposition recorded');
  await archiveCard
    .getByLabel('Reason for reopening')
    .fill('Automated test reopen.');
  await archiveCard.getByRole('button', { name: 'Reopen narrative' }).click();
  await saved('Narrative reopened');
  await tab('Backup');
  const exportStart = performance.now();
  await page.getByRole('button', { name: 'Create web export' }).click();
  await saved('Complete export stored');
  report.exportMilliseconds = performance.now() - exportStart;
  await page.getByRole('button', { name: 'Show package for recovery' }).click();
  const packageBox = page.getByLabel('Canonical package', { exact: true });
  await expect(packageBox).toBeVisible();
  const packageText = await packageBox.inputValue();
  const pkg = JSON.parse(packageText);
  await page
    .getByRole('button', { name: 'Create administrator export' })
    .click();
  await saved('Administrator export stored');
  await page.getByRole('button', { name: 'Show package for recovery' }).click();
  await expect(packageBox).toHaveValue(packageText);
  report.webAdminEquivalent = true;
  report.packageId = pkg.packageId;
  await page
    .getByLabel('New collection', { exact: true })
    .fill('Browser restore ' + at);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await saved('Collection created');
  await tab('Backup');
  await page.getByLabel('Package JSON to restore').fill(packageText);
  const restoreStart = performance.now();
  await page.getByRole('button', { name: 'Preview uploaded restore' }).click();
  await saved('Review destination');
  await page
    .getByRole('button', { name: 'Confirm restore into Browser restore ' + at })
    .click();
  await saved('Restore completed; verified 1 retained asset');
  report.restoreMilliseconds = performance.now() - restoreStart;
  await page.reload();
  await expect(page.getByText('19 sources', { exact: true })).toBeVisible();
  await tab('Documents');
  await expect(
    page.getByText('Corrected browser document.', { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('tab', { name: 'Documents', exact: true }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2,
  );
  if (overflow) throw new Error('Phone viewport overflows horizontally.');
  await page.setViewportSize({ width: 1440, height: 1050 });
  if (errors.length) throw new Error(errors.join('\n'));
  report.completedAt = new Date().toISOString();
  report.sourceCount = 19;
  report.retainedAssets = 1;
  await mkdir('outputs', { recursive: true });
  await writeFile(
    'outputs/workflow-browser-report.json',
    JSON.stringify(report, null, 2) + '\n',
  );
  await context.storageState({ path: 'outputs/local-browser-state.json' });
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error('Browser URL:', page.url());
  console.error(
    'Browser text:',
    (await page.locator('body').innerText()).slice(0, 5000),
  );
  console.error('Page errors:', errors);
  throw error;
} finally {
  await browser.close();
}
