import { describe, it, expect, afterEach } from 'vitest';
import { processMcpMessage, setMcpSignedIn, isMcpSignedIn, type McpAgentCtx } from '../src/mcp-server';

const ctx = {} as McpAgentCtx;
const msg = (method: string, params?: unknown) =>
  ({ jsonrpc: '2.0', id: 1, method, params }) as never;

describe('MCP signed-out lockdown', () => {
  afterEach(() => setMcpSignedIn(true));

  it('defaults to unlocked for non-Electron callers', () => {
    expect(isMcpSignedIn()).toBe(true);
  });

  it('advertises zero tools while signed out', async () => {
    setMcpSignedIn(false);
    const { response } = await processMcpMessage(msg('tools/list'), ctx);
    expect((response as any).result.tools).toEqual([]);
  });

  it('refuses tool calls with a friendly agent-facing error', async () => {
    setMcpSignedIn(false);
    const { response } = await processMcpMessage(
      msg('tools/call', { name: 'showMessage', arguments: { message: 'hi' } }),
      ctx,
    );
    expect((response as any).result.isError).toBe(true);
    expect((response as any).result.content[0].text).toMatch(/must sign in/);
  });

  it('keeps handshake and ping working so clients do not mark the server broken', async () => {
    setMcpSignedIn(false);
    const init = await processMcpMessage(msg('initialize', { protocolVersion: '2025-03-26' }), ctx);
    expect((init.response as any).result.serverInfo.name).toBe('human-assist');
    const ping = await processMcpMessage(msg('ping'), ctx);
    expect((ping.response as any).result).toEqual({});
  });

  it('restores full tool access on sign-in', async () => {
    setMcpSignedIn(false);
    setMcpSignedIn(true);
    const { response } = await processMcpMessage(msg('tools/list'), ctx);
    expect((response as any).result.tools.length).toBeGreaterThan(5);
  });
});
