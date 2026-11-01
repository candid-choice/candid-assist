# pre-workspace-config-test — Test Specification

## Purpose

Verify the Workspace Configuration document correctly defines workspace detection, config schema, port allocation, multi-workspace behavior, settings, change flow, security, storage, and edge cases.

## Unit Tests

### Workspace Detection
- [ ] Verify detection flow: check localStorage for last workspace path
- [ ] Verify if path exists: yes → load workspace config
- [ ] Verify if path exists: no → prompt user to select workspace
- [ ] Verify if no saved path: open folder picker dialog
- [ ] Verify save selected path as workspace on first setup
- [ ] Verify detection flow logic is correct (null checks, existence checks)

### Workspace Config Schema
- [ ] Verify path: "/Users/user/project" (string, absolute path)
- [ ] Verify gitUrl: "https://github.com/user/project" (string, nullable)
- [ ] Verify selectedMcpPort: 3613 (number)
- [ ] Verify surfacesActive: true (boolean)
- [ ] Verify createdAt: "2026-10-01T10:00:00Z" (timestamp)
- [ ] Verify updatedAt: "2026-10-05T14:00:00Z" (timestamp)
- [ ] Verify sessions.count: 42 (number, nullable)
- [ ] Verify sessions.lastSession: "sess_abc123" (string, nullable)
- [ ] Verify all required fields validated on save

### Workspace Fields
- [ ] Verify path: required, absolute path, string
- [ ] Verify gitUrl: optional, remote URL from `git remote -v`
- [ ] Verify selectedMcpPort: required, port number
- [ ] Verify surfacesActive: required, boolean
- [ ] Verify createdAt: required, timestamp (when workspace first configured)
- [ ] Verify updatedAt: required, timestamp (when workspace last updated)
- [ ] Verify sessions.count: optional, total session count
- [ ] Verify sessions.lastSession: optional, last active session ID

### Workspace Port Allocation
- [ ] Verify workspace A gets port 3613
- [ ] Verify workspace B gets port 3614
- [ ] Verify workspace C gets port 3615
- [ ] Verify port allocation is persistent (workspace A always gets same port)
- [ ] Verify if port unavailable: try next available port
- [ ] Verify ports range: 3613-3662 (50 workspace limit)

### Multi-Workspace Behavior
- [ ] Verify single workspace: default case, one workspace active at a time
- [ ] Verify switching workspaces: close current, open new
- [ ] Verify multi-workspace (future): each gets own session list
- [ ] Verify multi-workspace (future): surface push is workspace-specific
- [ ] Verify multi-workspace (future): MCP server per workspace

### Workspace Settings — Git
- [ ] Verify gitUrl: auto-detected, remote URL from `git remote -v`
- [ ] Verify gitBranch: current branch, from `git rev-parse --abbrev-ref HEAD`
- [ ] Verify gitCommit: latest commit, from `git log -1 --format=%H`
- [ ] Verify gitStatus: clean/dirty, from `git status --porcelain`

### Workspace Settings — MCP
- [ ] Verify enabled: true, whether surfaces are enabled
- [ ] Verify autoStart: true, MCP server starts on app launch
- [ ] Verify port: 3613, first available port
- [ ] Verify maxSurfaces: 10, max simultaneous surfaces
- [ ] Verify timeout: 1800s, 30-minute surface timeout

### Workspace Settings — Surface
- [ ] Verify autoMinimize: true, new surfaces minimize current
- [ ] Verify showNotifications: true, macOS notifications for surfaces
- [ ] Verify darkMode: system, follow system theme
- [ ] Verify showSurfaceCount: true, show number of open surfaces

### Workspace Change Flow
- [ ] Verify user changes workspace: close all surfaces, stop MCP server, restart with new workspace
- [ ] Verify workspace directory deleted: show warning, prompt to select new workspace
- [ ] Verify workspace moved to different path: detect via saved path, update config
- [ ] Verify workspace permissions change: show error, prompt user to grant access

### Workspace Security
- [ ] Verify path traversal: validate path is within user's home directory or explicit projects folder
- [ ] Verify symlink attack: follow symlinks but verify target is a directory
- [ ] Verify network path: reject non-local paths (smb://, nfs://, etc.)
- [ ] Verify sensitive files: do not read workspace files without user consent

### Workspace Storage
- [ ] Verify localStorage: last workspace path
- [ ] Verify Firestore: workspace config, linked to user
- [ ] Verify IndexedDB: workspace-specific cached data (sessions, surfaces)

### Edge Cases
- [ ] Verify workspace contains no .git: still allowed, but gitUrl empty, gitBranch "none", gitCommit "none"
- [ ] Verify workspace is symlink: follow to target, validate target is directory
- [ ] Verify workspace is network-mounted: reject, show "Workspace must be a local directory"
- [ ] Verify multiple workspace configs for same path: merge, prefer most recent
- [ ] Verify workspace moved to different path: show "Workspace moved, please update path"
- [ ] Verify workspace directory deleted: show "Workspace deleted, please select a new one"
- [ ] Verify workspace permissions changed: show "Cannot access workspace, check permissions"
- [ ] Verify workspace name contains special characters: no issues, paths handle unicode

### Cross-Plan Consistency
- [ ] Verify config schema matches pre-settings-system.md (workspace settings)
- [ ] Verify detection flow matches pre-desktop-app-architecture.md (first launch)
- [ ] Verify security matches pre-firebase-rules.md (path validation)
- [ ] Verify port allocation matches pre-mcp-protocol.md (server config)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All workspace detection steps are correct
2. [ ] All config schema fields validated
3. [ ] All port allocation rules described
4. [ ] All multi-workspace behaviors covered
5. [ ] All git/MCP/surface settings specified
6. [ ] All change flow scenarios covered
7. [ ] All security mitigations described
8. [ ] All storage locations defined
9. [ ] All edge cases covered
10. [ ] No contradictions with other plans
