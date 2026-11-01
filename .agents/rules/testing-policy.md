# Testing Policy — Playwright vs Electron

**Playwright (localhost:3616) is for layout & mechanics smoke tests only.**
It's fast for: CSS/layout regressions, console-error checks, component
states, guide/settings screens, tab rendering.

**The real test is always the Electron app.** Anything touching these is
only truly verified in the desktop window (my Electron instance, logs in
/tmp/electron-*.log):

- MCP presence (comes via IPC `desktop.mcp.getStatus/onStatus` — a plain
  tab shows "Standalone renderer" BY DESIGN, never agent presence)
- surfaces (surfaces only render/mount in the desktop app; standalone
  tabs start zero live services — no ws, no polling, no sync)
- consent prompts & grants (PermissionGate + PermissionBroker over the
  surface ws), handoff ("Your turn" + Done), persistent webview logins
- process manager controls, updater, reloadUI/restartApp
- IndexedDB persistence across real restarts

## Layout-testing the DESKTOP context in Playwright

Append `&stubBridge=1` to the dev URL:

    http://localhost:3616/?wsPort=3614&mcpPort=3615&stubBridge=1

This injects a dev-only stub `window.desktop` (never in production
builds), so the renderer runs its live-services path (ws connect,
surface rendering, presence via HTTP fallback) and you see what the
Electron window shows — minus real IPC (no webview guest, no window
controls).

## Verifying in Electron

- I can't screenshot the Electron window directly; I verify via:
  server logs (`[mcp]`, `[perm]`, `[guest]`, `[proc]`), `/status`,
  MCP round-trip calls, and asking you what you see.
- After main-process changes I restart the instance
  (`electron-vite dev` + Singleton cleanup); renderer changes hot-reload
  (Next dev) — or force via the `reloadUI` MCP tool.
