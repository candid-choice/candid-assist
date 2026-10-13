# pre-session-detail-interactions-test — Test Specification

## Purpose

Verify the Session Detail interactions document correctly specifies header controls, timeline actions, response buttons, actions bar, confirm dialogs, right-click options, error states, toasts, and keyboard shortcuts.

## Unit Tests

### Header Controls
- [ ] Verify Back button (←) navigates to session list/dashboard
- [ ] Verify Back button stays on current page with error toast if navigation fails
- [ ] Verify Session title is editable (click to rename)
- [ ] Verify title save on Enter, revert on Escape
- [ ] Verify title max 50 characters with inline error
- [ ] Verify empty title shows "Untitled session"
- [ ] Verify Status badge: green = active, blue = waiting, yellow = errors, red = error, gray = archived/done
- [ ] Verify Status text: shows status, started time, surface count
- [ ] Verify Status text click has no action

### Timeline Actions
- [ ] Verify timeline event shows timestamp, title, description
- [ ] Verify timeline event expands/collapses on click
- [ ] Verify timeline event is expanded by default
- [ ] Verify file links in description are clickable
- [ ] Verify surface event shows surface preview (code diff preview)
- [ ] Verify surface event shows user response ("Your response: ...")
- [ ] Verify surface event response can be expanded, edited, re-sent

### Response Buttons
- [ ] Verify Yes button: green background, white text, saves approval, toast "Response sent"
- [ ] Verify Yes button changes to "✓ Yes" after submit
- [ ] Verify Yes error: "Failed to send — queued" toast
- [ ] Verify Minor button: yellow background, dark text, opens comment input
- [ ] Verify Minor requires a comment (inline error if empty)
- [ ] Verify Minor button changes to "✓ Minor" after submit
- [ ] Verify Minor error: "Failed to send — queued" toast

### Actions Bar
- [ ] Verify Resume Active Surface opens current surface in main content area
- [ ] Verify Resume Active Surface disabled with "No active surface" when none active
- [ ] Verify Resume Active Surface shows "Surface not found" error when surface missing
- [ ] Verify Resume Active Surface toast: "Surface resumed"
- [ ] Verify Resume Active Surface error: "Failed to resume — queued" toast
- [ ] Verify Stop Claude shows confirmation dialog: "Stop Claude? This will cancel current execution."
- [ ] Verify Stop Claude confirm: Yes → stops Claude, toast "Claude stopped"
- [ ] Verify Stop Claude confirm: No → dismisses, nothing changes
- [ ] Verify Stop Claude changes session status to "Done"
- [ ] Verify Stop Claude error: "Failed to stop Claude" toast

### Right-Click on Session
- [ ] Verify right-click menu options: Open, Duplicate, Rename, Archive, Delete, Copy URL
- [ ] Verify right-click matches pre-sidebar-interactions.md (session list context menu)

### Error States
- [ ] Verify "Session not found" with "Back to Sessions" button
- [ ] Verify network error shows "Connection lost" banner with auto-retry
- [ ] Verify session load failure shows "Failed to load session" with [Retry]
- [ ] Verify surface not found shows inline error "Surface not found"

### Session Timeline Actions
- [ ] Verify task received: read-only history (no action)
- [ ] Verify code analysis: read-only history (no action)
- [ ] Verify surface pushed: clickable preview, or click "Resume" in actions bar
- [ ] Verify Claude response: read-only history (no action)
- [ ] Verify surface response: clickable to expand, re-send available

### Toasts
- [ ] Verify "Surface resumed" toast: 3s
- [ ] Verify "Claude stopped" toast: 3s
- [ ] Verify "Response sent" toast: 3s
- [ ] Verify "Failed to send — queued" toast: 6s
- [ ] Verify "Session renamed" toast: 2s
- [ ] Verify "Session archived" toast: 2s
- [ ] Verify "Session deleted" toast: 3s

### Keyboard Shortcuts
- [ ] Verify Escape closes current surface (if open)
- [ ] Verify Cmd+R refreshes timeline
- [ ] Verify Cmd+W closes surface
- [ ] Verify Cmd+Up scrolls timeline to top
- [ ] Verify Cmd+Down scrolls timeline to bottom
- [ ] Verify Cmd+F searches timeline
- [ ] Verify Enter submits surface response (when surface focused)

### Cross-Plan Consistency
- [ ] Verify no contradictions with pre-sidebar-interactions.md (right-click on session)
- [ ] Verify no contradictions with pre-notification-system.md (toast durations)
- [ ] Verify no contradictions with pre-surface-lifecycle-states.md (surface actions)
- [ ] Verify no contradictions with pre-help-palette-interactions.md (HelpPalette integration)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All header controls are specified
2. [ ] All timeline actions are described
3. [ ] All response button behaviors are accurate
4. [ ] All actions bar behaviors are described
5. [ ] All confirm dialogs are specified
6. [ ] All right-click options are listed
7. [ ] All error states with recovery actions
8. [ ] All toasts with correct durations
9. [ ] All keyboard shortcuts described
10. [ ] No contradictions with other plans
