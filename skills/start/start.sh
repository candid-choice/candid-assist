#!/bin/bash
# Prefer system bash (universal binary: runs native arm64) over
# /usr/local/bin/bash which is x86_64 (Rosetta). The x86_64 binary
# causes "unsupported platform: Darwin x86_64" in the Hutch
# installer — child processes inherit the parent's arch context.

# start.sh — Start the Harness monorepo (Electrobun desktop + Vite).
#
# cd'ing into the plugin root and running `pnpm harness:dev` launches:
#   - Vite renderer at http://localhost:3200 (layout UI)
#   - Electrobun desktop app at http://localhost:3200 (loaded by BrowserWindow)
#   - MCP server at http://localhost:3602/mcp

set -euo pipefail

# ---------------------------------------------------------------------------
# 1. Compute paths relative to the plugin root
#    Script lives at: skills/start/start.sh
#    Plugin root:      skills/ (two levels up from script)
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/.." && cd .. && pwd)"

MCP_JSON="$PLUGIN_ROOT/.mcp.json"

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
echo "Harness MCP port: $PORT"

# ---------------------------------------------------------------------------
# 3. Install dependencies if needed
# ---------------------------------------------------------------------------
if [ ! -d "$PLUGIN_ROOT/node_modules" ]; then
  echo "Installing monorepo dependencies..."
  cd "$PLUGIN_ROOT"
  pnpm install
  cd - >/dev/null
fi

# ---------------------------------------------------------------------------
# 4. Kill any existing processes on the Vite (3200) and MCP (3602) ports
# ---------------------------------------------------------------------------
VITE_PORT=3200
for P in $PORT $VITE_PORT; do
  if lsof -ti ":$P" 2>/dev/null | grep -q .; then
    EXISTING_PID=$(lsof -ti ":$P" 2>/dev/null | head -1)
    echo "Port $P in use by PID $EXISTING_PID — killing"
    kill "$EXISTING_PID" 2>/dev/null || true
  fi
done
sleep 1

# ---------------------------------------------------------------------------
# 5. Launch the monorepo — cd into root and run pnpm harness:dev
#    This starts:
#      - pnpm --filter harness-renderer dev  → Vite at :3200 (HMR)
#      - wait-on http://localhost:3200       → readiness gate
#      - pnpm --filter harness-desktop dev   → Electrobun desktop app
# ---------------------------------------------------------------------------
cd "$PLUGIN_ROOT"

echo "================================================================"
echo "  Launching Harness (Electrobun + Vite)"
echo "================================================================"
echo ""

# Run the monorepo dev script — it handles concurrency for us
pnpm run harness:dev

echo ""
echo "Done"
