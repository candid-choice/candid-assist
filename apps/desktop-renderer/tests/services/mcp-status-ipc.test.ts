import { describe, it, expect, vi, afterEach } from "vitest";
import { useStore } from "@/views/store";
import { startMcpStatusPolling, stopMcpStatusPolling } from "@/views/services/mcp-status";
import type { McpStatusPayload } from "@/views/services/desktop-bridge";

const status = (count: number): McpStatusPayload => ({
  ok: true,
  mcp: {
    agentLastSeen: Date.now(),
    agentConnected: count > 0,
    agentCount: count,
    agents: [],
  },
  ws: { clients: count },
});

function installBridge() {
  let emit: ((s: McpStatusPayload) => void) | null = null;
  const getStatus = vi.fn(async () => status(2));
  const onStatus = vi.fn((cb: (s: McpStatusPayload) => void) => {
    emit = cb;
    return () => {
      emit = null;
    };
  });
  (window as unknown as { desktop: unknown }).desktop = {
    runtime: "electron",
    mcp: { getStatus, onStatus },
  };
  return {
    getStatus,
    push: (s: McpStatusPayload) => emit?.(s),
    uninstall: () => {
      delete (window as unknown as { desktop?: unknown }).desktop;
    },
  };
}

describe("mcp-status over IPC", () => {
  afterEach(() => {
    stopMcpStatusPolling();
    delete (window as unknown as { desktop?: unknown }).desktop;
    useStore.setState({ mcpAgentCount: 0, mcpStandalone: false } as never);
    vi.useRealTimers();
  });

  it("uses the bridge (no fetch) for initial + pushed counts", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const b = installBridge();
    startMcpStatusPolling();
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(useStore.getState().mcpAgentCount).toBe(2);
    expect(b.getStatus).toHaveBeenCalledTimes(1);

    b.push(status(3));
    expect(useStore.getState().mcpAgentCount).toBe(3);
    expect(useStore.getState().mcpStandalone).toBe(false);
  });

  it("marks standalone and never polls when there is no bridge", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    startMcpStatusPolling();
    expect(useStore.getState().mcpStandalone).toBe(true);
    expect(useStore.getState().mcpAgentCount).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("presence materializes sessions immediately", () => {
  it("a bound agent in an IPC presence push creates its sidebar row", async () => {
    const origFetch = global.fetch;
    global.fetch = vi.fn(
      async () => new Response(JSON.stringify({ id: "srv-1" }), { status: 201 }),
    ) as unknown as typeof fetch;
    const bridge = installBridge();
    startMcpStatusPolling(60_000);
    await new Promise((r) => setTimeout(r, 10)); // initial getStatus

    bridge.push({
      ok: true,
      mcp: {
        agentLastSeen: Date.now(),
        agentConnected: true,
        agentCount: 1,
        agents: [],
        wsAgents: [{ client: "pi", agentSessionId: "live-abc-123" }],
      },
      ws: { clients: 1 },
    });

    const st = useStore.getState();
    const row = Object.values(st.sessions).find((x) => x.agentSessionId === "live-abc-123");
    expect(row).toBeDefined();
    expect(st.agentSessions["pi::live-abc-123"]).toBeDefined();
    stopMcpStatusPolling();
    bridge.uninstall();
    global.fetch = origFetch;
  });
});
