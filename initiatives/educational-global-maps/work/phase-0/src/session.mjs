import {randomBytes} from 'node:crypto';
import {canonicalJson, deepClone} from './canonical.mjs';
import {finding} from './findings.mjs';

export const SESSION_IDLE_MS = 2 * 60 * 60 * 1000;
export const SESSION_MESSAGE_LIMIT = 64 * 1024;
export const INVALID_WINDOW_MS = 10_000;
export const INVALID_LIMIT = 8;

const INTENT_TYPES = new Set([
  'set-time',
  'set-projection',
  'set-camera',
  'set-layers',
  'select-feature',
  'set-presentation-stop',
]);

function refusal(code, message, status = 'refused') {
  return {status, findings: [finding(code, '$.message', message)]};
}

function byteLength(value) {
  return Buffer.byteLength(typeof value === 'string' ? value : canonicalJson(value), 'utf8');
}

function hasForbiddenContent(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) =>
    /^(artifact|artifactBytes|datasetBody|credentials|contributorContent)$/iu.test(key)
    || hasForbiddenContent(child));
}

export function createJoinSecret() {
  return randomBytes(16).toString('base64url');
}

export function createJoinUrl(baseUrl, {sessionId, secret, relayUrl} = {}) {
  const url = new URL(baseUrl);
  url.searchParams.set('controller', '1');
  url.searchParams.set('session', sessionId);
  url.searchParams.set('secret', secret);
  if (relayUrl) url.searchParams.set('relay', relayUrl);
  return url.toString();
}

export function relaySnapshot(session) {
  const scene = session.scene ?? {};
  return deepClone({
    sessionId: session.sessionId,
    baseSceneRevision: session.baseSceneRevision ?? scene.revisionId ?? scene.id ?? 'scene:local',
    acceptedRevision: session.acceptedRevision,
    scene: {
      period: scene.period,
      projection: scene.projection,
      camera: scene.camera,
      layers: scene.layers,
      selectedFeature: scene.selectedFeature ?? null,
      presentationStop: scene.presentationStop ?? 0,
    },
  });
}

export function validateRelayMessage(message) {
  if (!message || typeof message !== 'object' || Array.isArray(message)) {
    return refusal('relay.message.type', 'Relay message must be an object');
  }
  if (byteLength(message) > SESSION_MESSAGE_LIMIT) {
    return refusal('relay.message.limit', `Relay message exceeds ${SESSION_MESSAGE_LIMIT} bytes`);
  }
  if (hasForbiddenContent(message)) {
    return refusal('relay.content.forbidden', 'Dataset artifacts, credentials, and contributor content cannot enter relay state');
  }
  if (!['intent', 'snapshot', 'end'].includes(message.type)) {
    return refusal('relay.message.unknown', `Unknown relay message type ${message.type}`);
  }
  if (message.type === 'intent') {
    const content = message.intent?.content;
    if (!content || !INTENT_TYPES.has(content.type)) {
      return refusal('relay.intent.type', 'Relay intent type is unsupported');
    }
    if (content.sessionId !== message.sessionId || !Number.isSafeInteger(content.baseRevision)) {
      return refusal('relay.intent.envelope', 'Relay intent must name its session and non-negative base revision');
    }
  }
  return {status: 'accepted', findings: []};
}

export class RelayHub {
  constructor({now = () => Date.now()} = {}) {
    this.now = now;
    this.sessions = new Map();
    this.invalidAttempts = new Map();
  }

