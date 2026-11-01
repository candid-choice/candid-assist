/** Live-service startup guard.

The surface WebSocket, MCP presence polling, and server sync belong to
the Electron desktop runtime ONLY. A plain browser tab (Playwright,
someone opening localhost:3616) must not mirror agent sessions,
surfaces, toasts, or consent prompts — it starts no live services and
says so in the footer.
*/

import { getDesktopBridge } from "./desktop-bridge";

/** True when live services (WS/IPC/sync) may run. */
export function shouldStartLiveServices(): boolean {
  if (typeof window === "undefined") return false;
  return getDesktopBridge() !== undefined;
}
