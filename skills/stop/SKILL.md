---
name: stop
description: Stop the MCP harness Electrobun application and clean up background processes. Use when shutting down the harness server.
allowed-tools:
  - Bash(bash "${CLAUDE_PLUGIN_ROOT}/skills/stop/stop.sh")
---

# Harness Stop

Stop the MCP harness Electrobun application and clean up any background processes.

## Shared Context

@../rules/harness-context.md

## Scripts

The following script is whitelisted for this skill and pre-approved for execution:

| Script    | Description                                                      |
| --------- | ---------------------------------------------------------------- |
| `stop.sh` | Stop the MCP harness Electrobun application and clean up processes |

## Execution

Run the below script exactly.

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/stop/stop.sh"
```

## Notes

- The script reads `.mcp.json` from the plugin root (two levels up from `stop.sh`)
- Tracked PID in `.harness.pid` is stopped before port-based kill
- Force-kill (`kill -9`) is used as a fallback if the graceful stop fails
- The PID file is cleaned up after successful termination
