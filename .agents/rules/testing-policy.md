# Testing Policy — Playwright vs Electron

**Playwright (localhost:3616) is for layout & mechanics smoke tests only.**
It's fast for: CSS/layout regressions, console-error checks, component
states, guide/settings screens, tab rendering — in STANDALONE mode only.

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

## Verifying in Electron

- I can't screenshot the Electron window directly; I verify via:
  server logs (`[mcp]`, `[perm]`, `[guest]`, `[proc]`), `/status`,
  MCP round-trip calls, and asking you what you see.
- After main-process changes I restart the instance
  (`electron-vite dev` + Singleton cleanup); renderer changes hot-reload
  (Next dev) — or force via the `reloadUI` MCP tool.

## Why plain tabs can NEVER see MCP

`getDesktopBridge()` is strict: only the real Electron preload
(`window.desktop` with `runtime: 'electron'`) unlocks live services.
A plain tab (even with `?wsPort`/`?mcpPort`/`?stubBridge` params):
- starts no WebSocket connection (standalone guard)
- polls nothing; presence exists only over IPC
- shows "Standalone renderer" in the footer

There is deliberately **no dev stub bridge** and no HTTP presence
fallback — browser-side observation of MCP was tried and removed as a
design violation (2026-11-01). If you need desktop-context layout
checks, screenshot the Electron app (ask the human) instead.
