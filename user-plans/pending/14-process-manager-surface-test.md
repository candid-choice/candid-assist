# 14-ProcessManager — Test Specification

## Purpose

Verify every interactive element on the ProcessManager surface has a behavior specification. This covers the process dashboard that shows long-running processes Claude Code has launched.

## Unit Tests

### Chrome — Archive All Button
- [ ] Verify Archive All archives all completed processes
- [ ] Verify no confirmation needed
- [ ] Verify "All processes archived" toast appears
- [ ] Verify running processes stay visible
- [ ] Verify stopped/crashed processes are archived

### Chrome — Process Count
- [ ] Verify "3 processes running · 0 crashed" is displayed
- [ ] Verify running count updates in real-time
- [ ] Verify crashed count updates in real-time
- [ ] Verify count is click-free (informational only)

### Process Status Indicators
- [ ] Verify ● green dot = Running (process is actively running)
- [ ] Verify ⏸ yellow dot = Stopped (process was stopped by user)
- [ ] Verify ⚠ red dot = Crashed (process exited with error)
- [ ] Verify status updates in real-time

### Process Item — View Log Button
- [ ] Verify expands terminal panel inline below the process entry
- [ ] Verify shows process output in real-time
- [ ] Verify auto-scrolls to bottom when new output arrives
- [ ] Verify click "View Log" again to collapse
- [ ] Verify new lines appear in real-time as process runs
- [ ] Verify user can scroll up to see older output
- [ ] Verify select text and ⌘+C to copy
- [ ] Verify stopped process shows last known output
- [ ] Verify crashed process shows error output

### Process Item — Stop Button
- [ ] Verify sends SIGTERM to the process
- [ ] Verify process status changes from Running to Stopped
- [ ] Verify no confirmation needed (quiet action)
- [ ] Verify "Process stopped" toast appears
- [ ] Verify "Stop" button changes to "Restart" after stop
- [ ] Verify network error shows "Failed to stop process" toast

### Process Item — Restart Button
- [ ] Verify restarts the process with same command
- [ ] Verify process status changes from Stopped/Crashed to Running
- [ ] Verify no confirmation needed
- [ ] Verify "Process restarted" toast appears
- [ ] Verify status changes to Running
- [ ] Verify log shows new output after restart
- [ ] Verify network error shows "Failed to restart process" toast

### Footer — Close → Button
- [ ] Verify closes the ProcessManager surface
- [ ] Verify does NOT send { completed: false } (always "complete")
- [ ] Verify removes surface from active view
- [ ] Verify "Process list closed" toast appears

### Process List Sort Order
- [ ] Verify Running processes appear first, sorted by uptime (newest first)
- [ ] Verify Stopped processes appear second, sorted by stop time
- [ ] Verify Crashed processes appear third, sorted by crash time
- [ ] Verify order updates in real-time

### Process List Update Behavior
- [ ] Verify new process appears at top of list, green status
- [ ] Verify process stopped moves entry to "Stopped" section, yellow status
- [ ] Verify process crashed moves entry to "Crashed" section, red status
- [ ] Verify process output updates in real-time if log is open
- [ ] Verify process completed stays visible in "Stopped" section
- [ ] Verify archived process removed from active view
- [ ] Verify network disconnect → list freezes, shows "Offline" badge
- [ ] Verify network reconnect → list refreshes from backend

### Process Click Interactions
- [ ] Verify clicking process name expands details (command, pid, uptime)
- [ ] Verify clicking again collapses process details
- [ ] Verify clicking on status has no action
- [ ] Verify clicking on status text has no action (informational)

### Surface Lifecycle
- [ ] Verify Active → Complete (immediate — no Responding state)
- [ ] Verify Active → Minimized (new surface pushed)
- [ ] Verify Active → Dismissed (close [✕] or 30min timeout)
- [ ] Verify any action (view log, stop, restart) is "complete" immediately

### Keyboard Shortcuts
- [ ] Verify Escape closes surface
- [ ] Verify ⌘+R restarts selected process
- [ ] Verify ⌘+W closes surface
- [ ] Verify ⌘+↑ scrolls to top of list
- [ ] Verify ⌘+↓ scrolls to bottom of list

### Error States
- [ ] Verify process fails to start → "Failed to start process" toast
- [ ] Verify process not found → "Process not found" error
- [ ] Verify permission denied → "Permission denied" toast
- [ ] Verify network error → "Failed to stop — queued" toast

### Toast Messages
- [ ] Verify "Process stopped" (2s)
- [ ] Verify "Process restarted" (2s)
- [ ] Verify "All processes archived" (2s)
- [ ] Verify "Process list closed" (2s)
- [ ] Verify "Failed to start process" (6s)
- [ ] Verify "Failed to stop process" (6s)
- [ ] Verify "Permission denied" (6s)

### Edge Cases
- [ ] Verify user stops all processes → all entries show Stopped status
- [ ] Verify all processes crash → all entries show Crashed status
- [ ] Verify process auto-restarts → status changes Crashed → Running
- [ ] Verify user restarts while log is open → log clears, new output
- [ ] Verify user stops a process while log is open → log shows "Process stopped"
- [ ] Verify multiple stop/restart in quick succession → actions queued, processed in order
- [ ] Verify ProcessManager opens while no processes → "No processes running" message
- [ ] Verify ProcessManager opens during app launch → shows loading spinner

## Implementation Checklist

Before considering this plan "complete":
1. [ ] Every chrome button has a behavior description
2. [ ] Every process control (View Log, Stop, Restart) has a behavior description
3. [ ] All process sort orders are described
4. [ ] All update behaviors are described
5. [ ] All keyboard shortcuts are listed
6. [ ] Surface lifecycle is correct (Active → Complete immediately)
7. [ ] All error states are described
8. [ ] All toast messages are specified with duration
9. [ ] All edge cases are listed
10. [ ] Verify close does NOT send { completed: false } to Claude (always "complete")
