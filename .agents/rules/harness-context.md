---
description: Shared context for harness plugin — port resolution, MCP validation, process control
---

# Harness Shared Context

These rules are shared across all harness skills. Reference them via `@harness-context.md` in SKILL.md frontmatter.

## Port Resolution

- The harness MCP server defaults to port **3602** as configured in `.mcp.json`.
- Port can be overridden via `$HARNESS_PORT` env var or the `harness.url` field in `.mcp.json`.
- Extract the port from `.mcp.json` with:
  ```bash
  PORT=$(node -e "const s=JSON.parse(require('fs').readFileSync('.mcp.json','utf8'));console.log(s.mcpServers.harness.url?.match(/:(\d+)/)?.[1] ?? '3602');")
  ```

## Vite Port

- The Vite renderer dev server defaults to port **3200**.
- `start.sh` kills any process on port 3200 before starting to avoid conflicts.

## MCP Server Validation

- The harness server entry in `.mcp.json` must have `"type": "http"` and a `url` field.
- Ensure the entry is present and not marked `disabled: true`.
- When modifying `.mcp.json`, preserve formatting and existing server entries.

## Process Control

- Track active harness PIDs in `.claude/skills/harness/.harness.pid` (relative to repo root).
- Use `lsof -ti :$PORT` to verify port availability before operations.
- Graceful shutdown: send SIGTERM first, wait 1–2s, then SIGKILL if still running.
- Always verify the process has stopped (health endpoint unreachable) before reporting success.
- **STOP IS FINAL.** When executing stop.sh, do NOT run start.sh after — do not attempt to "verify by restarting."
  Report stopped status and stop. The user will start explicitly if needed.

## Architecture

The Harness desktop app uses **Electrobun 2.x** as the desktop runtime:

- Main process: `apps/desktop/src/main.ts`
- Renderer: `apps/renderer/` (Vite, port 3200)
- RPC: `@harness/types` schema (BunRequests, WebviewMessages, etc.)
- Platform abstraction: `src/platform/` (isolates Electrobun from business logic)

### Two modes

```
Development:
  BrowserWindow → http://localhost:3200 (Vite dev server, HMR)

Production:
  BrowserWindow → views://renderer/index.html (bundled Vite assets)
```

### Dev/Prod URL

Driven by `ELECTROBUN_ENV` environment variable:
- `development` → Vite dev server URL
- `production` → `views://` bundled URL
