# pre-process-manager-interactions-test — Test Specification

## Purpose

Verify the ProcessManager interactions document correctly specifies process status colors, View Log behavior, Stop/Restart actions, close behavior, sort order, update behavior, lifecycle, keyboard shortcuts, error states, and edge cases.

## Unit Tests

### Header Controls
- [ ] Verify Archive All button archives only stopped/crashed processes
- [ ] Verify Archive All does not affect running processes
- [ ] Verify Archive All shows "All processes archived" toast
- [ ] Verify process count shows running and crashed counts separately
- [ ] Verify process count updates in real-time

### Process Status Indicators
- [ ] Verify Running status: green dot, "Running" label
- [ ] Verify Stopped status: yellow dot, "Stopped" label
- [ ] Verify Crashed status: red dot, "Crashed" label
- [ ] Verify status updates reflect actual process state
- [ ] Verify status color matches status text

### View Log Button
- [ ] Verify View Log expands inline terminal panel below process entry
- [ ] Verify View Log shows process output in real-time
- [ ] Verify View Log auto-scrolls to bottom on new output
- [ ] Verify View Log collapses when clicked again
- [ ] Verify View Log shows last known output for stopped processes
- [ ] Verify View Log shows error output for crashed processes
- [ ] Verify View Log is scrollable for older output
- [ ] Verify View Log supports text selection and copy (Cmd+C)

### Stop Button
- [ ] Verify Stop sends SIGTERM to the process
- [ ] Verify Stop changes Running status to Stopped
- [ ] Verify Stop shows "Process stopped" toast
- [ ] Verify Stop button changes to Restart after stopping
- [ ] Verify Stop shows error toast on failure ("Failed to stop process")

### Restart Button
- [ ] Verify Restart sends command with same parameters
- [ ] Verify Restart changes Stopped/Crashed status to Running
- [ ] Verify Restart shows "Process restarted" toast
- [ ] Verify Restart shows new output in log panel
- [ ] Verify Restart shows error toast on failure ("Failed to restart process")

### Close Button
- [ ] Verify Close does not send { completed: false } (always "complete")
- [ ] Verify Close shows "Process list closed" toast
- [ ] Verify Close removes surface from active view
- [ ] Verify Close keeps process list in session history

### Process List Interactions
- [ ] Verify click on process name expands/collapses details
- [ ] Verify click on status has no action
- [ ] Verify click on "Compiled N files" has no action

### Sort Order
- [ ] Verify Running processes appear first, sorted by uptime (newest first)
- [ ] Verify Stopped processes appear second, sorted by stop time
- [ ] Verify Crashed processes appear third, sorted by crash time
- [ ] Verify sort order updates when status changes

### Update Behavior
- [ ] Verify new process appears at top with green status
- [ ] Verify stopped process moves to Stopped section with yellow status
- [ ] Verify crashed process moves to Crashed section with red status
- [ ] Verify log panel updates in real-time when open
- [ ] Verify completed process stays in Stopped section
- [ ] Verify archived process is removed from active view
- [ ] Verify list freezes with "Offline" badge on disconnect
- [ ] Verify list refreshes from backend on reconnect

### Surface Lifecycle
- [ ] Verify ProcessManager stays Active during any action (immediate completion)
- [ ] Verify ProcessManager minimizes when new surface pushed
- [ ] Verify ProcessManager dismisses on close [X] or 30min timeout

### Keyboard Shortcuts
- [ ] Verify Escape closes surface
- [ ] Verify Cmd+R restarts selected process
- [ ] Verify Cmd+W closes surface
- [ ] Verify Cmd+Up scrolls to top of list
- [ ] Verify Cmd+Down scrolls to bottom of list

### Error States
- [ ] Verify "Failed to start process" toast on process start failure
- [ ] Verify "Process not found" error updates surface
- [ ] Verify "Failed to stop — queued" on network error, auto-retry on reconnect
- [ ] Verify "Permission denied" toast on permission failure

### Edge Cases
- [ ] Verify all processes stopped: all entries show Stopped, user can restart all
- [ ] Verify all processes crashed: all entries show Crashed, user can restart all
- [ ] Verify auto-restart: status changes from Crashed to Running automatically
- [ ] Verify restart with log open: log clears and shows new output
- [ ] Verify stop with log open: log shows "Process stopped" message
- [ ] Verify multiple stop/restart in quick succession: actions queued, processed in order
- [ ] Verify empty process list: shows "No processes running" message
- [ ] Verify process manager during app launch: shows loading spinner while processes load

### Cross-Plan Consistency
- [ ] Verify no contradictions with pre-surface-lifecycle-states.md (lifecycle states)
- [ ] Verify no contradictions with pre-surface-components.md (shared components)
- [ ] Verify no contradictions with pre-notification-system.md (toast notifications)
- [ ] Verify no contradictions with pre-settings-system.md (notification settings)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All header controls specified and validated
2. [ ] All process status indicators with correct colors
3. [ ] All View Log behaviors described (expand, real-time, scroll, close)
4. [ ] All Stop/Restart behaviors described with toast messages
5. [ ] Close behavior (no completed: false, session preserved)
6. [ ] All sort order rules specified
7. [ ] All update behaviors for each process event
8. [ ] All keyboard shortcuts described
9. [ ] All error states with recovery actions
10. [ ] All edge cases covered
11. [ ] No contradictions with other plans
