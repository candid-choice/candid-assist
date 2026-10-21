# Harness Skills

Claude Code harness skills for managing the Electrobun-based MCP browser server.

## Skills

| Skill | Description |
|-------|-------------|
| `config` | Configure harness environment settings, validate ports, and update .mcp.json |
| `start` | Start the MCP harness Electrobun application and verify it is healthy |
| `stop` | Stop the MCP harness Electrobun application and clean up background processes |
| `update` | Update harness plugin skills, regenerate README.md, and enforce internal consistency |

## Shared Context

All skills reference `@../rules/harness-context.md` for common port resolution,
MCP validation, and process control guidance.
