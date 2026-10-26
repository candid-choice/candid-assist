/** MCP Server integration tests (Bun-side HTTP + WS, run under node).

Covers the tools/call router contract, per-tool validation, and the
WebSocket surface:push broadcast type mapping (renderer routing
depends on the correct type).
*/

import { describe, it, expect, beforeAll } from 'vitest';
import { startMcpServer } from '@/mcp-server';
import { WebSocket } from 'ws';

const HTTP_PORT = 3715;
const WS_PORT = 3716;
const MCP_URL = `http://localhost:${HTTP_PORT}/mcp`;

beforeAll(async () => {
  startMcpServer(HTTP_PORT, WS_PORT);

  // Poll until the HTTP server accepts requests
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(MCP_URL, {
        method: 'POST',
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/call', params: {}, id: 0 }),
      });
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error('MCP server did not start');
});

function call(params: unknown, id = 1) {
  return fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/call', params, id }),
  }).then((r) => r.json() as Promise<any>);
}

function receiveWsEvent(port: number, trigger: () => Promise<unknown>): Promise<any> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('WS event timeout'));
    }, 3000);

    ws.on('open', async () => {
      await trigger();
    });
    ws.on('message', (raw: Buffer) => {
      clearTimeout(timer);
      ws.close();
      resolve(JSON.parse(raw.toString()));
    });
    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

describe('MCP tools/call router', () => {
  it('opens a browser surface with a valid URL', async () => {
    const res = await call({ name: 'openBrowserSurface', arguments: { url: 'https://example.com' } });
    expect(res.error).toBeUndefined();
    expect(res.result.surfaceId).toMatch(/^surf_/);
    expect(res.result.status).toBe('opened');
  });

  it('rejects an invalid URL with MCP_001', async () => {
    const res = await call({ name: 'openBrowserSurface', arguments: { url: 'not-a-url' } });
    expect(res.error?.message).toContain('MCP_001');
  });

  it('rejects an unknown tool with -32601', async () => {
    const res = await call({ name: 'openNothing', arguments: {} });
    expect(res.error?.code).toBe(-32601);
  });

  it('rejects a non tools/call method with -32600', async () => {
    const res = await fetch(MCP_URL, {
      method: 'POST',
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
    }).then((r) => r.json());
    expect(res.error?.code).toBe(-32600);
  });

  it('returns parse error -32700 for malformed JSON', async () => {
    const res = await fetch(MCP_URL, { method: 'POST', body: 'not-json' }).then((r) =>
      r.json(),
    );
    expect(res.error?.code).toBe(-32700);
  });
});

describe('MCP input surface tool', () => {
  it('opens an input surface with question + kind', async () => {
    const res = await call({
      name: 'openInputSurface',
      arguments: { question: 'Pick a color', kind: 'choices', options: ['red', 'blue'] },
    });
    expect(res.error).toBeUndefined();
    expect(res.result.status).toBe('opened');
  });

  it('rejects a missing question with MCP_003', async () => {
    const res = await call({ name: 'openInputSurface', arguments: {} });
    expect(res.error?.message).toContain('MCP_003');
  });
});

describe('WebSocket surface:push broadcast', () => {
  it('broadcasts the stored surface type for browser surfaces', async () => {
    const event = await receiveWsEvent(WS_PORT, () =>
      call({ name: 'openBrowserSurface', arguments: { url: 'https://candid.ai' } }),
    );
    expect(event.event).toBe('surface:push');
    expect(event.data.type).toBe('browser');
    expect(event.data.status).toBe('pushed');
    expect(event.data.surfaceId).toMatch(/^surf_/);
  });

  it('broadcasts type "input" with payload passthrough for input surfaces', async () => {
    const event = await receiveWsEvent(WS_PORT, () =>
      call({
        name: 'openInputSurface',
        arguments: { question: 'Approve deploy?', kind: 'confirm' },
      }),
    );
    expect(event.event).toBe('surface:push');
    expect(event.data.type).toBe('input');
    expect(event.data.payload).toMatchObject({ question: 'Approve deploy?', kind: 'confirm' });
  });
});
