
## MCP servers (pi integration)

The main process hosts two MCP surfaces:

| Transport | Endpoint | Purpose |
|---|---|---|
| Streamable HTTP | `http://127.0.0.1:3615/mcp` (`MCP_PORT`) | legacy/curl demos, `GET /status` |
| **WebSocket** | `ws://127.0.0.1:43179/mcp` (`ELECTRON_MCP_WS_PORT`) | pi via `@0xkobold/pi-mcp` — true connection presence |
| Surface events WS | `ws://127.0.0.1:3614` (`WS_PORT`) | renderer receives `surface:push` |

Both MCP transports share one JSON-RPC dispatch (`processMcpMessage`)
and the same 7 `open*Surface` tools.

**pi setup (project-local, reproducible):**
1. `.pi/settings.json` → `packages` includes `npm:@0xkobold/pi-mcp@0.4.0` (pinned).
2. `.0xkobold/mcp.json` declares the servers this project needs from
   the extension (websocket `human-assist`). Only servers configured
   HERE run through the extension — pi packages like
   `@anthropics/playwright` register their own tools independently and
   must NOT be duplicated here.
3. Start the Electron app, open pi in this project, approve **project trust**, then `/mcp list` → `human-assist` should connect; tools appear as `mcp__human_assist__*`.

**Disconnect detection:** 15s ping/pong heartbeat; unresponsive clients
terminated on the next tick (~15–30s detection). Graceful close and
abrupt terminate both remove the connection immediately (verified in
`tests/mcp-ws.test.ts`). The footer's "N MCP agent(s) connected" counts
live initialized WS connections (+ any HTTP client seen within 60s).
