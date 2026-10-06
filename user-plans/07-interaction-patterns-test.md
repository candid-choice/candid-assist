# 07-Interaction-Patterns — Test Specification

## Purpose

Verify all interaction patterns (keyboard shortcuts, context menus, drag-and-drop, toasts, connection state, crash recovery) are complete and internally consistent.

## Unit Tests

### Keyboard Shortcuts
- [ ] Verify all shortcuts from the plan are listed and non-conflicting
- [ ] Verify shortcut scopes are correct (Global, Surface, Sessions/History, Text input)
- [ ] Verify ⌘+N opens Task Composer
- [ ] Verify ⌘+Shift+Space opens HelpPalette
- [ ] Verify ⌘+W closes current surface/minimizes
- [ ] Verify Escape closes overlay and returns to previous view
- [ ] Verify Enter submits current surface form
- [ ] Verify Cmd+Enter sends even if empty
- [ ] Verify ⌘+Tab switches between active surfaces
- [ ] Verify F11 toggles full-screen
- [ ] Verify ⌘+D duplicates selected session
- [ ] Verify ⌘+A selects all in text inputs
- [ ] Verify ⌘+Z/Shift+Z undo/redo on canvas and text surfaces

### Context Menus
- [ ] Verify session list item context menu (Open, Duplicate, Rename, Archive, Delete, Copy URL)
- [ ] Verify dashboard area context menu (Help, Task Composer, View Logs, Troubleshoot)
- [ ] Verify HelpPalette items context menu (Copy, Customize, Remove)
- [ ] Verify sidebar item context menu (Rename, Pin, Hide)
- [ ] Verify each context menu has correct actions that match the plan

### Drag-and-Drop
- [ ] Verify desktop file → Task Composer (creates file attachment)
- [ ] Verify desktop file → Active surface (attaches to surface)
- [ ] Verify Session (list) → Sidebar "New" (duplicates session)
- [ ] Verify File (history) → Task Composer (attaches as context)
- [ ] Verify Surface content → Task Composer (sends surface content as new task)

### Toast Notifications
- [ ] Verify all toasts have duration, action button, and behavior
- [ ] Verify "Task sent to Claude" (3s, no action)
- [ ] Verify "Surface pushed from Claude" (3s, Open action)
- [ ] Verify "Process started" (3s, View action)
- [ ] Verify "Connection lost" (Persistent, Retry/Sign out actions)
- [ ] Verify "Signed out" (2s, Undo action)
- [ ] Verify "Workspace saved" (2s, no action)
- [ ] Verify "Session archived" (2s, Undo action)
- [ ] Verify "Session deleted" (3s, Undo action)
- [ ] Verify "Onboarding complete!" (3s, Go to Dashboard action)
- [ ] Verify "Guest mode coming soon" (2s, no action)
- [ ] Verify "No surfaces to display" (5s, Retry action)
- [ ] Verify toasts appear at bottom-center, stacking upward
- [ ] Verify max 4 toasts visible at once

### Connection State Management
- [ ] Verify state transitions: Connected → Disconnected → Reconnecting → Offline Banner → Error Banner
- [ ] Verify Connected → Disconnected: top banner "Connection lost — reconnecting..."
- [ ] Verify Disconnected → Reconnecting: banner countdown "5s"
- [ ] Verify Reconnecting → Connected: banner fades, "Reconnected" toast
- [ ] Verify Reconnecting → Offline Banner: banner changes to "Working offline — queued locally"
- [ ] Verify Offline Banner → Connected: banner fades, queued actions replay
- [ ] Verify Any → Error: banner becomes "Connection failed — retry?"
- [ ] Verify offline queued actions: Task sends, Surface results, Session updates, Settings changes

### Crash Recovery
- [ ] Verify "We noticed the app crashed — here's what we recovered:" dialog
- [ ] Verify recovered sessions list
- [ ] Verify recovered surfaces message
- [ ] Verify "All" button restores everything
- [ ] Verify "None" button starts clean
- [ ] Verify "Some" button lets user pick what to restore

### Error States
- [ ] Verify auth errors: Firebase timeout, invalid credentials, account suspended, token expired
- [ ] Verify surface errors: load fails, Claude disconnects, timeout
- [ ] Verify session errors: creation fails, not found, too many concurrent

### Edge Cases
- [ ] Verify offline onboarding behavior
- [ ] Verify multiple windows (single-window, future multi)
- [ ] Verify concurrent Claude instances (only one at a time)
- [ ] Verify surface ordering (queue, reject excess)
- [ ] Verify user closes app during active surface
- [ ] Verify sign in on different machine (workspace sync)
- [ ] Verify large session history (virtualized, 20 at a time)
- [ ] Verify macOS dark mode
- [ ] Verify Retina/4K displays
- [ ] Verify multiple monitors
- [ ] Verify low storage toast
- [ ] Verify accessibility (alt text, keyboard nav, VoiceOver)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All keyboard shortcuts are listed and non-conflicting
2. [ ] All context menus have correct actions
3. [ ] All drag-and-drop behaviors are described
4. [ ] All toasts have duration, action button, and behavior
5. [ ] Connection state transitions are complete
6. [ ] Crash recovery dialog is described
7. [ ] All error states are covered
8. [ ] All edge cases are listed
9. [ ] Internal consistency with other plans verified
