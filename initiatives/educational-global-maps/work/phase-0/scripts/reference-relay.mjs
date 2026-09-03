#!/usr/bin/env node
import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';
import {WebSocketServer} from 'ws';
import {RelayHub} from '../src/session.mjs';

function send(socket, message) {
  if (socket?.readyState === 1) socket.send(JSON.stringify(message));
}

export function createReferenceRelayServer({host = '127.0.0.1', port = 0, now} = {}) {
  const hub = new RelayHub({now});
  const sockets = new Map();
  const metadata = new Map();
  const server = createServer((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, {'content-type': 'application/json'});
      response.end(JSON.stringify({status: 'ok', sessions: hub.sessions.size}));
      return;
    }
    response.writeHead(404, {'content-type': 'text/plain; charset=utf-8'});
    response.end('Reference relay exposes only /health and WebSocket sessions.');
  });
  const websocket = new WebSocketServer({server, maxPayload: 64 * 1024});

  websocket.on('connection', (socket, request) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
    const role = requestUrl.searchParams.get('role');
    const secret = requestUrl.searchParams.get('secret');
    const connectionId = requestUrl.searchParams.get('connection') ?? crypto.randomUUID();
    sockets.set(connectionId, socket);
    metadata.set(connectionId, {role, secret});

    if (role === 'controller') {
      const joined = hub.joinController({secret, connectionId});
      send(socket, joined);
      if (joined.status !== 'joined') socket.close(1008, 'Session unavailable');
    } else if (role !== 'display') {
      send(socket, {status: 'refused', code: 'relay.role.invalid'});
      socket.close(1008, 'Role must be display or controller');
    }

    socket.on('message', (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString('utf8'));
      } catch {
        send(socket, {status: 'refused', code: 'relay.message.json'});
        return;
      }

      if (role === 'display' && message.type === 'start') {
        const started = hub.startSession({secret, displayId: connectionId, snapshot: message.snapshot});
        send(socket, started);
        return;
      }
      if (role === 'display' && message.type === 'snapshot') {
        const broadcast = hub.displaySnapshot({secret, displayId: connectionId, message});
        send(socket, broadcast);
        if (broadcast.status === 'broadcast') {
          for (const controllerId of broadcast.controllerIds) send(sockets.get(controllerId), {status: 'snapshot', snapshot: broadcast.snapshot});
        }
        return;
      }
      if (role === 'display' && message.type === 'end') {
        const ended = hub.endSession({secret, displayId: connectionId});
        send(socket, ended);
        if (ended.status === 'ended') {
          for (const controllerId of ended.controllerIds) {
            send(sockets.get(controllerId), {status: 'ended'});
            sockets.get(controllerId)?.close(1000, 'Session ended');
          }
        }
        return;
      }
      if (role === 'controller') {
        const forwarded = hub.controllerMessage({secret, connectionId, message});
        send(socket, forwarded.status === 'forward' ? {status: 'forwarded'} : forwarded);
        if (forwarded.status === 'forward') send(sockets.get(forwarded.displayId), forwarded.message);
      }
    });

    socket.on('close', () => {
      sockets.delete(connectionId);
      metadata.delete(connectionId);
    });
  });

  const expiryTimer = setInterval(() => {
    for (const expired of hub.expire()) {
      for (const controllerId of expired.controllerIds) {
        send(sockets.get(controllerId), {status: 'expired'});
        sockets.get(controllerId)?.close(1000, 'Session expired');
      }
    }
  }, 60_000);
  expiryTimer.unref();

  return {
    hub,
    server,
    websocket,
    async listen() {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, resolve);
      });
      return server.address();
    },
    async close() {
      clearInterval(expiryTimer);
      for (const socket of sockets.values()) socket.close(1001, 'Relay stopping');
      await new Promise((resolve) => websocket.close(resolve));
      if (server.listening) await new Promise((resolve) => server.close(resolve));
    },
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number.parseInt(process.env.EGM_RELAY_PORT ?? '4180', 10);
  const relay = createReferenceRelayServer({port});
  const address = await relay.listen();
  process.stdout.write(`Educational Global Maps reference relay listening on ws://${address.address}:${address.port}\n`);
}
