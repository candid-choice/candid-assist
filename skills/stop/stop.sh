#!/usr/bin/env bash
# stop.sh — Stop the Harness MCP application and clean up background processes.
#
# Lives alongside SKILL.md in the stop skill directory.
# Uses relative paths from the plugin root (parent of this directory's parent).

set -euo pipefail

# ---------------------------------------------------------------------------
# 1. Compute paths relative to the plugin root
#    Script lives at: skills/stop/stop.sh
#    Plugin root:      skills/ (two levels up from script)
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HARNESS_DIR="$(cd "$SCRIPT_DIR/.." && cd .. && pwd)"

MCP_JSON="$HARNESS_DIR/.mcp.json"
PID_FILE="$HARNESS_DIR/.harness.pid"

if [ ! -f "$MCP_JSON" ]; then
  echo "ERROR: .mcp.json not found at $MCP_JSON"
  exit 1
fi

# ---------------------------------------------------------------------------
# 2. Read port from .mcp.json
# ---------------------------------------------------------------------------
PORT=$(node -e "
  const s = JSON.parse(require('fs').readFileSync('$MCP_JSON','utf8'));
  const url = s.mcpServers?.harness?.url ?? '';
  const m = url.match(/:(\d+)/);
  console.log(m ? m[1] : '3602');
")
echo "Harness port: $PORT"

# ---------------------------------------------------------------------------
# 3. Find and terminate tracked process (from .harness.pid)
# ---------------------------------------------------------------------------
if [ -f "$PID_FILE" ]; then
  TRACKED_PID=$(cat "$PID_FILE")
  if ps -p "$TRACKED_PID" > /dev/null 2>&1; then
    echo "Stopping tracked harness process $TRACKED_PID (from .harness.pid)"
    kill "$TRACKED_PID" 2>/dev/null || true
  else
    echo "Tracked PID $TRACKED_PID is not running"
  fi
fi

# ---------------------------------------------------------------------------
# 4. Kill processes tracked in the group file (Vite + Electrobun)
# ---------------------------------------------------------------------------
GROUP_FILE="$HARNESS_DIR/.harness.groups"
if [ -f "$GROUP_FILE" ]; then
  while IFS= read -r pid; do
    if [ -n "$pid" ] && ps -p "$pid" > /dev/null 2>&1; then
      echo "Stopping group PID $pid"
      kill "$pid" 2>/dev/null || true
    fi
  done < "$GROUP_FILE"
fi

# ---------------------------------------------------------------------------
# 5. Kill Vite dev server (port 3200)
# ---------------------------------------------------------------------------
if lsof -ti :3200 >/dev/null 2>&1; then
  echo "Stopping Vite dev server on port 3200"
  kill $(lsof -ti :3200 2>/dev/null) 2>/dev/null || true
fi

# ---------------------------------------------------------------------------
# 6. Kill Hutch background processes
# ---------------------------------------------------------------------------
if lsof -ti :3200 >/dev/null 2>&1; then
  echo "Force-killing Hutch/next processes on port 3200"
  kill -9 $(lsof -ti :3200 2>/dev/null) 2>/dev/null || true
  sleep 1
fi

# ---------------------------------------------------------------------------
# 7. Kill any remaining processes on the MCP port
# ---------------------------------------------------------------------------
if lsof -ti ":$PORT" >/dev/null 2>&1; then
  echo "Found harness process(es) on port $PORT — stopping"
  kill $(lsof -ti ":$PORT" 2>/dev/null) 2>/dev/null || true
else
  echo "No harness process found on port $PORT"
fi

# ---------------------------------------------------------------------------
# 8. Wait for the process to shut down
# ---------------------------------------------------------------------------
for i in $(seq 1 20); do
  if ! lsof -ti ":$PORT" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# ---------------------------------------------------------------------------
# 9. Force kill if still running
# ---------------------------------------------------------------------------
if lsof -ti ":$PORT" >/dev/null 2>&1; then
  echo "Force-killing remaining harness process(es) on port $PORT"
  kill -9 $(lsof -ti ":$PORT" 2>/dev/null) 2>/dev/null || true
  sleep 1
fi

# ---------------------------------------------------------------------------
# 10. Verify the server is no longer running
# ---------------------------------------------------------------------------
if curl -sf "http://127.0.0.1:$PORT/mcp/health" >/dev/null 2>&1; then
  echo "Warning: Server still running on port $PORT"
  exit 1
else
  echo "Harness MCP server stopped successfully on port $PORT"
fi

# ---------------------------------------------------------------------------
# 11. Clean up the PID file
# ---------------------------------------------------------------------------
rm -f "$PID_FILE"

echo "Done"
