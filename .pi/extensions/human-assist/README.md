# human-assist — pi extension (project-local)

The pi side of Human Assist: it owns the WebSocket MCP connection to
`apps/desktop` and mirrors the desktop app's tools as native pi tools.

This package is **specific to developing candid-assist** — it lives in the
repo (not a submodule, no remote of its own). The dev-stack keeper is the
separate `pi-dev-stack` package next door.

## What it does

- **Owns the MCP WebSocket** to `ws://127.0.0.1:43179/mcp` (override:
  `HARNESS_MCP_WS_URL` or `wsUrl` in `.pi/human-assist.json`). Single-flight
  connect, MCP `initialize` handshake, `agent:hello` presence announce,
  exponential-backoff reconnect with a bounded retry budget.
- **Native tools from the server manifest:** pulls `tools/list` and registers
  every tool as a pi tool (snake_case names). `agentClient` /
  `agentSessionId` / `agentProject` are stripped from the model-facing schema
  and stamped on every call — the model cannot forge them.
- **Signed-out tolerance:** the server advertises zero tools until the human
  signs in; keeps a bounded window and prompts instead of failing.
- **`/goal <text>`** delegates a high-level goal to the desktop agent
  (`delegateTask`) and reports the parsed outcome.
- **Footer:** contributes ` ha ●` (connection dot) to the footer row.
  **Click it to inspect the desktop traffic** — every call we sent, the
  identity-stamped arguments, and what came back (last 60 calls, errors
  included). It opens in **the same fullscreen viewer as the keeper's stack
  logs** (via `globalThis.__piDevStackViewer`), so operation is identical:
  scroll window, wheel, `g`/`G`, `f` live tail, `q` to close, click-to-toggle.
  pi-dev-stack owns the row and paints ` dev ●` (click → stack-log viewer),
  token/cost/context stats and `model (branch)`; standalone (no keeper) we
  paint the whole row ourselves.
- **Hot tool discovery:** re-pulls the manifest every 10 min; `/human-assist
  refresh` (or `reconnect`) on demand.

## Config

`.pi/human-assist.json` (trusted projects only; all keys optional):

```jsonc
{
  "wsUrl": "ws://127.0.0.1:43179/mcp", // env HARNESS_MCP_WS_URL wins
  "maxRetries": 5,                      // connect failures before giving up
  "footer": true                        // false = skip the custom footer
}
```

## Commands

| Command | What it does |
| --- | --- |
| `/human-assist` | status: url, session, project, tool counts, retries, footer |
| `/human-assist refresh` | re-pull `tools/list`, register any new server tools |
| `/human-assist reconnect` | drop the socket and re-dial from scratch |
| `/human-assist journal` | open the desktop-traffic viewer (same viewer as the footer click; alias: `logs`) |
| `/human-assist journal print` | print the recent traffic as a notify instead of opening the viewer |
| `/human-assist journal clear` | empty the traffic journal |
| `/goal <text>` | hand a high-level goal to the desktop agent |

## Layout

```
src/
  index.ts      extension factory: wiring, bootstrap, commands, session hooks
  conn.ts       HumanAssistConn — WebSocket JSON-RPC, handshake, backoff
  tools.ts      manifest → native pi tools (identity-stamped)
  footer.ts     footer client segment (+ standalone row fallback)
  journal.ts    rolling journal of desktop calls + results (click / journal)
  viewer.ts     client of the keeper's shared fullscreen viewer
  config.ts     .pi/human-assist.json
  identity.ts   agentClient / agentSessionId / agentProject stamping
  schema.ts     JSON Schema → TypeBox subset, snake_case naming
  status.ts     globalThis contract reader (no import from pi-dev-stack)
```

## Contract with pi-dev-stack

No imports cross the package boundary — either extension installs alone. State
travels only through `globalThis`:

| Key | Published by | Read by | Shape |
| --- | --- | --- | --- |
| `__haStackStatus` | pi-dev-stack | footer (Dev segment), readiness gate | `{ alive, env: "dev"\|"prod", changedAt, partial?, logPath? }` |
| `__haStackEvents` | pi-dev-stack | **this extension (readiness gate)** | `{ version, subscribe(cb), latest(), status() }` — `ready`/`launching`/`down` edges; we do not dial the desktop app until `ready`, and re-dial on a keeper respawn |
| `__haStackStatusListeners` | either | both | `Set<(s) => void>` |
| `__haStackActions` | pi-dev-stack | footer click | `{ getOutputSnapshot(): { command, cwd, logPath, tail } \| null }` |
| `__piDevStackFooter` | pi-dev-stack | **this extension (footer client)** | `{ version, register(segment), onChange(cb) }` |
| `__piDevStackViewer` | pi-dev-stack | **this extension (viewer client)** | `{ version, open(spec), isOpen(id), close(id) }` — same fullscreen viewer as the stack logs |

`status.ts` keeps a **local copy** of the reader on purpose, so this extension
still loads in a session where the keeper is absent.

### Footer: we are the client, the keeper owns the row

pi's `ctx.ui.setFooter()` is a **single slot** (last writer wins, and it
replaces the built-in footer wholesale), so two extensions painting the row is
a load-order race. The dependency points **one way — HA → keeper**:

- **Client mode (normal):** we register a `" ha ●"` segment on
  `globalThis.__piDevStackFooter` (pi-dev-stack owns the row and already paints
  ` dev ●`, token/cost/context stats and `model (branch)` — no duplication, and
  the row carries no project name by design). **Clicking our segment opens the
  desktop-traffic journal** through `globalThis.__piDevStackViewer` — the same
  modal component as the keeper's log screen, so keys, scrolling and live tail
  behave identically; `/human-assist journal` does the same.
- **Standalone fallback:** if the keeper is absent or opted out with
  `"footer": false`, we install our own full footer (`installHumanAssistFooter`).
  Both are attempted; if the keeper installs afterwards it simply replaces ours.
- Our `session_start` runs *before* the keeper's (alphabetical load order), so
  registration retries for ~3 s until it publishes the registry; the 10-minute
  tool poll and `/human-assist refresh` re-attach the segment after a keeper
  `/reload` (which withdraws and clears the registry).

## Runtime deps

None of its own: `@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`
and `typebox` are peer deps supplied by pi at load time (the same way the old
single-file `human-assist.ts` resolved them). For typechecking only:

```bash
cd .pi/extensions/human-assist && pnpm install && pnpm run typecheck
```
