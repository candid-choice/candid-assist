/** WebSocket MCP server integration tests.

Covers: connection registry, initialize handshake marking presence,
tools/list over WS, tools/call + surface broadcast path, graceful
close removal, abrupt terminate removal, and /status presence wiring.
*/

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';

import { startMcpServer } from '@/mcp-server';
import {
  startMcpWebSocketServer,
  stopMcpWebSocketServer,
  getMcpWsClientCount,
  getLiveAgentInfos,
} from '@/mcp-websocket';

const HTTP_PORT = 3735;
const SURFACE_WS_PORT = 3736;
const WS_MCP_PORT = 43181;
const STATUS_URL = `http://localhost:${HTTP_PORT}/status`;

function wsUrl(): string {
  return `ws://127.0.0.1:${WS_MCP_PORT}/mcp`;
}

/** Connect, speak MCP, and collect replies keyed by request id. */
function openClient(): {
  ws: WebSocket;
  request: (method: string, params?: unknown, id?: number) => Promise<any>;
  waitForOpen: () => Promise<void>;
} {
  const ws = new WebSocket(wsUrl());
  const pending = new Map<number, (v: any) => void>();
  let seq = 1;
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.id != null && pending.has(msg.id)) {
        pending.get(msg.id)!(msg);
        pending.delete(msg.id);
      }
    } catch {
      /* ignore malformed */
    }
  });
  return {
    ws,
    waitForOpen: () =>
      new Promise<void>((resolve, reject) => {
        ws.once('open', resolve);
        ws.once('error', reject);
      }),
    request: (method, params, id) =>
      new Promise((resolve) => {
        const rid = id ?? seq++;
        pending.set(rid, resolve);
        ws.send(JSON.stringify({ jsonrpc: '2.0', method, params, id: rid }));
      }),
  };
}

beforeAll(async () => {
  startMcpServer(HTTP_PORT, SURFACE_WS_PORT);
  startMcpWebSocketServer({ port: WS_MCP_PORT });
  await new Promise((r) => setTimeout(r, 300));
});

afterAll(async () => {
  await stopMcpWebSocketServer();
});

describe('WebSocket MCP (pi transport)', () => {
  it('handshake: initialize → result with serverInfo; marks presence', async () => {
    const c = openClient();
    await c.waitForOpen();
    const res = await c.request('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'pi-test', version: '1.0' },
    });
    expect(res.result.serverInfo.name).toBe('human-assist');
    expect(res.result.protocolVersion).toBe('2025-03-26');
    expect(getMcpWsClientCount()).toBe(1);
    c.ws.close();
  });

  it('tools/list over WS returns all tools', async () => {
    const c = openClient();
    await c.waitForOpen();
    const res = await c.request('tools/list');
    expect(res.result.tools).toHaveLength(28);
    c.ws.close();
  });

  it('tools/call over WS opens a surface', async () => {
    const c = openClient();
    await c.waitForOpen();
    await c.request('initialize', { clientInfo: { name: 'pi-test' } });
    const res = await c.request('tools/call', {
      name: 'openInputSurface',
      arguments: { question: 'ws ok?', kind: 'confirm' },
    });
    expect(res.result.status).toBe('opened');
    c.ws.close();
  });

  it('graceful close removes the connection from the registry', async () => {
    const c = openClient();
    await c.waitForOpen();
    await c.request('initialize', { clientInfo: { name: 'pi-graceful' } });
    expect(getMcpWsClientCount()).toBe(1);
    c.ws.close();
    await new Promise((r) => setTimeout(r, 200));
    expect(getMcpWsClientCount()).toBe(0);
  });

  it('abrupt terminate is detected and cleaned up', async () => {
    const c = openClient();
    await c.waitForOpen();
    await c.request('initialize', { clientInfo: { name: 'pi-abrupt' } });
    expect(getMcpWsClientCount()).toBe(1);
    c.ws.terminate(); // simulate crash — no close handshake
    await new Promise((r) => setTimeout(r, 300));
    expect(getMcpWsClientCount()).toBe(0);
  });

  it('GET /status counts live initialized WS clients', async () => {
    const c = openClient();
    await c.waitForOpen();
    await c.request('initialize', { clientInfo: { name: 'pi-status' } });
    const s = await fetch(STATUS_URL).then((r) => r.json());
    expect(s.mcp.agentConnected).toBe(true);
    expect(s.mcp.agentCount).toBeGreaterThanOrEqual(1);
    c.ws.close();
  });
});

describe('showMessage — pi -> Electron toast proof-of-path', () => {
  it('broadcasts ui:message to surface WS clients', async () => {
    const surface = new WebSocket(`ws://127.0.0.1:${SURFACE_WS_PORT}`);
    // First event may be an agent:presence push; wait for the real thing.
    const got = new Promise<any>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('no ui:message within 5s')), 5000);
      surface.on('message', (d) => {
        const ev = JSON.parse(d.toString());
        if (ev.event === 'ui:message') {
          clearTimeout(t);
          resolve(ev);
        }
      });
    });
    await new Promise((r) => surface.once('open', r));

    const c = openClient();
    await c.waitForOpen();
    const res = await c.request('tools/call', {
      name: 'showMessage',
      arguments: { message: 'e2e toast', level: 'success', title: 'pi' },
    });
    expect(res.result.status).toBe('shown');

    const ev = await got;
    expect(ev.event).toBe('ui:message');
    expect(ev.data.message).toBe('e2e toast');
    expect(ev.data.level).toBe('success');
    expect(ev.data.title).toBe('pi');
    surface.close();
    c.ws.close();
  });

  it('validates message argument', async () => {
    const c = openClient();
    await c.waitForOpen();
    const res = await c.request('tools/call', { name: 'showMessage', arguments: {} });
    expect(res.error?.message).toContain('MCP_003');
    c.ws.close();
  });
});

