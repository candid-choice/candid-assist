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

  it('tools/list over WS returns the 7 tools', async () => {
    const c = openClient();
    await c.waitForOpen();
    const res = await c.request('tools/list');
    expect(res.result.tools).toHaveLength(7);
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
