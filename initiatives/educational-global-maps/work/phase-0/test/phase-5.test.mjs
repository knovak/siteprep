import assert from 'node:assert/strict';
import {once} from 'node:events';
import {test} from 'node:test';
import {WebSocket} from 'ws';
import {createReferenceRelayServer} from '../scripts/reference-relay.mjs';
import {makeMinimumFixture} from '../src/fixture.mjs';
import {applyIntent, createSession} from '../src/scene.mjs';
import {
  createJoinSecret,
  createJoinUrl,
  InMemorySessionTransport,
  INVALID_LIMIT,
  relaySnapshot,
  RelayHub,
  SESSION_IDLE_MS,
  SESSION_MESSAGE_LIMIT,
} from '../src/session.mjs';

function setupSession() {
  const fixture = makeMinimumFixture();
  const scene = fixture.objects.find(({id}) => id === fixture.rootScene).content;
  const layers = new Map(fixture.objects.filter(({schema}) => schema.endsWith('/layer/v1')).map((layer) => [layer.id, layer]));
  const session = createSession(scene, 'session:phase-5');
  session.baseSceneRevision = fixture.rootScene;
  return {fixture, layers, session};
}

function intent(type, payload, baseRevision = 0, suffix = crypto.randomUUID()) {
  return {
    schema: 'educational-global-maps/intent/v1',
    id: `intent:${suffix}-v1`,
    content: {intentId: `intent:${suffix}`, sessionId: 'session:phase-5', baseRevision, type, payload},
  };
}

function relayIntent(object) {
  return {type: 'intent', sessionId: object.content.sessionId, intent: object};
}

test('join secrets carry 128 bits and URLs reveal only session routing state', () => {
  const secret = createJoinSecret();
  assert.match(secret, /^[A-Za-z0-9_-]{22}$/u);
  const url = new URL(createJoinUrl('https://maps.test/app/', {sessionId: 'session:phase-5', secret, relayUrl: 'wss://relay.test/ws'}));
  assert.equal(url.searchParams.get('controller'), '1');
  assert.equal(url.searchParams.get('session'), 'session:phase-5');
  assert.equal(url.searchParams.get('secret'), secret);
  assert.equal(url.searchParams.get('relay'), 'wss://relay.test/ws');
});

test('same-device transport and the reducer cover every detached control', () => {
  const {layers, session} = setupSession();
  const transport = new InMemorySessionTransport({session, reduce: (current, next) => applyIntent(current, next, layers)});
  const snapshots = [];
  transport.subscribe((snapshot) => snapshots.push(snapshot));
  const sequence = [
    ['set-time', {period: '2020'}],
    ['set-camera', {center: [10, 20], zoom: 1.5}],
    ['select-feature', {featureId: 'country:FRA'}],
    ['set-presentation-stop', {index: 1}],
  ];
  for (const [type, payload] of sequence) {
    const result = transport.send(intent(type, payload, transport.session.acceptedRevision));
    assert.equal(result.status, 'accepted', JSON.stringify(result.findings));
  }
  assert.equal(snapshots.at(-1).acceptedRevision, 4);
  assert.equal(snapshots.at(-1).scene.period, '2020');
  assert.deepEqual(snapshots.at(-1).scene.camera, {center: [10, 20], zoom: 1.5});
  assert.equal(snapshots.at(-1).scene.selectedFeature, 'country:FRA');
  assert.equal(snapshots.at(-1).scene.presentationStop, 1);
});

test('the relay forwards typed intents to the authoritative display and broadcasts snapshots', () => {
  const {session} = setupSession();
  const hub = new RelayHub();
  const secret = createJoinSecret();
  const original = relaySnapshot(session);
  assert.equal(hub.startSession({secret, displayId: 'display', snapshot: original}).status, 'started');
  assert.equal(hub.joinController({secret, connectionId: 'controller-a'}).status, 'joined');
  assert.equal(hub.joinController({secret, connectionId: 'controller-b'}).status, 'joined');
  const forwarded = hub.controllerMessage({secret, connectionId: 'controller-a', message: relayIntent(intent('set-time', {period: '2020'}))});
  assert.equal(forwarded.status, 'forward');
  assert.equal(forwarded.displayId, 'display');
  const next = structuredClone(original);
  next.acceptedRevision = 1;
  next.scene.period = '2020';
  const broadcast = hub.displaySnapshot({secret, displayId: 'display', message: {type: 'snapshot', snapshot: next}});
  assert.equal(broadcast.status, 'broadcast');
  assert.deepEqual(broadcast.controllerIds.sort(), ['controller-a', 'controller-b']);
  assert.equal(broadcast.snapshot.scene.period, '2020');
});

