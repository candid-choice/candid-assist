# Workspace Configuration Plan

## Overview

Defines how Human Assist detects, configures, and manages workspaces. Each workspace directory gets its own MCP server, session history, and surface state.

## Workspace Detection

### Detection Flow
```
[App Launch]
    → Check localStorage for last workspace path
        → Has path?
            → Verify path exists
                → Yes → Load workspace config
                → No → Prompt user to select workspace
        → No path?
            → Open folder picker dialog
            → Save selected path as workspace
```

### Workspace Config Schema

```json
{
  "path": "/Users/user/project",
  "gitUrl": "https://github.com/user/project",
  "selectedMcpPort": 3613,
  "surfacesActive": true,
  "createdAt": "2026-10-01T10:00:00Z",
  "updatedAt": "2026-10-05T14:00:00Z",
  "sessions": {
    "count": 42,
    "lastSession": "sess_abc123"
  }
}
```

## Workspace Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| path | string | Yes | Absolute path to workspace directory |
| gitUrl | string | No | Remote URL from `git remote -v` |
| selectedMcpPort | number | Yes | Port for this workspace's MCP server |
| surfacesActive | boolean | Yes | Whether surfaces are enabled |
| createdAt | timestamp | Yes | When workspace was first configured |
| updatedAt | timestamp | Yes | When workspace was last updated |
| sessions.count | number | No | Total session count |
| sessions.lastSession | string | No | Last active session ID |

## Workspace Port Allocation

| Workspace | Path | Port |
|-----------|------|------|
| 1 | /Users/user/project-a | 3613 |
| 2 | /Users/user/project-b | 3614 |
| 3 | /Users/user/project-c | 3615 |

**Rules:**
- Each workspace gets one port
- Ports range from 3613 to 3662 (50 workspace limit)
- Port allocation is persistent (workspace A always gets the same port)
- If port is unavailable, try next available port

## Multi-Workspace Behavior

### Single Workspace
- Default case
- One workspace active at a time
- Switching workspaces: close current, open new

### Multi-Workspace (Future)
- Each workspace gets its own session list
- Surface push is workspace-specific
- MCP server per workspace

## Workspace Settings

### Git Integration

| Setting | Default | Description |
|---------|---------|-------------|
| gitUrl | Auto-detected | Remote URL from `git remote -v` |
| gitBranch | Current branch | `git rev-parse --abbrev-ref HEAD` |
| gitCommit | Latest commit | `git log -1 --format=%H` |
| gitStatus | Clean/dirty | `git status --porcelain` |

### MCP Settings

| Setting | Default | Description |
|---------|---------|-------------|
| enabled | true | Whether surfaces are enabled |
| autoStart | true | MCP server starts on app launch |
| port | 3613 | First available port |
| maxSurfaces | 10 | Max simultaneous surfaces |
| timeout | 1800s | 30-minute surface timeout |

### Surface Settings

| Setting | Default | Description |
|---------|---------|-------------|
| autoMinimize | true | New surfaces minimize current |
| showNotifications | true | macOS notifications for surfaces |
| darkMode | system | Follow system theme |
| showSurfaceCount | true | Show number of open surfaces |

## Workspace Change Flow

| Trigger | Action |
|---------|---------|
| User changes workspace in Settings | Close all surfaces, stop MCP server, restart with new workspace |
| Workspace directory deleted | Show warning, prompt user to select new workspace |
| Workspace moved to different path | Detect via saved path, update config |
| Workspace permissions change | Show error, prompt user to grant access |

## Workspace Security

| Concern | Mitigation |
|---------|------------|
| Path traversal | Validate path is within user's home directory or explicit projects folder |
| Symlink attack | Follow symlinks but verify target is a directory |
| Network path | Reject non-local paths (smb://, nfs://, etc.) |
| Sensitive files | Do not read workspace files without user consent |

## Workspace Storage

| Location | Content |
|----------|---------|
| localStorage | Last workspace path |
| Firestore | Workspace config, linked to user |
| IndexedDB | Workspace-specific cached data (sessions, surfaces) |

## Edge Cases

1. **Workspace contains no .git** → Still allowed, but gitUrl is empty, gitBranch shows "none", gitCommit shows "none"
2. **Workspace is a symlink** → Follow to target, validate target is a directory
3. **Workspace is network-mounted** → Reject, show "Workspace must be a local directory"
4. **Multiple workspace configs for same path** → Merge, prefer most recent
5. **Workspace moved to different path** → Show "Workspace moved, please update path"
6. **Workspace directory deleted** → Show "Workspace deleted, please select a new one"
7. **Workspace permissions changed** → Show "Cannot access workspace, check permissions"
8. **Workspace name contains special characters** → No issues, paths handle unicode
