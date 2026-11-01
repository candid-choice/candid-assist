/** Live-service startup guard.

The surface WebSocket, MCP presence polling, and server sync belong to
the Electron desktop runtime ONLY. A plain browser tab (Playwright,
someone opening localhost:3616) must not mirror agent sessions,
surfaces, toasts, or consent prompts — it starts no live services and
says so in the footer.
*/

import { getDesktopBridge } from "./desktop-bridge";

/**
 * View Portal: a DEV-ONLY debugging mode (?viewPortal=1) where a plain
 * browser tab port-links to the running desktop app's servers
 * (surface ws + HTTP /status) to OBSERVE agent activity. It is:
 *   - clearly labeled "View portal (read-only)" in the footer
 *   - receive-only: state-changing ws messages are refused (wsService)
 *   - never available in production builds
 * The desktop Electron window remains the only interactive runtime.
 */
export function isViewPortal(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV === "production") return false;
  return new URLSearchParams(window.location.search).has("viewPortal");
}

/** True when live services (WS/IPC/sync) may run. */
export function shouldStartLiveServices(): boolean {
  if (typeof window === "undefined") return false;
  return getDesktopBridge() !== undefined || isViewPortal();
}