test('stale and repeated base revisions cannot roll back accepted display state', () => {
  const {session} = setupSession();
  const hub = new RelayHub();
  const secret = createJoinSecret();
  const snapshot = relaySnapshot(session);
  snapshot.acceptedRevision = 3;
  hub.startSession({secret, displayId: 'display', snapshot});
  hub.joinController({secret, connectionId: 'controller'});
  const stale = relayIntent(intent('set-time', {period: '2020'}, 2, 'stale'));
  assert.equal(hub.controllerMessage({secret, connectionId: 'controller', message: stale}).status, 'stale');
  assert.equal(hub.controllerMessage({secret, connectionId: 'controller', message: stale}).status, 'stale');
  assert.equal(hub.sessions.get(secret).snapshot.acceptedRevision, 3);
  const rollback = structuredClone(snapshot);
  rollback.acceptedRevision = 2;
  assert.equal(hub.displaySnapshot({secret, displayId: 'display', message: {type: 'snapshot', snapshot: rollback}}).status, 'stale');
});

test('reconnect receives the current complete snapshot rather than replaying stale local state', () => {
  const {session} = setupSession();
  const hub = new RelayHub();
  const secret = createJoinSecret();
  const snapshot = relaySnapshot(session);
  hub.startSession({secret, displayId: 'display', snapshot});
  const current = structuredClone(snapshot);
  current.acceptedRevision = 5;
  current.scene.presentationStop = 2;
  hub.displaySnapshot({secret, displayId: 'display', message: {type: 'snapshot', snapshot: current}});
  const joined = hub.joinController({secret, connectionId: 'reconnected'});
  assert.equal(joined.status, 'joined');
  assert.equal(joined.snapshot.acceptedRevision, 5);
  assert.equal(joined.snapshot.scene.presentationStop, 2);
});

test('expiry, explicit end, and repeated invalid messages remove or rate-limit sessions', () => {
  let clock = 1_000;
  const {session} = setupSession();
  const hub = new RelayHub({now: () => clock});
  const secret = createJoinSecret();
  hub.startSession({secret, displayId: 'display', snapshot: relaySnapshot(session)});
  hub.joinController({secret, connectionId: 'controller'});
  for (let attempt = 0; attempt < INVALID_LIMIT; attempt += 1) {
    assert.equal(hub.controllerMessage({secret, connectionId: 'controller', message: {type: 'unknown'}}).status, 'refused');
  }
  assert.equal(hub.controllerMessage({secret, connectionId: 'controller', message: {type: 'unknown'}}).status, 'rate-limited');
  clock += SESSION_IDLE_MS;
  assert.equal(hub.joinController({secret, connectionId: 'late'}).status, 'refused');
  const second = createJoinSecret();
  hub.startSession({secret: second, displayId: 'display-2', snapshot: relaySnapshot(session)});
  assert.equal(hub.endSession({secret: second, displayId: 'display-2'}).status, 'ended');
  assert.equal(hub.joinController({secret: second, connectionId: 'after-end'}).status, 'refused');
});

test('payload and relay-ignorance limits refuse artifacts, credentials, and oversized messages', () => {
  const {session} = setupSession();
  const hub = new RelayHub();
  assert.equal(hub.startSession({secret: createJoinSecret(), displayId: 'display', snapshot: {...relaySnapshot(session), datasetBody: 'private'}}).status, 'refused');
  assert.equal(hub.startSession({secret: createJoinSecret(), displayId: 'display', snapshot: {...relaySnapshot(session), padding: 'x'.repeat(SESSION_MESSAGE_LIMIT)}}).status, 'refused');
});

test('the packaged WebSocket relay joins a controller and meets the 250 ms p95 forwarding budget', async (context) => {
  const relay = createReferenceRelayServer();
  const address = await relay.listen();
  context.after(() => relay.close());
  const secret = createJoinSecret();
  const {session} = setupSession();
  const display = new WebSocket(`ws://127.0.0.1:${address.port}/?role=display&secret=${secret}&connection=display`);
  context.after(() => display.close());
  await once(display, 'open');
  const started = once(display, 'message');
  display.send(JSON.stringify({type: 'start', snapshot: relaySnapshot(session)}));
  const [startedRaw] = await started;
  assert.equal(JSON.parse(startedRaw).status, 'started');
  const controller = new WebSocket(`ws://127.0.0.1:${address.port}/?role=controller&secret=${secret}&connection=controller`);
  context.after(() => controller.close());
  const joined = once(controller, 'message');
  await once(controller, 'open');
  const [joinedRaw] = await joined;
  assert.equal(JSON.parse(joinedRaw).status, 'joined');
  const samples = [];
  for (let index = 0; index < 20; index += 1) {
    const forwarded = once(display, 'message');
    const startedAt = performance.now();
    controller.send(JSON.stringify(relayIntent(intent('set-time', {period: '2020'}, 0, `latency-${index}`))));
    const [forwardedRaw] = await forwarded;
    samples.push(performance.now() - startedAt);
    assert.equal(JSON.parse(forwardedRaw).intent.content.type, 'set-time');
  }
  samples.sort((a, b) => a - b);
  assert.ok(samples[Math.ceil(samples.length * .95) - 1] < 250, JSON.stringify(samples));
});
