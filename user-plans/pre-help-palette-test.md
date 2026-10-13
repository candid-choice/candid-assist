# pre-help-palette — Test Specification

## Purpose

Verify the Help Palette plan correctly describes keyboard shortcuts, HelpPalette layout, and About section.

## Unit Tests

### Keyboard Shortcuts
- [ ] Verify Global shortcuts: ⌘ N, ⌘ Shift N, ⌘ Shift H, ⌘ Shift S, ⌘ Space, ⌘ Shift Space, ⌘ W, ⌘ Q, Escape, Enter, Cmd+Enter, Cmd+/, ⌘ Tab, ⌘ D, ⌘ A, ⌘ Z, ⌘ Shift Z, ⌘ ↑, ⌘ ↓, F11, ⌘ Opt M
- [ ] Verify Global scopes are correct (Global, Surface context, Sessions/History context, Text input context)
- [ ] Verify ⌘+N opens Task Composer (new task)
- [ ] Verify ⌘+Shift+N opens Sessions list
- [ ] Verify ⌘+Shift+H opens History
- [ ] Verify ⌘+Shift+S opens Settings
- [ ] Verify ⌘+Space toggles HelpPalette
- [ ] Verify ⌘+Shift+Space toggles HelpPalette (alternate)
- [ ] Verify ⌘+W closes current surface / minimizes
- [ ] Verify ⌘+Q quits app
- [ ] Verify Escape closes surface overlay, returns to previous view
- [ ] Verify Enter submits current surface form
- [ ] Verify Cmd+Enter sends even if empty
- [ ] Verify Cmd+/ toggles HelpPalette (alternate)
- [ ] Verify ⌘+Tab switches between active surfaces
- [ ] Verify ⌘+D duplicates selected session
- [ ] Verify ⌘+A selects all (in text inputs)
- [ ] Verify ⌘+Z undoes (Canvas, text surfaces)
- [ ] Verify ⌘+Shift+Z redos (Canvas, text surfaces)
- [ ] Verify ⌘+↑ scrolls to top of timeline
- [ ] Verify ⌘+↓ scrolls to bottom of timeline
- [ ] Verify F11 toggles full-screen mode
- [ ] Verify ⌘+Opt+M minimizes app to dock

### Right-Click Context Menus

#### Session list item
- [ ] Verify Open in Full View → navigates to session detail
- [ ] Verify Duplicate → clones session + surfaces
- [ ] Verify Rename... → inline rename prompt
- [ ] Verify Archive → removes from active view
- [ ] Verify Delete... → permanent
- [ ] Verify Copy Session URL → copies deep link
- [ ] Verify Right-click context menu has all correct actions

#### Dashboard area
- [ ] Verify Open Help Palette → Ctrl+Click anywhere
- [ ] Verify Open Task Composer → ⌘+N
- [ ] Verify View Logs → opens logs
- [ ] Verify Troubleshoot... → opens troubleshooting
- [ ] Verify Right-click context menu has all correct actions

#### HelpPalette items
- [ ] Verify Copy → copies shortcut hint
- [ ] Verify Customize Shortcuts → opens shortcut customization
- [ ] Verify Remove from Palette → removes item from palette
- [ ] Verify Right-click context menu has all correct actions

#### Sidebar item
- [ ] Verify Rename Session
- [ ] Verify Pin Session (stays at top always)
- [ ] Verify Hide Session (archives & hides)
- [ ] Verify Right-click context menu has all correct actions

### Drag-and-Drop Behaviors
- [ ] Verify Desktop file → Task Composer → Creates file attachment
- [ ] Verify Desktop file → Active surface → Attaches to current surface
- [ ] Verify Session (list) → Sidebar "New" area → Duplicates the session
- [ ] Verify File (history) → Task Composer → Attaches as context for new task
- [ ] Verify Surface content (drag handle) → Task Composer → Sends copy of surface content as new task

### Toast Notifications
- [ ] Verify All toasts appear at bottom-center of window, stacking upward
- [ ] Verify "Task sent to Claude" → 3s, no action
- [ ] Verify "Surface pushed from Claude" → 3s, "Open" link
- [ ] Verify "Process started" → 3s, "View" link
- [ ] Verify "Connection lost" → Persistent, "Retry" + "Sign out"
- [ ] Verify "Signed out" → 2s, "Undo" link
- [ ] Verify "Workspace saved" → 2s, no action
- [ ] Verify "Session archived" → 2s, "Undo" link
- [ ] Verify "Session deleted" → 3s, "Undo" link
- [ ] Verify "Onboarding complete!" → 3s, "Go to Dashboard"
- [ ] Verify "Guest mode coming soon" → 2s, no action
- [ ] Verify "No surfaces to display" → 5s, "Retry" link
- [ ] Verify Max 4 toasts visible at once
- [ ] Verify New toasts push existing toasts up
- [ ] Verify Oldest toast dismisses when >4 visible
- [ ] Verify Click dismisses toast
- [ ] Verify Hover pauses auto-dismiss timer

