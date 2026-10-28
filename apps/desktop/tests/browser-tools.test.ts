/** Browser automation MCP tools — tests with fake Electron WebContents.

The guest registry resolver is injected with stubs, so these run in
plain node (no Electron) while exercising the real dispatch, handoff
locks, and surface-WS handoff release.
*/

import { describe, it, expect, beforeAll } from 'vitest';
import { WebSocket } from 'ws';

import { startMcpServer } from '@/mcp-server';
import { setGuestResolver, registerGuest, type GuestHandle } from '@/guest-registry';

const HTTP_PORT = 3745;
const SURFACE_WS_PORT = 3746;
const MCP = `http://localhost:${HTTP_PORT}/mcp`;

interface FakeState {
  lastUrl?: string;
  text?: string;
  captcha?: boolean;
  clickFound?: boolean;
  typeFound?: boolean;
}

const state: FakeState = {};

function fakeGuest(): GuestHandle {
  return {
    async executeJavaScript(code: string) {
      if (code.includes('captchaDetected')) {
        return {
          title: 'X Test',
          url: 'https://x.test',
          text: state.text ?? 'hello world',
          captchaDetected: state.captcha ?? false,
          interactive: [{ tag: 'button', text: 'Sign in' }],
        };
      }
      if (code.includes('scrollIntoView')) {
        return state.clickFound === false ? { ok: false } : { ok: true, desc: 'button#sign-in' };
      }
      if (code.includes('getOwnPropertyDescriptor')) {
        return state.typeFound === false ? { ok: false } : { ok: true };
      }
      return {};
    },
    async loadURL(url: string) {
      state.lastUrl = url;
    },
    async capturePage() {
      return { toDataURL: () => 'data:image/png;base64,QUJDRA==' };
    },
    isDestroyed: () => false,
    getURL: () => 'https://x.test',
  };
}

function call(name: string, args: Record<string, unknown> = {}) {
  return fetch(MCP, {
    method: 'POST',
    body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/call', params: { name, arguments: args }, id: 1 }),
  }).then((r) => r.json() as Promise<any>);
}

beforeAll(async () => {
  startMcpServer(HTTP_PORT, SURFACE_WS_PORT);
  setGuestResolver(() => fakeGuest());
  registerGuest('surf-1', 4242);
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(MCP, { method: 'POST', body: JSON.stringify({ jsonrpc: '2.0', method: 'ping', id: 0 }) });
      if (r.ok) return;
    } catch {
      /* wait */
    }
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error('server did not start');
});

describe('browser tools', () => {
  it('navigates the guest', async () => {
    const res = await call('browserNavigate', { url: 'https://react.dev/learn' });
    expect(res.result.status).toBe('navigated');
    expect(res.result.surfaceId).toBe('surf-1');
    expect(state.lastUrl).toBe('https://react.dev/learn');
  });

  it('rejects relative urls', async () => {
    const res = await call('browserNavigate', { url: 'react.dev' });
    expect(res.error?.message).toContain('BROWSER_006');
  });

  it('snapshots page + flags captcha', async () => {
    const snap = await call('browserSnapshot', {});
    expect(snap.result.text).toBe('hello world');
    expect(snap.result.captchaDetected).toBe(false);

    state.captcha = true;
    const capped = await call('browserSnapshot', {});
    expect(capped.result.captchaDetected).toBe(true);
    state.captcha = false;
  });

  it('clicks by selector or text', async () => {
    const ok = await call('browserClick', { text: 'Sign in' });
    expect(ok.result.status).toBe('clicked');
    expect(ok.result.element).toBe('button#sign-in');

    state.clickFound = false;
    const miss = await call('browserClick', { text: 'Nope' });
    expect(miss.error?.message).toContain('BROWSER_008');
    state.clickFound = undefined;

    const nothing = await call('browserClick', {});
    expect(nothing.error?.message).toContain('BROWSER_007');
  });

  it('types into inputs', async () => {
    const ok = await call('browserType', { selector: '#email', text: 'a@b.c' });
    expect(ok.result.status).toBe('typed');
    state.typeFound = false;
    const miss = await call('browserType', { selector: '#gone', text: 'x' });
    expect(miss.error?.message).toContain('BROWSER_010');
    state.typeFound = undefined;
  });

  it('screenshots as data URL', async () => {
    const res = await call('browserScreenshot', {});
    expect(res.result.dataUrl).toMatch(/^data:image\/png/);
  });

  it('errors on unknown surface', async () => {
    const res = await call('browserSnapshot', { surfaceId: 'nope' });
    expect(res.error?.message).toContain('BROWSER_002');
  });
});

describe('human handoff', () => {
  it('locks agent tools until the human clicks Done', async () => {
    const open = await call('browserHandoff', { reason: 'solve the CAPTCHA' });
    expect(open.result.status).toBe('awaiting_human');
    expect(open.result.reason).toBe('solve the CAPTCHA');

    const blocked = await call('browserClick', { text: 'Sign in' });
    expect(blocked.error?.message).toContain('BROWSER_005');

    const blockedNav = await call('browserNavigate', { url: 'https://example.com' });
    expect(blockedNav.error?.message).toContain('BROWSER_005');

    // snapshot stays available (read-only) and reports the handoff
    const snap = await call('browserSnapshot', {});
    expect(snap.result.handoffActive).toBe(true);

    // human clicks Done — renderer sends handoff:complete over the surface WS
    const ws = new WebSocket(`ws://127.0.0.1:${SURFACE_WS_PORT}`);
    await new Promise<void>((resolve) => ws.once('open', () => resolve()));
    ws.send(JSON.stringify({ type: 'handoff:complete', surfaceId: 'surf-1' }));
    await new Promise((r) => setTimeout(r, 150));
    ws.close();

    const unblocked = await call('browserClick', { text: 'Sign in' });
    expect(unblocked.result.status).toBe('clicked');
  });
});
