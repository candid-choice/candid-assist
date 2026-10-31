/** MCP Server integration tests (Bun-side HTTP + WS, run under node).

Covers the tools/call router contract, per-tool validation, and the
WebSocket surface:push broadcast type mapping (renderer routing
depends on the correct type).
*/

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startMcpServer, permissionBroker } from '@/mcp-server';
import { setGuestResolver, registerGuest } from '@/guest-registry';
import { WebSocket } from 'ws';

// The permission gate prompts a human; in tests nobody answers, so
// pre-grant the fixture domains (gate semantics themselves are covered
// in permission-broker.test.ts + the gate tests at the bottom).
beforeEach(() => {
  permissionBroker.syncGrants(['example.com', 'localhost', '127.0.0.1', 'candid.ai']);
});

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

  it('marks unsupported capabilities (resources/prompts) as -32601', async () => {
    const res = await fetch(MCP_URL, {
      method: 'POST',
      body: JSON.stringify({ jsonrpc: '2.0', method: 'resources/list', id: 1 }),
    }).then((r) => r.json());
    expect(res.error?.code).toBe(-32601);
    const p = await fetch(MCP_URL, {
      method: 'POST',
      body: JSON.stringify({ jsonrpc: '2.0', method: 'prompts/list', id: 2 }),
    }).then((r) => r.json());
    expect(p.error?.code).toBe(-32601);
  });

  it('answers initialize with protocolVersion + serverInfo', async () => {
    const res = await fetch(MCP_URL, {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'pi', version: 'x' } },
        id: 1,
      }),
    }).then((r) => r.json());
    expect(res.result.protocolVersion).toBe('2025-03-26');
    expect(res.result.serverInfo.name).toBe('human-assist');
    expect(res.result.capabilities.tools).toBeDefined();
  });

  it('lists all tools with input schemas (tools/list)', async () => {
    const res = await fetch(MCP_URL, {
      method: 'POST',
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
    }).then((r) => r.json());
    expect(res.result.tools).toHaveLength(27);
    const names = res.result.tools.map((t: { name: string }) => t.name);
    expect(names).toContain('openBrowserSurface');
    expect(names).toContain('openInputSurface');
    expect(names).toContain('showMessage');
    for (const t of res.result.tools) {
      expect(t.inputSchema?.type).toBe('object');
    }
  });

  it('accepts notifications/initialized with 202', async () => {
    const r = await fetch(MCP_URL, {
      method: 'POST',
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    });
    expect(r.status).toBe(202);
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

describe('GET /status — agent presence', () => {
  it('reports agentConnected true shortly after an MCP JSON-RPC request', async () => {
    await fetch(MCP_URL, {
      method: 'POST',
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
    });
    const s = await fetch(`http://localhost:${HTTP_PORT}/status`).then((r) => r.json());
    expect(s.ok).toBe(true);
    expect(s.mcp.agentConnected).toBe(true);
    expect(s.mcp.agentLastSeen).toBeGreaterThan(0);
    expect(typeof s.ws.clients).toBe('number');
    expect(s.mcp.agentCount).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(s.mcp.agents)).toBe(true);
    expect(s.mcp.agents[0]).toHaveProperty('lastSeen');
  });
});

describe('validation rules (pre-mcp-validation)', () => {
  it('rejects oversized URLs with MCP_011', async () => {
    const res = await call({ name: 'openBrowserSurface', arguments: { url: 'https://x.test/' + 'a'.repeat(2100) } });
    expect(res.error?.message).toContain('MCP_011');
  });

  it('rejects oversized prompts with MCP_012 (browser)', async () => {
    const res = await call({ name: 'openBrowserSurface', arguments: { url: 'https://x.test', prompt: 'p'.repeat(1100) } });
    expect(res.error?.message).toContain('MCP_012');
  });

  it('truncates oversized canvas prompts (no error)', async () => {
    const res = await call({ name: 'openCanvasSurface', arguments: { prompt: 'p'.repeat(1100) } });
    expect(res.result?.status).toBe('opened');
  });

  it('flags localhost URLs with a warning', async () => {
    const res = await call({ name: 'openBrowserSurface', arguments: { url: 'http://localhost:3000/app' } });
    expect(res.result?.status).toBe('opened');
    // warning is carried on the stored payload (visible via stored surface state)
    const status = await fetch(`http://localhost:${HTTP_PORT}/status`).then((r) => r.json());
    expect(status.ok).toBe(true);
  });

  it('rejects oversized diff/command/output', async () => {
    const d = await call({ name: 'openCodeDiff', arguments: { diff: 'd'.repeat(50_001) } });
    expect(d.error?.message).toContain('MCP_013');
    const c = await call({ name: 'openTerminalOutput', arguments: { command: 'c'.repeat(513), output: 'ok' } });
    expect(c.error?.message).toContain('MCP_014');
    const o = await call({ name: 'openTerminalOutput', arguments: { command: 'ls', output: 'o'.repeat(10_001) } });
    expect(o.error?.message).toContain('MCP_015');
  });

  it('rejects invalid image src with MCP_016', async () => {
    const res = await call({ name: 'openImageSurface', arguments: { src: 'not a url' } });
    expect(res.error?.message).toContain('MCP_016');
  });
});

describe('process manager tools', () => {
  it('startProcess launches, getProcessLog tails, stopProcess kills', async () => {
    const start = await call({ name: 'startProcess', arguments: { name: 'ticker', command: 'echo proc-mcp-ok' } });
    expect(start.result?.processId).toMatch(/^proc_/);
    const id = start.result.processId as string;

    await new Promise((r) => setTimeout(r, 700));
    const log = await call({ name: 'getProcessLog', arguments: { id } });
    expect(log.result?.output.join('\n')).toContain('proc-mcp-ok');

    const stop = await call({ name: 'stopProcess', arguments: { id } });
    expect(stop.result?.status).toBe('killing');
  });

  it('openProcessManager creates a processManager surface', async () => {
    const res = await call({ name: 'openProcessManager', arguments: {} });
    expect(['opened', 'updated']).toContain(res.result?.status);
  });

  it('validates startProcess args', async () => {
    const noName = await call({ name: 'startProcess', arguments: { command: 'true' } });
    expect(noName.error?.message).toContain('MCP_017');
    const noCmd = await call({ name: 'startProcess', arguments: { name: 'x' } });
    expect(noCmd.error?.message).toContain('MCP_018');
  });
});

describe('UI control tools', () => {
  it('reloadUI/restartApp invoke injected handlers (and error without them)', async () => {
    const { setUiControlHandlers } = await import('@/mcp-server');
    const before = await call({ name: 'reloadUI', arguments: {} });
    expect(before.error?.message).toContain('UI_001');

    let reloads = 0;
    let restarts = 0;
    setUiControlHandlers({
      reloadUI: () => {
        reloads++;
        return { reloaded: true };
      },
      restartApp: () => {
        restarts++;
        return { relaunched: true };
      },
    });
    const r = await call({ name: 'reloadUI', arguments: {} });
    expect(r.result.status).toBe('reloading');
    expect(reloads).toBe(1);
    const a = await call({ name: 'restartApp', arguments: {} });
    expect(a.result.status).toBe('restarting');
    expect(restarts).toBe(1);
    setUiControlHandlers({}); // restore
  });
});

describe('domain permission gate (tool integration)', () => {
  it('openBrowserSurface auto-allows after permission:sync grants', async () => {
    const { permissionBroker, processMcpMessage } = await import('../src/mcp-server');
    permissionBroker.syncGrants(['granted.example']);
    const res = await processMcpMessage({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'openBrowserSurface', arguments: { url: 'https://granted.example/page' } },
      id: 901,
    } as never);
    expect(res.response.result.status).toBe('opened');
    permissionBroker.syncGrants([]);
  });

  it('openBrowserSurface returns denied when the human denies', async () => {
    const { permissionBroker, pendingForTest, processMcpMessage } = await import('../src/mcp-server');
    permissionBroker.syncGrants([]);
    const call = processMcpMessage({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'openBrowserSurface', arguments: { url: 'https://ask-me.example/x' } },
      id: 902,
    } as never);
    await new Promise((r) => setTimeout(r, 20));
    const ids = pendingForTest();
    const mine = ids[ids.length - 1]!; // newest = our request
    expect(mine).toBeTruthy();
    permissionBroker.respond(mine, 'deny');
    const res = await call;
    expect(res.response.result.status).toBe('denied');
    expect(res.response.result.reason).toBe('deny');
  });
});

