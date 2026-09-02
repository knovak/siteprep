function socketUrl(relayUrl, role, secret, connectionId) {
  const url = new URL(relayUrl);
  url.searchParams.set('role', role);
  url.searchParams.set('secret', secret);
  url.searchParams.set('connection', connectionId);
  return url.toString();
}

export class BrowserSessionLink {
  constructor({role, sessionId, secret, relayUrl = null, onMessage, onStatus}) {
    this.role = role;
    this.sessionId = sessionId;
    this.secret = secret;
    this.relayUrl = relayUrl;
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.connectionId = crypto.randomUUID();
    this.snapshot = null;
    this.transport = null;
  }

  connect(snapshot = null) {
    this.snapshot = snapshot;
    if (this.relayUrl) this.#connectWebSocket();
    else this.#connectSameBrowser();
  }

  #connectSameBrowser() {
    this.transport = new BroadcastChannel(`egm-controller:${this.secret}`);
    this.transport.addEventListener('message', ({data}) => {
      if (this.role === 'display' && data.type === 'join') {
        this.publish(this.snapshot);
      } else if (this.role === 'display' && data.type === 'intent') {
        this.onMessage(data);
      } else if (this.role === 'controller' && data.type === 'snapshot') {
        this.snapshot = data.snapshot;
        this.onStatus('Connected · same-browser fallback');
        this.onMessage(data);
      } else if (this.role === 'controller' && data.type === 'ended') {
        this.onStatus('Session ended');
      }
    });
    this.onStatus(this.role === 'display' ? 'Ready · same-browser fallback' : 'Joining…');
    if (this.role === 'controller') this.transport.postMessage({type: 'join', sessionId: this.sessionId});
  }

  #connectWebSocket() {
    this.transport = new WebSocket(socketUrl(this.relayUrl, this.role, this.secret, this.connectionId));
    this.transport.addEventListener('open', () => {
      this.onStatus('Connected · reference relay');
      if (this.role === 'display') this.transport.send(JSON.stringify({type: 'start', snapshot: this.snapshot}));
    });
    this.transport.addEventListener('message', ({data}) => {
      const message = JSON.parse(data);
      if (message.snapshot) this.snapshot = message.snapshot;
      if (['joined', 'snapshot', 'forward'].includes(message.status) || message.type === 'intent') this.onMessage(message);
      if (message.status === 'expired' || message.status === 'ended') this.onStatus(`Session ${message.status}`);
    });
    this.transport.addEventListener('close', () => this.onStatus('Disconnected · display continues locally'));
    this.transport.addEventListener('error', () => this.onStatus('Relay unavailable · display continues locally'));
  }

  publish(snapshot) {
    this.snapshot = snapshot;
    const message = {type: 'snapshot', snapshot};
    if (this.relayUrl) {
      if (this.transport.readyState === WebSocket.OPEN) this.transport.send(JSON.stringify(message));
    } else {
      this.transport.postMessage(message);
    }
  }

  sendIntent(intent) {
    const message = {type: 'intent', sessionId: this.sessionId, intent};
    if (this.relayUrl) {
      if (this.transport.readyState === WebSocket.OPEN) this.transport.send(JSON.stringify(message));
    } else {
      this.transport.postMessage(message);
    }
  }

  end() {
    const message = {type: 'end', sessionId: this.sessionId};
    if (this.relayUrl) {
      if (this.transport.readyState === WebSocket.OPEN) this.transport.send(JSON.stringify(message));
      this.transport.close();
    } else {
      this.transport.postMessage({type: 'ended', sessionId: this.sessionId});
      this.transport.close();
    }
  }
}