  #recordInvalid(connectionId, at) {
    const recent = (this.invalidAttempts.get(connectionId) ?? []).filter((time) => at - time <= INVALID_WINDOW_MS);
    recent.push(at);
    this.invalidAttempts.set(connectionId, recent);
    return recent.length > INVALID_LIMIT;
  }

  #invalid(connectionId, at, result) {
    if (this.#recordInvalid(connectionId, at)) {
      return refusal('relay.rate.invalid', 'Too many invalid or stale messages', 'rate-limited');
    }
    return result;
  }

  #active(secret, at = this.now()) {
    const session = this.sessions.get(secret);
    if (!session) return null;
    if (at - session.lastActivity >= SESSION_IDLE_MS) {
      this.sessions.delete(secret);
      return null;
    }
    return session;
  }

  startSession({secret = createJoinSecret(), displayId, snapshot, now = this.now()}) {
    if (!displayId || !snapshot?.sessionId || !Number.isSafeInteger(snapshot.acceptedRevision)) {
      return refusal('relay.session.invalid', 'Display, session id, and accepted revision are required');
    }
    if (byteLength(snapshot) > SESSION_MESSAGE_LIMIT || hasForbiddenContent(snapshot)) {
      return refusal('relay.snapshot.forbidden', 'Snapshot is oversized or contains content the relay must not carry');
    }
    const session = {
      secret,
      sessionId: snapshot.sessionId,
      displayId,
      snapshot: deepClone(snapshot),
      controllerIds: new Set(),
      lastActivity: now,
    };
    this.sessions.set(secret, session);
    return {status: 'started', secret, sessionId: session.sessionId, snapshot: deepClone(snapshot)};
  }

  joinController({secret, connectionId, now = this.now()}) {
    const session = this.#active(secret, now);
    if (!session) return refusal('relay.session.unavailable', 'Session is missing, ended, or expired');
    session.controllerIds.add(connectionId);
    session.lastActivity = now;
    return {status: 'joined', sessionId: session.sessionId, snapshot: deepClone(session.snapshot)};
  }

  controllerMessage({secret, connectionId, message, now = this.now()}) {
    const session = this.#active(secret, now);
    if (!session || !session.controllerIds.has(connectionId)) {
      return this.#invalid(connectionId, now, refusal('relay.controller.unjoined', 'Controller has not joined an active session'));
    }
    const checked = validateRelayMessage(message);
    if (checked.status !== 'accepted') return this.#invalid(connectionId, now, checked);
    if (message.type !== 'intent') return this.#invalid(connectionId, now, refusal('relay.controller.intent_only', 'Controllers may send only intents'));
    if (message.sessionId !== session.sessionId || message.intent.content.baseRevision !== session.snapshot.acceptedRevision) {
      return this.#invalid(connectionId, now, refusal('relay.intent.stale', 'Intent does not address the current display revision', 'stale'));
    }
    session.lastActivity = now;
    return {status: 'forward', displayId: session.displayId, message: deepClone(message)};
  }

  displaySnapshot({secret, displayId, message, now = this.now()}) {
    const session = this.#active(secret, now);
    if (!session || session.displayId !== displayId) return refusal('relay.display.unjoined', 'Display does not own an active session');
    const checked = validateRelayMessage(message);
    if (checked.status !== 'accepted' || message.type !== 'snapshot') return checked.status === 'accepted' ? refusal('relay.display.snapshot_only', 'Display must send a snapshot') : checked;
    const snapshot = message.snapshot;
    if (snapshot?.sessionId !== session.sessionId || !Number.isSafeInteger(snapshot.acceptedRevision)) {
      return refusal('relay.snapshot.invalid', 'Snapshot must name the active session and accepted revision');
    }
    if (snapshot.acceptedRevision < session.snapshot.acceptedRevision) {
      return refusal('relay.snapshot.stale', 'Display snapshot cannot roll back accepted state', 'stale');
    }
    if (byteLength(snapshot) > SESSION_MESSAGE_LIMIT || hasForbiddenContent(snapshot)) {
      return refusal('relay.snapshot.forbidden', 'Snapshot is oversized or contains content the relay must not carry');
    }
    session.snapshot = deepClone(snapshot);
    session.lastActivity = now;
    return {status: 'broadcast', controllerIds: [...session.controllerIds], snapshot: deepClone(snapshot)};
  }

  endSession({secret, displayId}) {
    const session = this.sessions.get(secret);
    if (!session || session.displayId !== displayId) return refusal('relay.display.unjoined', 'Display does not own an active session');
    this.sessions.delete(secret);
    return {status: 'ended', controllerIds: [...session.controllerIds]};
  }

  expire(now = this.now()) {
    const expired = [];
    for (const [secret, session] of this.sessions) {
      if (now - session.lastActivity >= SESSION_IDLE_MS) {
        expired.push({secret, controllerIds: [...session.controllerIds]});
        this.sessions.delete(secret);
      }
    }
    return expired;
  }
}

export class InMemorySessionTransport {
  constructor({session, reduce}) {
    this.session = deepClone(session);
    this.reduce = reduce;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(relaySnapshot(this.session));
    return () => this.listeners.delete(listener);
  }

  send(intent) {
    const result = this.reduce(this.session, intent);
    if (result.status === 'accepted') {
      this.session = result.session;
      const snapshot = relaySnapshot(this.session);
      for (const listener of this.listeners) listener(snapshot);
    }
    return result;
  }
}