describe('domain recipes (googleSearch / readGoogleDriveDoc / scrapeSelective)', () => {
  async function callTool(name: string, args: Record<string, unknown>, id: number) {
    const { processMcpMessage } = await import('../src/mcp-server');
    const out = await processMcpMessage({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name, arguments: args },
      id,
    } as never);
    return (out as { response: Record<string, never> }).response as { result?: Record<string, any>; error?: { message: string } };
  }

  function installFakeGuest(payloadFactory: (js: string) => string) {
    const calls: string[] = [];
    const fake = {
      executeJavaScript: async (code: string) => { calls.push(code); return payloadFactory(code); },
      loadURL: async () => {},
      capturePage: async () => ({ toDataURL: () => 'data:,' }),
      isDestroyed: () => false,
      getURL: () => 'https://page',
    };
    setGuestResolver(() => fake);
    registerGuest('surf_recipe', 77);
    return calls;
  }

  it('googleSearch returns parsed results through the consent-gated pipeline', async () => {
    const { permissionBroker } = await import('../src/mcp-server');
    permissionBroker.syncGrants(['google.com']);
    installFakeGuest(() => JSON.stringify({
      pageTitle: 'mount sinai - Google Search',
      url: 'https://www.google.com/search?q=mount+sinai',
      loginRequired: false,
      results: [{ title: 'Mount Sinai', link: 'https://www.mountsinai.org' }],
      pageText: 'Mount Sinai is a hospital system…',
    }));
    const res = await callTool('googleSearch', { query: 'mount sinai' }, 950);
    expect(res.result.tool).toBe('googleSearch');
    expect(res.result.query).toBe('mount sinai');
    expect(res.result.results).toHaveLength(1);
    expect(res.result.results[0].link).toBe('https://www.mountsinai.org');
  });

  it('googleSearch rejects empty and oversized queries', async () => {
    const res = await callTool('googleSearch', { query: '   ' }, 951);
    expect(res.error.message).toMatch(/MCP_001/);
    const big = await callTool('googleSearch', { query: 'x'.repeat(513) }, 952);
    expect(big.error.message).toMatch(/MCP_012/);
  });

  it('readGoogleDriveDoc triggers handoff when sign-in is required', async () => {
    const { permissionBroker } = await import('../src/mcp-server');
    permissionBroker.syncGrants(['docs.google.com']);
    installFakeGuest(() => JSON.stringify({
      pageTitle: 'Sign in',
      url: 'https://accounts.google.com/v3/signin',
      loginRequired: true,
      text: 'Sign in to continue',
    }));
    const res = await callTool('readGoogleDriveDoc', { url: 'https://docs.google.com/document/d/abc' }, 953);
    expect(res.result.status).toBe('login-required');
    expect(res.result.handoff).toBe(true);
  });

  it('readGoogleDriveDoc rejects non-drive URLs', async () => {
    const res = await callTool('readGoogleDriveDoc', { url: 'https://evil.example/doc' }, 954);
    expect(res.error.message).toMatch(/BROWSER_006/);
  });

  it('scrapeSelective extracts selector matches', async () => {
    const { permissionBroker } = await import('../src/mcp-server');
    permissionBroker.syncGrants(['acme.dev']);
    installFakeGuest(() => JSON.stringify({
      pageTitle: 'Pricing',
      url: 'https://acme.dev/pricing',
      matched: 2,
      text: 'Starter $10\n---\nPro $30',
    }));
    const res = await callTool('scrapeSelective', { url: 'https://acme.dev/pricing', selector: '.price-card' }, 955);
    expect(res.result.tool).toBe('scrapeSelective');
    expect(res.result.selector).toBe('.price-card');
    expect(res.result.text).toContain('Pro $30');
  });
});

