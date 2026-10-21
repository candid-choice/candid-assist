---
name: start
description: Start the MCP harness Electrobun application and verify it is healthy. Use when starting the harness server for the first time or after a stop.
allowed-tools:
  - Bash(bash "${CLAUDE_PLUGIN_ROOT}/skills/start/start.sh")
---

# Start Harness

Start the MCP harness Electrobun application and verify it is healthy.

## Shared Context

@../../rules/harness-context.md

## Scripts

The following script is whitelisted for this skill and pre-approved for execution:

| Script     | Description                                                         |
| ---------- | ------------------------------------------------------------------- |
| `start.sh` | Start the MCP harness Electrobun application and verify it is healthy |

## Execution

Run the below script exactly:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/start/start.sh"
```
