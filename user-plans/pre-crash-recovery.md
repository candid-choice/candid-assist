# Crash Recovery Plan

## Overview

Defines how Human Assist handles crashes, recovers state, and communicates with users about crashes. This extends the error handling and surface lifecycle docs.

## Crash Types

| Type | Detection | Recovery |
|------|-----------|----------|
| Renderer crash | Electron crash reporter | Restore session, surfaces |
| Main process crash | Electron crash reporter | Restore app state |
| MCP server crash | Heartbeat timeout | Restart MCP server |
| Background process crash | Electron IPC timeout | Kill all surfaces, notify user |
| System crash (power loss) | File system check | Restore from IndexedDB |

## Crash Reporter Configuration

| Setting | Value |
|---------|-------|
| submitURL | https://sentry.io/api/human-assist/submit/ |
| uploadLimit | 10MB per crash report |
| retention | 90 days |
| anonymous | True (no user identification) |
| extra | `{ version, os, architecture, lastWorkspace }` |

## Crash Report Format

```json
{
  "id": "crash_abc123",
  "version": "1.0.0",
  "os": "macOS 14.0",
  "architecture": "arm64",
  "lastWorkspace": "/Users/user/project",
  "lastSession": "sess_abc123",
  "lastSurface": "surf_abc123",
  "process": "renderer",
  "reason": "EXC_BAD_ACCESS",
  "url": "file:///app/index.html#/session/sess_abc123",
  "extra": {
    "surfaceCount": 3,
    "surfaceType": "browser",
    "memoryUsage": "256MB",
    "uptime": "00:15:32"
  }
}
```

## Crash Recovery Dialog

### Appearance
```
┌────────────────────────────────────────────────────────────────────────┐
│  ⚠  Human Assist Did Not Quit                                       │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                        │
│  We noticed Human Assist didn't quit properly.                         │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  1 session was being shown                                       │  │
│  │  1 surface was being shown                                       │  │
│  │  2 actions were queued                                            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  [ Quit Without Saving ]   [ Revert ]   [ Relaunch ]                  │
└────────────────────────────────────────────────────────────────────────┘
```

### Button Actions

| Button | Action |
|--------|--------|
| Relaunch | Restore all state from IndexedDB, restart app |
| Revert | Restore only sessions, discard surfaces and queued actions |
| Quit Without Saving | Clear IndexedDB state, quit app |

## State Restoration

### IndexedDB Recovery
| Data | Restored? | Condition |
|------|-----------|-----------|
| Active sessions | Yes | If IndexedDB exists |
| Active surfaces | Yes | If surface is not archived |
| Minimized surfaces | Yes | All minimized surfaces |
| Queued actions | Yes | All queued actions replayed |
| Draft responses | Yes | If surface is still active |

### Firestore Recovery
| Data | Restored? | Condition |
|------|-----------|-----------|
| Sessions | Yes | If user is authenticated |
| Surfaces | Yes | If session exists |
| Notifications | Yes | If user exists |

## Crash Recovery Flow

```
[App Launch]
    → Check for crash state (from previous run)
        → Crash detected?
            → Yes → Show crash recovery dialog
                → User chooses "Relaunch"
                    → Restore all state from IndexedDB
                    → Show toast: "We recovered 1 session, 1 surface"
                → User chooses "Revert"
                    → Restore sessions only
                    → Clear surfaces
                    → Show toast: "We recovered 1 session"
                → User chooses "Quit Without Saving"
                    → Clear IndexedDB state
                    → Quit
            → No → Normal startup
```

## Error State Detection

| Detection | How |
|-----------|-----|
| Renderer crash | Electron crash reporter catches unhandled exceptions |
| Main process crash | Electron crash reporter catches unhandled exceptions |
| IPC timeout | If IPC handler doesn't respond within 5s, mark as crashed |
| Surface render hang | If surface doesn't reach Active within 10s, mark as crashed |
| Network hang | If WebSocket doesn't receive pong within 60s, mark as crashed |

## Crash Log Location

| OS | Location |
|----|----------|
| macOS | ~/Library/Logs/Human-Assist/crash_reports/ |
| Windows | %USERPROFILE%\AppData\Local\Human Assist\crash_reports\ |
| Linux | ~/.config/Human Assist/crash_reports/ |

## Post-Crash Analysis

| Step | Action | Tool |
|------|--------|------|
| 1. Ingest crash report | Sentry catches crash, groups by symbol | Sentry |
| 2. Group crashes | By error type, URL, version | Sentry |
| 3. Analyze | Developer reviews crash stack trace | Sentry debugger |
| 4. Fix | Developer creates fix PR | GitHub |
| 5. Verify | Developer tests fix, pushes to production | CI/CD |

## User Communication

| Scenario | Message | Location |
|----------|---------|----------|
| Crash detected on launch | "We noticed the app crashed — here's what we recovered:" | Crash recovery dialog |
| Surface render fails | "Failed to load surface. [Retry]" | Surface overlay |
| MCP server crashes | "MCP server restarted" | Toast (bottom-center) |
| IPC handler crashes | Silently ignored | No user-visible effect |
| WebSocket disconnects | "Connection lost — reconnecting..." | Top banner |

## Prevention

| Measure | How |
|---------|-----|
| Graceful error handling | All components catch errors, never throw |
| Try/catch in IPC | All IPC calls wrapped in try/catch |
| WebSocket retry | Exponential backoff, max 5 attempts |
| Surface timeout | 30min timeout prevents hung surfaces |
| Memory limits | Electron maxRendererMemory: 512MB per renderer |
| Heap profiling | DevTools heap profiling in dev mode |
| Log errors | All errors logged to Sentry |