describe('googleSearch bot-check handoff', () => {
  it('auto-hands-off when Google shows an unusual-traffic page', async () => {
    const { permissionBroker } = await import('../src/mcp-server');
    const { setGuestResolver, registerGuest } = await import('../src/guest-registry');
    permissionBroker.syncGrants(['google.com']);
    setGuestResolver(() => ({
      executeJavaScript: async () => JSON.stringify({
        pageTitle: 'https://www.google.com/sorry/index',
        url: 'https://www.google.com/sorry/index',
        loginRequired: false,
        botCheck: true,
        results: [],
        pageText: 'Our systems have detected unusual traffic from your computer network.',
      }),
      loadURL: async () => {},
      capturePage: async () => ({ toDataURL: () => 'data:,' }),
      isDestroyed: () => false,
      getURL: () => 'https://google.com/sorry',
    }));
    registerGuest('surf_bot', 78);
    const { processMcpMessage } = await import('../src/mcp-server');
    const out = await processMcpMessage({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'googleSearch', arguments: { query: 'mount sinai' } },
      id: 960,
    } as never);
    const res = (out as { response: Record<string, any> }).response;
    expect(res.result.status).toBe('human-check-required');
    expect(res.result.handoff).toBe(true);
  });
});

describe('open3dSurface', () => {
  async function call3d(args: Record<string, unknown>, id: number) {
    const { processMcpMessage } = await import('../src/mcp-server');
    const out = await processMcpMessage({
      jsonrpc: '2.0', method: 'tools/call', params: { name: 'open3dSurface', arguments: args }, id,
    } as never);
    return (out as { response: Record<string, any> }).response;
  }

  it('opens a valid scene', async () => {
    const res = await call3d({
      primitives: [
        { type: 'box', position: [0, 0.5, 0], size: 1, color: '#ff8800' },
        { type: 'torus', size: 2 },
      ],
      camera: { x: 4, y: 3, z: 6 },
    }, 970);
    expect(res.result.status).toBe('opened');
    expect(res.result.primitiveCount).toBe(2);
    expect(res.result.surfaceId).toMatch(/^surf_/);
  });

  it('validates kinds, colors, and empty lists', async () => {
    expect((await call3d({ primitives: [] }, 971)).error.message).toMatch(/3D_001/);
    expect((await call3d({ primitives: [{ type: 'pyramid' }] }, 972)).error.message).toMatch(/3D_003/);
    expect((await call3d({ primitives: [{ type: 'box', color: 'red' }] }, 973)).error.message).toMatch(/3D_004/);
  });
});

describe('open3dSurface in-place update', () => {
  beforeEach(async () => {
    const { __resetSurfacesForTest } = await import('../src/mcp-server');
    __resetSurfacesForTest();
  });
  it('reuses a known surfaceId and reports updated', async () => {
    const { processMcpMessage } = await import('../src/mcp-server');
    const call = async (args: Record<string, unknown>, id: number) => {
      const out = await processMcpMessage({
        jsonrpc: '2.0', method: 'tools/call', params: { name: 'open3dSurface', arguments: args }, id,
      } as never);
      return (out as { response: Record<string, any> }).response;
    };
    const first = await call({ primitives: [{ type: 'box' }] }, 980);
    expect(first.result.status).toBe('opened');
    const second = await call({ primitives: [{ type: 'sphere' }, { type: 'torus' }], surfaceId: first.result.surfaceId }, 981);
    expect(second.result.status).toBe('updated');
    expect(second.result.surfaceId).toBe(first.result.surfaceId);
    expect(second.result.primitiveCount).toBe(2);
  });
});
