---
name: start
description: Start the MCP harness Electrobun application and verify it is healthy. Use when starting the harness server for the first time or after a stop.
allowed-tools:
  - Bash(bash "${CLAUDE_PLUGIN_ROOT}/skills/start/start.sh")
---

# Harness Start

Start the MCP harness Electrobun application and verify it is healthy.

## Shared Context

@../rules/harness-context.md

## Scripts

The following script is whitelisted for this skill and pre-approved for execution:

| Script     | Description                                                         |
| ---------- | ------------------------------------------------------------------- |
| `start.sh` | Start the MCP harness Electrobun application and verify it is healthy |

## Execution

Run the below script exactly.

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/start/start.sh"
```

## Notes

- The script reads `.mcp.json` from the plugin root (two levels up from `start.sh`)
- `ELECTROBUN_RUN_AS_NODE` is unset before launch to avoid crashes
- `HARNESS_PORT` is set to override default port (3600)
