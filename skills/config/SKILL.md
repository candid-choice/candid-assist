---
name: config
description: Configure harness environment settings, validate ports, and update .mcp.json. Use when changing the MCP harness port or verifying .mcp.json configuration.
disable-model-invocation: true
---

@../rules/harness-context.md

1. **Read current configuration:**
   - Read the port from `.mcp.json` in the harness plugin directory:
     ```bash
     export CLAUDE_PLUGIN_ROOT="/Users/szhao/candid-choice/candid-organization/.claude/skills/harness"
     PORT=$(node -e "const s=JSON.parse(require('fs').readFileSync('${CLAUDE_PLUGIN_ROOT}/.mcp.json','utf8'));console.log(s.mcpServers.harness.url?.match(/:(\d+)/)?.[1] ?? '3602');")
     echo "Current harness port: $PORT"
     ```

2. **Pre-flight port availability check:**
   - Check if the target port is already bound:
     ```bash
     if lsof -ti :$PORT 2>/dev/null | grep -q .; then
       PID=$(lsof -ti :$PORT 2>/dev/null | head -1)
       PROCESS=$(lsof -ti :$PORT 2>/dev/null | head -1 | xargs ps -p {} -o comm= 2>/dev/null || echo "unknown")
       echo "ERROR: Port $PORT is already in use by PID $PID ($PROCESS)."
       echo "Aborting configuration. Run /harness:stop or terminate the process before proceeding."
       exit 1
     fi
     echo "Port $PORT is available"
     ```
   - **If the port is in use:** Output the warning with PID and process name, and abort. Do NOT proceed to write `.mcp.json`.
   - **If the port is available:** Proceed to the next step.

3. **Validate `.mcp.json` structure:**
   - Ensure `.mcp.json` exists in the plugin root (`${CLAUDE_PLUGIN_ROOT}/.mcp.json`). If missing, create it.
   - Verify the `mcpServers.harness` entry has the correct schema: `{"type": "http", "url": "http://127.0.0.1:$PORT/mcp"}`.
   - Ensure the server entry is not disabled.

4. **Update `.mcp.json`:**
   - If updating the port, use Node to safely mutate and rewrite the JSON:
     ```bash
     node -e "
       const p = '${CLAUDE_PLUGIN_ROOT}/.mcp.json';
       const s = JSON.parse(require('fs').readFileSync(p, 'utf8'));
       s.mcpServers.harness.url = 'http://127.0.0.1:$PORT/mcp';
       require('fs').writeFileSync(p, JSON.stringify(s, null, 2) + '\n');
       console.log('Updated .mcp.json to port $PORT');
     "
     ```

5. **Report the result to the user:**
   - "Port set to $PORT — the MCP harness server will listen at http://127.0.0.1:$PORT/mcp"
   - Note that existing running instances will keep their current port until restarted.
