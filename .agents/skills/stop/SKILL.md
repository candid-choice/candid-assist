---
name: stop
description: Stop the MCP harness Electrobun application and clean up background processes. Use when shutting down the harness server.
allowed-tools:
  - Bash(bash "${CLAUDE_PLUGIN_ROOT}/skills/stop/stop.sh")
---

# Stop Harness

Stop the MCP harness Electrobun application and clean up any background processes.

## Shared Context

@../../rules/harness-context.md

## Scripts

The following script is whitelisted for this skill and pre-approved for execution:

| Script    | Description                                                      |
| --------- | ---------------------------------------------------------------- |
| `stop.sh` | Stop the MCP harness Electrobun application and clean up processes |

## Execution

Run the below script exactly:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/stop/stop.sh"
```
