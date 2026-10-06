# Surface-Lifecycle-States — Test Specification

## Purpose

Verify every surface lifecycle transition is specified, complete, and internally consistent across all surface types.

## Unit Tests

### Common Lifecycle (all surfaces)
- [ ] Verify NOTIFICATION state: surface hasn't been pushed yet, backend preparing
- [ ] Verify PENDING state: surface data loading, chrome appears in bottom bar with spinner
- [ ] Verify ACTIVE state: surface fully rendered and interactive
- [ ] Verify RESPONDING state: user submitted data, waiting for Claude to process
- [ ] Verify COMPLETE state: user submitted and Claude processed response
- [ ] Verify DISMISSED state: user closed surface without completing
- [ ] Verify TIMED_OUT state: no user interaction for 30 minutes
- [ ] Verify transitions: NOTIFICATION → PENDING → ACTIVE → RESPONDING → COMPLETE / DISMISSED / TIMED_OUT
- [ ] Verify ALL surfaces can go to: ERROR (from any state)

### BrowserSurface — Surface-Specific States
- [ ] Verify Initial load: WKWebView loads URL, shows loading spinner overlay
- [ ] Verify Navigating: user clicks links or types URL — surface stays Active
- [ ] Verify Screenshot taken: user clicks 📷 — shows "Capturing..." then image with "Send to Claude?" prompt
- [ ] Verify Submit response: user types feedback + clicks Submit — transitions to Responding

### CanvasSurface — Surface-Specific States
- [ ] Verify Drawing: user draws freely — surface stays Active
- [ ] Verify Clear: user clicks Clear — confirms first, then clears all strokes
- [ ] Verify Send: user clicks Send — transitions to Responding, sends all strokes + notes

### ImageSurface — Surface-Specific States
- [ ] Verify Annotating: user draws annotations — surface stays Active
- [ ] Verify Clear annotations: user clicks "Clear Annotations" — removes marks, stays Active
- [ ] Verify Send: user clicks "Send" — transitions to Responding, sends annotated image

### ScreenCaptureSurface — Surface-Specific States
- [ ] Verify Capture in progress: macOS capture overlay is visible
- [ ] Verify Region selected: user selects area — returns to Human Assist, shows confirmation view
- [ ] Verify Send screenshot: user clicks "Send" — transitions to Responding, sends image
- [ ] Verify Retake: user clicks "Retake" — returns to capture overlay

### CodeDiffSurface — Surface-Specific States
- [ ] Verify Reviewing: user scrolls through diffs, adds inline comments — surface stays Active
- [ ] Verify Approve: user clicks "Approve & Merge" — transitions to Responding
- [ ] Verify Request changes: user clicks "Request Changes" — transitions to Responding
- [ ] Verify Archive: user clicks "Archive" — surface closes, diff removed from active view

### ProcessManager — Surface-Specific States
- [ ] Verify Monitoring: user watches process list — no submit triggered by monitoring
- [ ] Verify Stop process: user clicks "Stop" — sends { action: "stopped", pid: } immediately
- [ ] Verify Restart process: user clicks "Restart" — sends { action: "restarted", pid: } immediately
- [ ] Verify View log: user clicks "View Log" — expands terminal panel inline, doesn't trigger submit

### TerminalSurface — Surface-Specific States
- [ ] Verify Scrolling: user scrolls through output — no submit triggered
- [ ] Verify Search: user searches lines — filters in place, no submit triggered
- [ ] Verify Send to Claude: user clicks "Send to Claude" — transitions to Responding
- [ ] Verify Copy: user clicks "Copy" — copies text to clipboard, no submit triggered
- [ ] Verify Re-run: user clicks "Re-run Test" — restarts last command, shows new output

### Rule Tests — One Surface at a Time
- [ ] Verify only one surface can be active in main content area
- [ ] Verify if Claude pushes a new surface, the current one is minimized
- [ ] Verify minimized surface stays in session
- [ ] Verify minimized surface can be restored by clicking badge

### Rule Tests — Minimize Preserves State
- [ ] Verify if user closes the app during an active surface, the surface stays in the session
- [ ] Verify surface can be resumed on next launch
- [ ] Verify all surface state is preserved (URL, scroll position, zoom, annotations, comments)

### Rule Tests — Close Always Sends { completed: false }
- [ ] Verify close [✕] sends { completed: false } to Claude
- [ ] Verify EXCEPT for surfaces where close is the normal flow (e.g., ScreenCapture after send)
- [ ] Verify EXCEPT for ProcessManager (always "complete")
- [ ] Verify EXCEPT for TerminalSurface when re-run is clicked (not a close)

### Rule Tests — ProcessManager and TerminalSurface Are "Complete"
- [ ] Verify ProcessManager actions (Stop, Restart) happen immediately without Responding state
- [ ] Verify View Log does NOT trigger a Responding state
- [ ] Verify TerminalSurface "Send to Claude" goes through Responding state (not immediate)
- [ ] Verify TerminalSurface Copy does NOT trigger Responding state
- [ ] Verify TerminalSurface Re-run does NOT trigger Responding state

### Rule Tests — BrowserSurface Navigation Is Always "Active"
- [ ] Verify clicking links does NOT trigger a Responding state
- [ ] Verify typing in URL bar does NOT trigger a Responding state
- [ ] Verify scrolling does NOT trigger a Responding state
- [ ] Verify only the footer Submit button triggers a Responding state

### Rule Tests — Timeout Is Per-Surface
- [ ] Verify 30 minutes of no user interaction in Active state triggers Timed Out
- [ ] Verify Responding state does NOT count toward timeout (Claude is still working)
- [ ] Verify Complete state does NOT count toward timeout
- [ ] Verify any user interaction resets the 30-minute timer

### Error Transition Tests
- [ ] Verify surface load fails → ERROR state
- [ ] Verify network disconnect → ERROR state
- [ ] Verify Claude disconnects mid-surface → ERROR state (stays open, user can close)
- [ ] Verify verify surface timeout (30min) → auto-disconnect with toast

### Rule Tests — Notifications Are Ephemeral
- [ ] Verify if surface is pushed while app is backgrounded, macOS notification appears
- [ ] Verify clicking notification brings surface to foreground
- [ ] Verify dismissing notification is fine — surface stays in session

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All 7 states are defined for each surface type
2. [ ] All transitions are described for each surface
3. [ ] All 10 rules are verified as present
4. [ ] All error transitions are described
5. [ ] Close [✕] sends { completed: false } consistently
6. [ ] BrowserSurface navigation is always Active (no Responding)
7. [ ] ProcessManager actions are immediate (no Responding)
8. [ ] TerminalSurface Send goes through Responding (not immediate)
9. [ ] 30-minute timeout is per-surface
10. [ ] All edge cases are covered
