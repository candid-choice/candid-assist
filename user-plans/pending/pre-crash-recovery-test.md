# pre-crash-recovery — Test Specification

## Purpose

Verify the crash recovery plan correctly describes crash detection, recovery dialog, and state restoration.

## Unit Tests

### Crash Types
- [ ] Verify Renderer crash: Electron crash reporter catches unhandled exceptions
- [ ] Verify Main process crash: Electron crash reporter catches unhandled exceptions
- [ ] Verify MCP server crash: Heartbeat timeout, restart MCP server
- [ ] Verify Background process crash: Electron IPC timeout, kill all surfaces, notify user
- [ ] Verify System crash (power loss): File system check, restore from IndexedDB

### Crash Report Format
- [ ] Verify crash report contains: id, version, os, architecture, lastWorkspace, lastSession, lastSurface, process, reason, url, extra
- [ ] Verify extra contains: surfaceCount, surfaceType, memoryUsage, uptime
- [ ] Verify crash report is 10MB max upload size
- [ ] Verify crash report retention: 90 days
- [ ] Verify crash report is anonymous (no user identification)
- [ ] Verify extra fields: version, os, architecture, lastWorkspace

### Crash Recovery Dialog
- [ ] Verify dialog shows "Human Assist Did Not Quit"
- [ ] Verify dialog shows "We noticed Human Assist didn't quit properly."
- [ ] Verify dialog shows recovered sessions count
- [ ] Verify dialog shows recovered surfaces count
- [ ] Verify dialog shows queued actions count
- [ ] Verify dialog has "Quit Without Saving" button
- [ ] Verify dialog has "Revert" button
- [ ] Verify dialog has "Relaunch" button

### Crash Recovery Actions
- [ ] Verify "Relaunch" restores all state from IndexedDB
- [ ] Verify "Relaunch" shows toast: "We recovered 1 session, 1 surface"
- [ ] Verify "Revert" restores sessions only, discards surfaces
- [ ] Verify "Revert" shows toast: "We recovered 1 session"
- [ ] Verify "Quit Without Saving" clears IndexedDB state, quits app

### IndexedDB Recovery
- [ ] Verify active sessions restored from IndexedDB if exists
- [ ] Verify active surfaces restored from IndexedDB if surface not archived
- [ ] Verify minimized surfaces restored from IndexedDB
- [ ] Verify queued actions restored from IndexedDB, replayed in order
- [ ] Verify draft responses restored from IndexedDB if surface is still active

### Firestore Recovery
- [ ] Verify sessions restored from Firestore if user is authenticated
- [ ] Verify surfaces restored from Firestore if session exists
- [ ] Verify notifications restored from Firestore if user exists

### Error State Detection
- [ ] Verify Renderer crash: Electron crash reporter catches unhandled exceptions
- [ ] Verify Main process crash: Electron crash reporter catches unhandled exceptions
- [ ] Verify IPC timeout: If IPC handler doesn't respond within 5s, mark as crashed
- [ ] Verify Surface render hang: If surface doesn't reach Active within 10s, mark as crashed
- [ ] Verify Network hang: If WebSocket doesn't receive pong within 60s, mark as crashed

### Crash Log Location
- [ ] Verify macOS: ~/Library/Logs/Human-Assist/crash_reports/
- [ ] Verify Windows: %USERPROFILE%\AppData\Local\Human Assist\crash_reports\
- [ ] Verify Linux: ~/.config/Human Assist/crash_reports/

### Post-Crash Analysis
- [ ] Verify Sentry catches crash, groups by symbol
- [ ] Verify developer reviews crash stack trace via Sentry debugger
- [ ] Verify developer creates fix PR via GitHub
- [ ] Verify developer tests fix, pushes to production via CI/CD

### User Communication
- [ ] Verify "We noticed the app crashed — here's what we recovered:" on crash dialog
- [ ] Verify "Failed to load surface. [Retry]" on surface overlay
- [ ] Verify "MCP server restarted" on toast (bottom-center)
- [ ] Verify No user-visible effect for IPC handler crash (silently ignored)
- [ ] Verify "Connection lost — reconnecting..." on top banner

### Prevention
- [ ] Verify All components catch errors, never throw (graceful error handling)
- [ ] Verify All IPC calls wrapped in try/catch
- [ ] Verify WebSocket retry: exponential backoff, max 5 attempts
- [ ] Verify Surface timeout: 30min timeout prevents hung surfaces
- [ ] Verify Electron maxRendererMemory: 512MB per renderer
- [ ] Verify DevTools heap profiling in dev mode
- [ ] Verify All errors logged to Sentry

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All crash types are described
2. [ ] Crash report format is complete
3. [ ] Crash recovery dialog is described
4. [ ] All recovery actions are described
5. [ ] IndexedDB/Firestore recovery is described
6. [ ] Error state detection is complete
7. [ ] Post-crash analysis is described
8. [ ] User communication is described
9. [ ] Prevention measures are described
10. [ ] No contradictions with other plans
