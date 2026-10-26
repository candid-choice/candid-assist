/** WsService connection-state tests.

Uses a mocked global WebSocket to drive the real WsService singleton
through connect → open → close → reconnect and asserts the
onConnectionChange emission sequence, deduplication, and unsubscribe.
*/

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  url: string;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  close() {
    this.closed = true;
  }
}

async function getService() {
  const mod = await import('@/views/services/ws-service');
  return mod.wsService;
}

describe('WsService connection state', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('emits connecting on connect(), then connected on open', async () => {
    const wsService = await getService();
    const states: string[] = [];
    wsService.onConnectionChange((s) => states.push(s));

    wsService.connect();
    expect(states).toEqual(['connecting']);
    expect(MockWebSocket.instances).toHaveLength(1);

    MockWebSocket.instances[0]!.onopen!();
    expect(states).toEqual(['connecting', 'connected']);
    expect(wsService.isConnected).toBe(true);

    wsService.disconnect();
  });

  it('emits disconnected on close and schedules a reconnect', async () => {
    const wsService = await getService();
    const states: string[] = [];
    wsService.onConnectionChange((s) => states.push(s));

    wsService.connect();
    MockWebSocket.instances[0]!.onopen!();
    MockWebSocket.instances[0]!.onclose!();

    expect(states).toEqual(['connecting', 'connected', 'disconnected']);

    // Reconnect after 1s backoff → new socket, back to connecting
    vi.advanceTimersByTime(1000);
    expect(MockWebSocket.instances).toHaveLength(2);
    expect(states[states.length - 1]).toBe('connecting');

    wsService.disconnect();
    vi.clearAllTimers();
  });

  it('emits disconnected on error', async () => {
    const wsService = await getService();
    const states: string[] = [];
    wsService.onConnectionChange((s) => states.push(s));

    wsService.connect();
    MockWebSocket.instances[0]!.onerror!();

    expect(states).toEqual(['connecting', 'disconnected']);
    expect(MockWebSocket.instances[0]!.closed).toBe(true);

    wsService.disconnect();
    vi.clearAllTimers();
  });

  it('dedupes repeated identical states', async () => {
    const wsService = await getService();
    const states: string[] = [];
    wsService.onConnectionChange((s) => states.push(s));

    wsService.connect();
    const socket = MockWebSocket.instances[0]!;
    socket.onopen!();
    socket.onopen!(); // second open — no duplicate 'connected'

    expect(states).toEqual(['connecting', 'connected']);
    wsService.disconnect();
  });

  it('disconnect() emits disconnected and stops reconnecting', async () => {
    const wsService = await getService();
    const states: string[] = [];
    wsService.onConnectionChange((s) => states.push(s));

    wsService.connect();
    MockWebSocket.instances[0]!.onopen!();
    wsService.disconnect();

    expect(states).toEqual(['connecting', 'connected', 'disconnected']);

    // Advance well past max backoff — no new sockets created
    vi.advanceTimersByTime(60_000);
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('unsubscribe stops further notifications', async () => {
    const wsService = await getService();
    const cb = vi.fn();
    const unsubscribe = wsService.onConnectionChange(cb);
    unsubscribe();

    wsService.connect();
    expect(cb).not.toHaveBeenCalled();
    wsService.disconnect();
    vi.clearAllTimers();
  });

  it('still delivers surface events via subscribe()', async () => {
    const wsService = await getService();
    const events: unknown[] = [];
    wsService.subscribe((e) => events.push(e));

    wsService.connect();
    const payload = {
      event: 'surface:push',
      data: { surfaceId: 's1', type: 'input', payload: {}, status: 'active' },
      timestamp: 123,
    };
    MockWebSocket.instances[0]!.onmessage!({ data: JSON.stringify(payload) });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(payload);

    // Malformed JSON is ignored, not thrown
    MockWebSocket.instances[0]!.onmessage!({ data: 'not-json' });
    expect(events).toHaveLength(1);

    wsService.disconnect();
    vi.clearAllTimers();
  });
});
