/** MCP agent presence — polls the desktop MCP server's /status endpoint.

The footer indicator should reflect whether an AGENT (pi.dev, Claude
Code) is actually connected to the MCP server, which only the server
knows (it timestamps incoming JSON-RPC). This module polls
GET http://localhost:3615/status and mirrors agentConnected into the
store (volatile).

Port overridable via ?mcpPort= query param (Electron main appends it
alongside wsPort) or VITE_MCP_URL.
*/

import { useStore } from "../store";

function mcpStatusUrl(): string {
  if (typeof window === "undefined") return "http://localhost:3615/status";
  const params = new URLSearchParams(window.location.search);
  const mcpPort = params.get("mcpPort");
  if (mcpPort) return `http://localhost:${mcpPort}/status`;
  return import.meta.env?.VITE_MCP_URL
    ? `${import.meta.env.VITE_MCP_URL.replace(/\/mcp\/?$/, "")}/status`
    : "http://localhost:3615/status";
}

let timer: ReturnType<typeof setInterval> | null = null;

async function tick(url: string): Promise<void> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const data = (await res.json()) as {
      mcp?: { agentConnected?: boolean; agentCount?: number };
    };
    const count =
      data?.mcp?.agentCount ?? (data?.mcp?.agentConnected ? 1 : 0);
    useStore.getState().setMcpAgentCount(count);
  } catch {
    // Server unreachable → definitely no agent
    useStore.getState().setMcpAgentCount(0);
  }
}

/** Start polling (idempotent). 10s cadence. */
export function startMcpStatusPolling(intervalMs = 5_000): void {
  if (timer) return;
  const url = mcpStatusUrl();
  void tick(url);
  timer = setInterval(() => void tick(url), intervalMs);
}

export function stopMcpStatusPolling(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
