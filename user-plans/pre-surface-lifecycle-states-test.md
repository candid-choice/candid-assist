# pre-surface-lifecycle-states-test — Test Specification

## Purpose

Verify the Surface Lifecycle States document correctly defines all state names, state transitions, and transition rules.

## Unit Tests

### Common Lifecycle States
- [ ] Verify NOTIFICATION state: surface pushed by Claude, waiting to render
- [ ] Verify PENDING state: surface loading content
- [ ] Verify ACTIVE state: surface fully rendered, user can interact
- [ ] Verify RESPONDING state: user submitted response, waiting for Claude
- [ ] Verify COMPLETE state: surface lifecycle finished
- [ ] Verify DISMISSED state: user closed surface manually
- [ ] Verify ERROR state: surface load/interaction failed
- [ ] Verify TIMED_OUT state: 30min no interaction timeout
- [ ] Verify MINIMIZED state: surface hidden but preserved, waiting for reactivation

### BrowserSurface States
- [ ] Verify NOTIFICATION → PENDING: surface data received
- [ ] Verify PENDING → ACTIVE: page loaded, interactive
- [ ] Verify PENDING → ERROR: page load fails
- [ ] Verify ACTIVE → RESPONDING: user submits feedback
- [ ] Verify ACTIVE → ACTIVE: user navigates (click links, type URL, scroll)
- [ ] Verify ACTIVE → MINIMIZED: new surface pushed
- [ ] Verify ACTIVE → COMPLETE: user sends response, surface done
- [ ] Verify ACTIVE → DISMISSED: user closes [X]
- [ ] Verify ACTIVE → TIMED_OUT: 30min no interaction
- [ ] Verify ACTIVE → ERROR: network disconnect
- [ ] Verify BrowserSurface: navigation events are ACTIVE → ACTIVE (stay active)

### CanvasSurface States
- [ ] Verify NOTIFICATION → PENDING: canvas data received
- [ ] Verify PENDING → ACTIVE: canvas content rendered
- [ ] Verify PENDING → ERROR: canvas rendering fails
- [ ] Verify ACTIVE → RESPONDING: user clicks Send
- [ ] Verify ACTIVE → ACTIVE: user draws, erases, undos, redos
- [ ] Verify ACTIVE → MINIMIZED: new surface pushed
- [ ] Verify ACTIVE → DISMISSED: user closes [X]
- [ ] Verify ACTIVE → TIMED_OUT: 30min no interaction
- [ ] Verify CanvasSurface: drawing is ACTIVE → ACTIVE (stays active)

### ImageSurface States
- [ ] Verify NOTIFICATION → PENDING: image data received
- [ ] Verify PENDING → ACTIVE: image rendered, interactive
- [ ] Verify PENDING → ERROR: image load fails
- [ ] Verify ACTIVE → RESPONDING: user clicks Send feedback
- [ ] Verify ACTIVE → ACTIVE: user zooms, pans, annotates
- [ ] Verify ACTIVE → MINIMIZED: new surface pushed
- [ ] Verify ACTIVE → DISMISSED: user closes [X]
- [ ] Verify ACTIVE → TIMED_OUT: 30min no interaction

### ScreenCaptureSurface States
- [ ] Verify NOTIFICATION → PENDING: capture data received
- [ ] Verify PENDING → ACTIVE: capture rendered
- [ ] Verify PENDING → ERROR: capture load fails
- [ ] Verify ACTIVE → RESPONDING: user clicks Send
- [ ] Verify ACTIVE → MINIMIZED: new surface pushed
- [ ] Verify ACTIVE → DISMISSED: user closes [X]
- [ ] Verify ACTIVE → TIMED_OUT: 30min no interaction

### CodeDiffSurface States
- [ ] Verify NOTIFICATION → PENDING: diff data received
- [ ] Verify PENDING → ACTIVE: diff rendered, interactive
- [ ] Verify PENDING → ERROR: diff rendering fails
- [ ] Verify ACTIVE → RESPONDING: user clicks Approve or Request Changes
- [ ] Verify ACTIVE → ACTIVE: user scrolls, comments (not Approve/Request Changes)
- [ ] Verify ACTIVE → MINIMIZED: new surface pushed
- [ ] Verify ACTIVE → DISMISSED: user closes [X]
- [ ] Verify ACTIVE → TIMED_OUT: 30min no interaction

### TerminalSurface States
- [ ] Verify NOTIFICATION → PENDING: terminal data received
- [ ] Verify PENDING → ACTIVE: terminal rendered
- [ ] Verify PENDING → ERROR: terminal load fails
- [ ] Verify ACTIVE → RESPONDING: user clicks Send to Claude
- [ ] Verify ACTIVE → ACTIVE: user scrolls, searches, copies
- [ ] Verify ACTIVE → MINIMIZED: new surface pushed
- [ ] Verify ACTIVE → DISMISSED: user closes [X]
- [ ] Verify ACTIVE → TIMED_OUT: 30min no interaction

### ProcessManager States
- [ ] Verify NOTIFICATION → PENDING: process data received
- [ ] Verify PENDING → ACTIVE: process list rendered
- [ ] Verify PENDING → ERROR: process list load fails
- [ ] Verify ACTIVE → ACTIVE: user views log, stops, restarts, archives
- [ ] Verify ACTIVE → COMPLETE: any action (immediate, no Responding)
- [ ] Verify ACTIVE → MINIMIZED: new surface pushed
- [ ] Verify ACTIVE → DISMISSED: user closes [X] or 30min timeout
- [ ] Verify ProcessManager: actions are immediate, skip RESPONDING

### Transition Rules
- [ ] Verify NOTIFICATION → PENDING triggers surface render pipeline
- [ ] Verify PENDING → ACTIVE triggers user interaction
- [ ] Verify ACTIVE → RESPONDING triggers waiting state
- [ ] Verify RESPONDING → COMPLETE returns to user
- [ ] Verify any state → ERROR shows error UI
- [ ] Verify ERROR → NOTIFICATION recovers automatically
- [ ] Verify ERROR → DISMISSED via user close
- [ ] Verify DISMISSED sends { completed: false } to Claude
- [ ] Verify TIMED_OUT sends { reason: "timeout" } to Claude
- [ ] Verify MINIMIZED → ACTIVE via user click or app dismiss
- [ ] Verify MINIMIZED surfaces keep their state (no data loss)

### Transition Exceptions
- [ ] Verify ProcessManager: ACTIVE → COMPLETE (skip RESPONDING)
- [ ] Verify BrowserSurface: navigation events stay ACTIVE (don't trigger RESPONDING)
- [ ] Verify TerminalSurface: send to Claude goes through RESPONDING (not exception)
- [ ] Verify CodeDiffSurface: scrolling/comments stay ACTIVE (Approve/Request Changes trigger RESPONDING)

### Cross-Plan Consistency
- [ ] Verify all states match pre-surface-transitions.md (transition diagram)
- [ ] Verify all transitions match pre-surface-render-pipeline.md (pipeline stages)
- [ ] Verify state names match pre-surface-components.md (component states)
- [ ] Verify lifecycle matches pre-mcp-protocol.md (rule 3: surface must be closed after completion)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All common lifecycle states defined
2. [ ] All surface-specific state transitions described
3. [ ] All transition rules are specified
4. [ ] All transition exceptions documented
5. [ ] All state names consistent across surfaces
6. [ ] No contradictions with other plans
