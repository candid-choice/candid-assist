# pi-dev-stack

Dev-stack keeper extension for [Pi](https://pi.dev): keeps a project's
dev stack alive and gives you a Slack control channel. Bundles **only**
the keeper — the Human Assist browser/surfaces extension is separate.

## What it does

- **Supervised launch (no plugins):** spawns `command` detached (own
  process group) with stdout+stderr appended to a known log; pidfile
  tracked. Never double-spans.
- **Session resync:** each pi session start tears the stack down and
  relaunches it with a rotated log, so the session owns a clean log
  window (`/dev-stack logs [n]` tails it).
- **Deep health:** every port in `ports` must answer **and** `healthUrl`
  must return 2xx containing all `healthContains` substrings — catches
  "ports bound but zombie app".
- **Crash watchdog:** loss of any component (after 2 consecutive probes
  and a 90s post-spawn grace) → whole-group kill + port eviction +
  respawn, plus one injected action telling the model to read the log
  tail and fix the root cause. Crash-loop bail-out asks a human.
- **openUrls:** each successful launch opens the configured URLs in
  Playwright (each in its OWN new tab). `${VAR}`/`env:VAR` placeholders
  resolve from `process.env` then `<repo>/.env` — e.g. a login-bypass
  URL carrying `ha_dev_email=${HA_DEV_AUTOLOGIN_EMAIL}`.
- **Slack bridge (optional):** outbound — final assistant text posted
  on every completed run (`postOnComplete`); inbound — channel messages
  forwarded into the pi session as prompts (Socket Mode, needs
  `appToken`); `slack_send` tool posts messages + file/image
  attachments (screenshots) on demand.

## Install (per project)

1. Copy this package into `<project>/.pi/extensions/pi-dev-stack/` (or
   `~/.pi/agent/extensions/` for global use).
2. `cd` into it and `npm install` (or `pnpm install`) — deps resolve
   from the package's own `node_modules`; `@earendil-works/pi-coding-agent`
   and `typebox` are provided by Pi (peer deps).
3. Create `<project>/.pi/dev-stack.json`:

```jsonc
{
  "project": "my-app",                       // required
  "repo": "/abs/path/to/my-app",             // required
  "command": "pnpm run dev",                 // default
  "ports": [3000, 5432],                     // required: all = healthy
  "emulatorPorts": [5432],                   // alive ⇒ env "Dev" in footer
  "logFile": "/tmp/my-app-dev.log",          // optional
  "healthUrl": "http://127.0.0.1:3000/status",// optional deep health
  "healthContains": ["\"ok\":true"],         // optional
  "teardownPorts": [4400, 4401],             // extra ports to evict on teardown
  "openUrls": ["http://localhost:3000/"],    // Playwright on healthy
  "slack": {                                 // optional bridge
    "botToken": "env:SLACK_BOT_TOKEN",       // xoxb-… (literal or env:/ ${})
    "appToken": "env:SLACK_APP_TOKEN",        // xapp-… enables Socket Mode + inbound
    "channel": "env:SLACK_CHANNEL",           // channel ID, e.g. C0123456789
    "postOnComplete": true,
    "inboundEnabled": true
  }
}
```

4. For Slack: create a Slack app — Bot scopes `chat:write`,
   `channels:history`, `groups:history`; app-level token with
   `connections:write`; enable Socket Mode + `message.channels` /
   `message.groups` events; `/invite @bot` in the channel; put
   `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_CHANNEL` in the repo
   `.env` (never committed).
5. `/reload` pi (or start a new session). `/dev-stack` shows status;
   `Dev ●` appears in the Human Assist footer via the shared
   `globalThis.__haStackStatus` contract.

## Slack bot setup (detailed)

See the repo doc `docs/slack-app-setup.md` (scopes, Socket Mode, events,
`/invite`) — mirrors Slack Bolt's Socket Mode guide.

## Files

| File | Role |
| ---- | ---- |
| `src/index.ts` | Extension entry: registers hooks, tool, command |
| `src/config.ts` | Config schema, discovery, `${VAR}`/`env:` resolution |
| `src/health.ts` | Port + HTTP deep health |
| `src/process.ts` | Detached spawn, group kill, port eviction, logs |
| `src/keeper.ts` | Session lifecycle + watchdog state machine |
| `src/slack.ts` | @slack/bolt bridge (out/in + attachments) |
| `src/status.ts` | globalThis status singleton (shared contract) |

## Notes

- Pi loads TypeScript directly (jiti); `typecheck` is for editors only.
- Timers/sockets start on `session_start` and stop on `session_shutdown`
  (Pi may load extensions without starting a session).
- Inbound Slack messages become prompts — normal human-in-the-loop
  confirmation gates still apply to anything the model then does.
