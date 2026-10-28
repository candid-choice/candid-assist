# Agent Browser Control + Session Recording

**Branch:** `feature/agent-browser-control` (from main @ f82c149, PR #7 merged)
**Status:** Feature 2 (session recording) implemented & green (uncommitted). Feature 1 (browser tools) not started. Feature 2b pending user: view auto-binds to active session. App running: next :3616, electron (apps/desktop) MCP :3615 / surface WS :3614 / WS MCP :43179.

## Feature 2 (DONE, awaiting commit approval)
- Backend: `SessionDoc.agentSessionId?/agentClient?` + create passthrough (controller/service)
- MCP: `bindAgentSession {agentSessionId, client?, title?}` — per-WS-connection `McpAgentCtx`; `initialize` captures clientInfo; every action broadcast carries `data.agent {client, agentSessionId}`
- Renderer: store `agentSessions` map (persisted); RootUI upserts dedicated session on first tagged action (title `pi · abc123 · HH:MM`, offline-queued); surfaces bind to it
- Tests: desktop 23 (bind/tag/MCP_005), renderer 186 (incl. agent map); tsc clean all packages
- pi usage: `echo $PI_SESSION_ID` in bash tool → `bindAgentSession` at session start

## Feature 2b (clear part; needs missing sentence)
- Default View A/B bind to **active session**; respond-to-session stays. Ask user: sentence cut off at "and ...".

## Feature 1 (pending)
- Browser automation tools + handoff (design above)

## Feature 1 — Agent-driven browser with human handoff
New MCP tools in `apps/desktop/src/mcp-server.ts` (+ WS presence of guest webviews):
- `browserNavigate {surfaceId, url}`, `browserSnapshot {surfaceId}` (text/ARIA + captchaDetected hint), `browserClick {surfaceId, selectorOrText}`, `browserType {surfaceId, selector, text}`, `browserScreenshot {surfaceId}`, `browserHandoff {surfaceId, reason}` (lock agent, prompt human, "Done — hand back" releases lock)
- Mechanics: main's `did-attach-webview` registers guest `webContents` keyed by surfaceId (pass via webview attribute → attach params). Automation via guest.executeJavaScript / capturePage. Handoff lock per-surface in MCP server; synced to renderer over surface WS.

## Feature 2 — Coding-session recording (sidebar)
- Pi's `PI_SESSION_ID` is bash-only (NOT in pi process env; extension can't interpolate it) → use `bindAgentSession {agentSessionId, client?, title?}` MCP tool: binds coding-session identity to the WS connection; server tags all subsequent actions from that connection with `{client, agentSessionId}`.
- Renderer upserts a user session per agentKey on first action (create via sync-service; title e.g. `pi · abc123 · 12:04`), stores `agentSessionId`/`agentClient` metadata; surfaces bind to that session.
- Rename: use existing `updateSessionTitle` path (verify sidebar wiring).
- Backend: add optional `agentSessionId?`, `agentClient?` to `SessionDoc` (apps/backend/src/types/firestore.ts:123) + create passthrough.

## Key files
- MCP server (dispatch + tools + WS server): `apps/desktop/src/mcp-server.ts`, `apps/desktop/src/mcp-websocket.ts`
- Main: `apps/desktop/electron/main/index.ts` (did-attach-webview ~line 137)
- Renderer surfaces: `apps/desktop-renderer/ui/views/components/surfaces/BrowserSurface/index.tsx` (<webview>, add surfaceId attr), SurfaceHost, store (sessions slice), `services/sync/sync-service.ts`
- WS events: `ui/views/services/ws-service.ts` (SurfaceEventType incl. ui:message)
- Tests: `apps/desktop/tests/*` (21) + `apps/desktop-renderer/tests/*` (185)

## Identity model decision (agreed with user)
- Join key = harness session UUID (pi: ctx.sessionManager.getSessionId() == PI_SESSION_ID == transcript filename id).
- pi: project-local extension `.pi/extensions/human-assist-identity.ts` injects {agentSessionId, agentClient} into every mcp_human_assist_* tool_call → server auto-binds per call (connection cache = convenience + fallback for non-call broadcasts).
- Known residual: server-originated broadcasts without a preceding call carry last-seen id (self-heals on next call). Acceptable.
- Claude Code: needs its own harness plugin (CC hooks receive session_id in payloads → post identify at SessionStart). No tool_call-mutation API there.
- One process ⇄ one WS connection assumption holds; multi-session-per-process handled by per-call overwrite.

## Conventions
- No commits/pushes without explicit instruction (`.agents/rules/version-control.md`)
- Keep both test suites + tsc green per step; small chunks; files > chat for state.
