import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

const fixture = JSON.parse(await readFile(fileURLToPath(new URL('../fixtures/phase-6-validation.json', import.meta.url)), 'utf8'));
const html = await readFile(fileURLToPath(new URL('../app/index.html', import.meta.url)), 'utf8');

test('Phase 6 records both teaching roles and every required viewport without inventing a live deployment', () => {
  assert.deepEqual(fixture.roles.map(({role}) => role), ['unguided public explorer', 'teacher presenter']);
  assert.ok(fixture.roles.every(({result, tasks}) => result === 'passed' && tasks.length >= 6));
  assert.deepEqual(fixture.viewports.map(({width, height}) => [width, height]), [[430, 932], [1440, 900], [3840, 2160]]);
  assert.equal(fixture.deployment.status, 'pending-permission');
  assert.equal(fixture.deployment.applicationUrl, null);
  assert.equal(fixture.deployment.relayUrl, null);
});

test('the public exploration record keeps identity and tracking out of scope', () => {
  assert.deepEqual(fixture.privacy, {
    requestsAccount: false,
    requestsLocation: false,
    requestsContacts: false,
    usesAnalytics: false,
    relayData: 'bounded session state and connection identifiers only',
  });
  assert.doesNotMatch(html, /sign[ -]?in|geolocation|analytics|tracking/iu);
});

test('the recorded accessibility target has inspectable evidence and no hidden exceptions', () => {
  assert.equal(fixture.accessibility.target, 'WCAG 2.2 AA');
  assert.ok(fixture.accessibility.verified.includes('semantic exact-value table'));
  assert.ok(fixture.accessibility.verified.includes('reduced motion'));
  assert.deepEqual(fixture.accessibility.blockingDefects, []);
  assert.ok(fixture.limitations.some((entry) => /physical classroom display/iu.test(entry)));
});
