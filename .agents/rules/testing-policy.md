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

## Three runtime modes (footer tells you which you're in)

1. **Electron desktop app** — the real runtime. `window.desktop` from
   the trusted preload unlocks everything: presence over IPC, surfaces,
   consent, controls.
2. **Standalone tab** (default for plain browsers) — no live services
   at all; footer: "Standalone renderer". Even with `?wsPort/?mcpPort`
   it observes nothing.
3. **View portal** (`?viewPortal=1`, DEV ONLY) — an explicitly-labeled
   OBSERVER: footer reads "View portal (read-only) · N agent(s)". It
   port-links to the desktop app (surface ws + HTTP /status) so you can
   debug agent activity in a browser console. Strictly receive-only:
   `wsService.send` refuses `permission:respond`, `process:control`,
   `handoff:complete`, and the consent modal renders with disabled
   buttons. It answers nothing; the desktop app decides everything.

The earlier `stubBridge` hack was removed (it let a tab impersonate the
desktop — design violation). The view portal replaces it honestly:
observation, clearly labeled, never impersonation.
