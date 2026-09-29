---
name: update
description: Update harness plugin skills, regenerate README.md, and enforce internal consistency. Use when updating skills, refreshing the harness README, or validating plugin consistency.
disable-model-invocation: true
---

@../rules/harness-context.md

# Harness Update

The exclusive mechanism for updating any skills within the harness plugin.
All modifications to harness skills must go through this skill — never edit harness skill files directly.

## Instructions

1. **Resolve the plugin directory:**
   ```bash
   HARNESS_DIR="${CLAUDE_PLUGIN_ROOT}"
   SKILLS_DIR="$HARNESS_DIR/skills"
   README_FILE="$SKILLS_DIR/README.md"
   echo "Updating harness plugin at $HARNESS_DIR"
   ```

2. **Scan all skills:**
   - Enumerate every SKILL.md under `$SKILLS_DIR`:
     ```bash
     find "$SKILLS_DIR" -name "SKILL.md" -not -name "update" | sort
     ```
   - Extract each skill's name (directory name), description (from frontmatter `description:`), and file path.
   - Skip the `update` skill itself — it manages the others.

3. **Validate internal consistency:**
   - **File existence:** For every path referenced in any SKILL.md (relative or `${CLAUDE_PLUGIN_ROOT}/...`), verify the file exists.
     ```bash
     for ref in ...; do
       resolved="${CLAUDE_PLUGIN_ROOT}/${ref#/}"
       [ -f "$resolved" ] || echo "MISSING: $ref"
     done
     ```
   - **Port references:** Ensure all `.mcp.json` port references in SKILL.md match the port defined in `$HARNESS_DIR/.mcp.json`.
   - **No dead references:** Ensure no SKILL.md references files in `../skills/...` that don't exist under the current plugin.

4. **Update `.mcp.json`:**
   - Verify `$HARNESS_DIR/.mcp.json` has the correct `harness` server entry.
   - If missing, create it with `{"type":"http","url":"http://127.0.0.1:3602/mcp"}`.

5. **Regenerate skills README:**
   - Skills-related content goes into `$SKILLS_DIR/README.md`, not the plugin root.
   - Build a clean, internally consistent README from actual plugin data:
     ```markdown
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
     ```
   - Write the generated README to `$README_FILE`.

6. **Report results:**
   - List every skill scanned with its description.
   - Report any missing files found.
   - Report any port mismatches found.
   - Confirm README.md was updated.
   - "Harness plugin updated successfully — no inconsistencies found" or list what was fixed.
