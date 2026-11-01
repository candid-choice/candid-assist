/** MCP agent presence — served over Electron IPC, never an HTTP probe.

The MCP server runs in Electron's MAIN (Node) process. The Electron
window asks main directly via `desktop.mcp.getStatus()`
(ipcRenderer.invoke → ipcMain.handle) and receives pushes whenever the
agent count changes (`desktop.mcp.onStatus`, webContents.send). A poll
remains only as a slow safety net for missed events.

A plain browser tab has no bridge → 'Standalone renderer' (there is no
MCP server belonging to that window; the HTTP /status endpoint exists
only for external/dev clients).
*/

import { useStore } from "../store";
import { getDesktopBridge, type McpStatusPayload } from "./desktop-bridge";
import { isViewPortal } from "./standalone-guard";

let unsubscribe: (() => void) | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function apply(status: McpStatusPayload | undefined): void {
  const count = status?.mcp?.agentCount ?? 0;
  useStore.getState().setMcpAgentCount(count);
  useStore
    .getState()
    .setMcpAgents(status?.mcp?.wsAgents ?? []);
}

/** Start presence tracking (idempotent). */
export function startMcpStatusPolling(intervalMs = 5_000): void {
  if (timer || unsubscribe) return;
  const bridge = getDesktopBridge();

  // View portal (dev + ?viewPortal=1): port-link to the desktop app's
  // HTTP /status — the ONLY non-IPC presence path, and read-only.
  if (!bridge && isViewPortal()) {
    const port = new URLSearchParams(window.location.search).get("mcpPort") ?? "3615";
    const poll = async () => {
      try {
        const res = await fetch(`http://localhost:${port}/status`, { signal: AbortSignal.timeout(3000) });
        apply((await res.json()) as McpStatusPayload);
      } catch {
        useStore.getState().setMcpAgentCount(0);
      }
    };
    void poll();
    timer = setInterval(() => void poll(), intervalMs);
    return;
  }

  if (!bridge) {
    // Plain browser tab: no desktop app owns an MCP server for us.
    useStore.getState().setMcpStandalone(true);
    useStore.getState().setMcpAgentCount(0);
    return;
  }
  useStore.getState().setMcpStandalone(false);

  if (!bridge.mcp) {
    // Older preload without the mcp channel: stay honest-offline.
    useStore.getState().setMcpAgentCount(0);
    return;
  }

  // Initial fetch + event stream from main.
  void bridge.mcp.getStatus().then(apply).catch(() => apply(undefined));
  unsubscribe = bridge.mcp.onStatus(apply);

  // Slow safety net in case an event was missed (e.g. window reload).
  timer = setInterval(() => {
    void bridge.mcp?.getStatus().then(apply).catch(() => apply(undefined));
  }, intervalMs);
}

export function stopMcpStatusPolling(): void {
  if (timer) clearInterval(timer);
  timer = null;
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
}