describe('bindAgentSession — coding-session recording', () => {
  it('binds connection and tags subsequent surface broadcasts with agent identity', async () => {
    const surface = new WebSocket(`ws://127.0.0.1:${SURFACE_WS_PORT}`);
    const got = new Promise<any>((resolve) => {
      const onMsg = (d: unknown) => {
        const ev = JSON.parse(d.toString());
        if (ev.event === 'surface:push') {
          surface.off('message', onMsg);
          resolve(ev);
        }
      };
      surface.on('message', onMsg);
    });
    await new Promise((r) => surface.once('open', r));

    const c = openClient();
    await c.waitForOpen();
    await c.request('initialize', { clientInfo: { name: 'pi', version: '1.4.0' } });
    const bind = await c.request('tools/call', {
      name: 'bindAgentSession',
      arguments: { agentSessionId: 'pi-session-abc123', client: 'pi' },
    });
    expect(bind.result.status).toBe('bound');
    expect(bind.result.agentSessionId).toBe('pi-session-abc123');

    await c.request('tools/call', {
      name: 'openInputSurface',
      arguments: { question: 'recorded action', kind: 'confirm' },
    });
    const ev = await got;
    expect(ev.data.agent).toBeDefined();
    expect(ev.data.agent.client).toBe('pi');
    expect(ev.data.agent.agentSessionId).toBe('pi-session-abc123');
    surface.close();
    c.ws.close();
  });

  it('rejects missing agentSessionId with MCP_005', async () => {
    const c = openClient();
    await c.waitForOpen();
    const res = await c.request('tools/call', { name: 'bindAgentSession', arguments: {} });
    expect(res.error?.message).toContain('MCP_005');
    c.ws.close();
  });
});

describe('harness identity auto-bind (extension-injected args)', () => {
  it('binds connection from agentSessionId present on any tool call', async () => {
    const surface = new WebSocket(`ws://127.0.0.1:${SURFACE_WS_PORT}`);
    const got = new Promise<any>((resolve) => {
      const onMsg = (d: unknown) => {
        const ev = JSON.parse(d.toString());
        if (ev.event === 'surface:push') { surface.off('message', onMsg); resolve(ev); }
      };
      surface.on('message', onMsg);
    });
    await new Promise((r) => surface.once('open', r));

    const c = openClient();
    await c.waitForOpen();
    await c.request('initialize', { clientInfo: { name: '0xKobold', version: '0.1.0' } });
    // Simulate the pi extension's injected args on a normal action tool
    await c.request('tools/call', {
      name: 'openCanvasSurface',
      arguments: { prompt: 'chart', agentSessionId: 'harness-777', agentClient: 'pi' },
    });
    const ev = await got;
    expect(ev.data.agent).toEqual({ client: 'pi', agentSessionId: 'harness-777' });
    surface.close();
    c.ws.close();
  });
});

describe('agent:hello — presence on connect (no MCP call required)', () => {
  function rawSocket(): Promise<WebSocket> {
    const ws = new WebSocket(wsUrl());
    return new Promise((res, rej) => {
      ws.once('open', () => res(ws));
      ws.once('error', rej);
    });
  }
  function nextAck(ws: WebSocket): Promise<any> {
    return new Promise((res) => {
      const on = (d: Buffer | string) => {
        const m = JSON.parse(d.toString());
        if (m.type === 'agent:hello:ack') {
          ws.off('message', on);
          res(m);
        }
      };
      ws.on('message', on);
    });
  }

  it('binds identity and counts as a live agent immediately', async () => {
    const ws = await rawSocket();
    const ack = nextAck(ws);
    ws.send(JSON.stringify({ type: 'agent:hello', agentSessionId: 'hello-agent-1', agentClient: 'pi' }));
    expect((await ack).type).toBe('agent:hello:ack');

    const infos = getLiveAgentInfos().filter((a) => a.agentSessionId === 'hello-agent-1');
    expect(infos).toHaveLength(1);
    expect(infos[0].client).toBe('pi');
    ws.close();
  });

  it('dedupes multiple sockets with the same harness id', async () => {
    const a = await rawSocket();
    const b = await rawSocket();
    const ackA = nextAck(a);
    const ackB = nextAck(b);
    a.send(JSON.stringify({ type: 'agent:hello', agentSessionId: 'hello-dup', agentClient: 'pi' }));
    b.send(JSON.stringify({ type: 'agent:hello', agentSessionId: 'hello-dup', agentClient: 'pi' }));
    await ackA;
    await ackB;

    expect(getMcpWsClientCount()).toBeGreaterThanOrEqual(2); // raw sockets still 2
    const dupes = getLiveAgentInfos().filter((x) => x.agentSessionId === 'hello-dup');
    expect(dupes).toHaveLength(1); // presence deduped

    a.close();
    b.close();
  });
});
