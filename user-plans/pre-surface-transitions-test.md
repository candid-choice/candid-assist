# pre-surface-transitions-test — Test Specification

## Purpose

Verify the Surface Transition Rules document correctly defines the state transition diagram, transition rules, error recovery paths, and state persistence.

## Unit Tests

### State Transition Diagram
- [ ] Verify [*] → NOTIFICATION: Claude pushes surface
- [ ] Verify NOTIFICATION → PENDING: backend confirms, surface loads
- [ ] Verify PENDING → ACTIVE: surface fully rendered, user can interact
- [ ] Verify PENDING → ERROR: surface load fails
- [ ] Verify PENDING → NOTIFICATION: load times out (>5s)
- [ ] Verify ACTIVE → RESPONDING: user clicks Submit/Send/Approve
- [ ] Verify ACTIVE → ACTIVE: user navigates (browser), draws (canvas), scrolls (terminal/diff)
- [ ] Verify ACTIVE → ERROR: network disconnects
- [ ] Verify RESPONDING → COMPLETE: Claude processes response
- [ ] Verify RESPONDING → ERROR: Claude disconnects
- [ ] Verify RESPONDING → RESPONDING: still processing (>3s spinner)
- [ ] Verify COMPLETE → ACTIVE: Claude pushes more surfaces or user closes surface
- [ ] Verify ERROR → NOTIFICATION: error recovers
- [ ] Verify ERROR → DISMISSED: user closes surface
- [ ] Verify ACTIVE → MINIMIZED: new surface pushed (current hides)
- [ ] Verify MINIMIZED → ACTIVE: user clicks minimized surface
- [ ] Verify MINIMIZED → ACTIVE: user dismisses app
- [ ] Verify ACTIVE → TIMED_OUT: 30min no interaction
- [ ] Verify ACTIVE → DISMISSED: user clicks close [X]
- [ ] Verify DISMISSED → [*]: sends { completed: false } to Claude
- [ ] Verify TIMED_OUT → [*]: sends { reason: "timeout" } to Claude
- [ ] Verify ERROR → [*]: if unrecoverable

### NOTIFICATION → PENDING
- [ ] Verify trigger: backend confirms surface data exists
- [ ] Verify duration: <200ms (instant if cached)
- [ ] Verify fallback: >5s shows "Preparing surface..." toast

### PENDING → ACTIVE
- [ ] Verify trigger: all surface content loaded (HTML, styles, images)
- [ ] Verify duration per type: Browser ~2s, Canvas ~100ms, Diff ~500ms
- [ ] Verify validation: if any resource fails, go to ERROR

### ACTIVE → RESPONDING (Submit Actions)
- [ ] Verify BrowserSurface: user types feedback + clicks Submit
- [ ] Verify CanvasSurface: user clicks Send
- [ ] Verify ImageSurface: user clicks Send
- [ ] Verify ScreenCaptureSurface: user clicks Send
- [ ] Verify CodeDiffSurface: user clicks Approve or Request Changes
- [ ] Verify ProcessManager: user clicks Stop (immediate, no Responding)
- [ ] Verify TerminalSurface: user clicks Send to Claude
- [ ] Verify ProcessManager exception: ACTIVE → COMPLETE (bypasses RESPONDING)

### ACTIVE → ACTIVE (Navigation, Not Submit)
- [ ] Verify Browser: clicking links, typing URL, scrolling
- [ ] Verify Canvas: drawing, erasing, undo/redo
- [ ] Verify Image: zooming, panning, annotating
- [ ] Verify Terminal: scrolling, searching, copying
- [ ] Verify CodeDiff: scrolling, commenting (commenting does NOT trigger submit)
- [ ] Verify these transitions stay in Active, do NOT go to Responding

### ACTIVE → MINIMIZED
- [ ] Verify trigger: Claude pushes new surface while one is active
- [ ] Verify behavior: current surface minimized to bottom bar
- [ ] Verify behavior: new surface opens in main area
- [ ] Verify state preservation: all minimized surfaces keep their state
- [ ] Verify state preservation: no data is lost

### TIMED_OUT → [*]
- [ ] Verify trigger: 30 minutes of no user interaction in Active state
- [ ] Verify timeout start: only counts when surface is Active, not during Responding or Complete
- [ ] Verify timeout reset: any user interaction (click, scroll, type) resets 30min timer
- [ ] Verify exception: BrowserSurface navigation does NOT count as interaction for timeout
- [ ] Clarification: clicking links in BrowserSurface does NOT reset timeout

### Error Recovery Paths
- [ ] Verify surface load fails: retry fetch from backend (up to 3 times)
- [ ] Verify network disconnects: queue actions locally, show banner
- [ ] Verify Claude disconnects: surface stays open, user can close it
- [ ] Verify Firebase auth expires: silent re-auth, resume operations
- [ ] Verify Firestore write fails: queue action, retry on reconnect
- [ ] Verify max surfaces reached: block new surface, show toast
- [ ] Verify app crash: restore last known state on restart

### State Persistence
- [ ] Verify Surface data: persisted to Firestore, permanent lifetime (session lifetime)
- [ ] Verify Surface state (Active/Complete/Dismissed): persisted to Firestore, permanent
- [ ] Verify User response (draft): persisted to IndexedDB, until sent or app cleared
- [ ] Verify Minimized surfaces: persisted to Electron app state, until app quit
- [ ] Verify Surface interactions: persisted to Firestore (append-only), permanent

### Cross-Plan Consistency
- [ ] Verify transition diagram matches pre-surface-lifecycle-states.md (state definitions)
- [ ] Verify BrowserSurface navigation exception documented in both lifecycle and transitions
- [ ] Verify ProcessManager ACTIVE → COMPLETE (skip RESPONDING) matches pre-surface-lifecycle-states.md
- [ ] Verify 30min timeout matches pre-surface-lifecycle-states.md
- [ ] Verify error recovery matches pre-crash-recovery.md (crash handling)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All state transitions in the diagram are correct
2. [ ] All transition rules (NOTIFICATION→PENDING, PENDING→ACTIVE, etc.) are accurate
3. [ ] All submit actions (ACTIVE→RESPONDING) per surface type are described
4. [ ] All navigation events (ACTIVE→ACTIVE) per surface type are described
5. [ ] MINIMIZED and TIMED_OUT rules are complete
6. [ ] All error recovery paths specified
7. [ ] All state persistence rules defined
8. [ ] No contradictions with other plans