### Connection State Management

#### States
- [ ] Verify Connected → Disconnected → Reconnecting → Offline Banner → Error Banner
- [ ] Verify Connected: normal operation
- [ ] Verify Disconnected: network loss, backend down
- [ ] Verify Reconnecting: auto, after 500ms timeout
- [ ] Verify Offline Banner: after 10s still disconnected
- [ ] Verify Error Banner: manual timeout or error

#### State Transitions
- [ ] Verify Connected → Disconnected: network loss, backend down → Top banner "Connection lost — reconnecting..."
- [ ] Verify Disconnected → Reconnecting: auto, after 500ms timeout → Banner countdown "5s"
- [ ] Verify Reconnecting → Connected: network restores → Banner fades, "Reconnected" toast
- [ ] Verify Reconnecting → Offline Banner: after 10s still disconnected → Banner changes to "Working offline — queued locally"
- [ ] Verify Offline Banner → Connected: network restores → Banner fades, all queued actions replay
- [ ] Verify Any → Error: manual timeout or error → Banner becomes "Connection failed — retry?"

#### Queued Actions (Offline)
- [ ] Verify All user actions during offline state are queued in IndexedDB
- [ ] Verify Queued actions: task sends, surface results, session updates, settings changes
- [ ] Verify When reconnected, queue is replayed in order with sync progress indicator in footer

### App Lifecycle States

#### Suspend / Resume
- [ ] Verify App minimized → Surfaces continue rendering in background
- [ ] Verify App backgrounded → Surfaces continue, trigger macOS notification if user switches away
- [ ] Verify App quit (Cmd+Q) → All active surfaces send { completed: false } to Claude. Sessions saved to Firestore
- [ ] Verify System sleep → All surfaces freeze, resume on wake
- [ ] Verify App reopen after quit → Shows previous state exactly as left (sessions, surfaces in progress)

### Crash Recovery
- [ ] Verify App crash → On reopen: "We noticed the app crashed — here's what we recovered:"
- [ ] Verify Recovered sessions → List of sessions with unsaved state
- [ ] Verify Recovered surfaces → "1 surface was being shown — restore?"
- [ ] Verify Choose "All" → Restores everything
- [ ] Verify Choose "None" → Starts clean
- [ ] Verify Choose "Some" → Lets user pick which sessions to restore

### Error States

#### Auth errors
- [ ] Verify Firebase timeout → Sign in → Banner "Auth service unavailable"
- [ ] Verify Invalid credentials → Sign in form → Inline "Invalid email or password" in red
- [ ] Verify Account suspended → Any page → Full-screen "Your account has been suspended"
- [ ] Verify Token expired → Background refresh → Silent re-auth via Firebase auto-refresh

#### Surface errors
- [ ] Verify Surface load fails → Surface overlay → "Failed to load surface content. [Retry] [Dismiss]"
- [ ] Verify Claude disconnects mid-surface → Surface overlay → "Claude disconnected — this surface will be abandoned."
- [ ] Verify Surface timeout (no response, 30min) → Surface overlay → Auto-disconnect with toast "Surface timed out"

#### Session errors
- [ ] Verify Firestore write fails → Session creation → Toast "Failed to create session"
- [ ] Verify Session not found → Session detail → "Session not found. [Back to Sessions]"
- [ ] Verify Too many concurrent surfaces (limit 10) → Any surface push → Toast "Maximum 10 surfaces open at once"

### Edge Cases
- [ ] Verify Offline onboarding → If user has no internet during first launch, show "Check connection" state, cannot proceed past step 1
- [ ] Verify Multiple windows → Currently single-window; future: one window per session
- [ ] Verify Concurrent Claude instances → Only one Claude Code process can connect at a time
- [ ] Verify Surface ordering → If Claude pushes 5 surfaces rapidly, last 4 queue as background surfaces
- [ ] Verify User closes app during active surface → Surface remains in session, can resume on next launch
- [ ] Verify User signs in on a different machine → Workspace syncs from Firestore, previous state preserved
- [ ] Verify Large session history → Virtualized list, loads 20 at a time, searchable
- [ ] Verify MacOS dark mode → All UI adapts; surfaces use native dark mode if available
- [ ] Verify Retina / 4K displays → All UI is resolution-independent
- [ ] Verify Multiple monitors → Surfaces can span across monitors; screen capture handles multi-monitor
- [ ] Verify Low storage → Toast "Low storage — queued actions may not save"
- [ ] Verify Accessibility → All buttons have alt text, keyboard navigable, VoiceOver compatible

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All keyboard shortcuts are correct
2. [ ] All right-click context menus are correct
3. [ ] All drag-and-drop behaviors are correct
4. [ ] All toast notifications are correct
5. [ ] All connection state management is correct
6. [ ] All app lifecycle states are correct
7. [ ] All crash recovery is correct
8. [ ] All error states are correct
9. [ ] All edge cases are covered
10. [ ] No contradictions with other plans
