# pre-05-Screen-Sequence-Surfaces — Test Specification

## Purpose

Verify the screen sequence for surfaces in 05-screen-sequence-surfaces.md correctly covers all surface types, interactions, and state transitions.

## Unit Tests

### BrowserSurface (10)
- [ ] Verify chrome with URL bar, back/forward, reload, screenshot, open external
- [ ] Verify footer: feedback text area, submit, take screenshot, open external
- [ ] Verify all button behaviors: submit, screenshot, open external
- [ ] Verify lifecycle: NOTIFICATION → PENDING → ACTIVE → RESPONDING → COMPLETE
- [ ] Verify surface timeout (30 min) is described

### CanvasSurface (11)
- [ ] Verify chrome: title, close, minimize
- [ ] Verify toolbar: pen, eraser, highlight, text, undo, redo, zoom, clear
- [ ] Verify footer: notes text area, send, clear canvas
- [ ] Verify all button behaviors described
- [ ] Verify interaction with user: initiate → annotate → respond → feedback

### ImageSurface (12)
- [ ] Verify chrome: navigate, zoom, annotate, open, send
- [ ] Verify footer: notes text area, send, clear annotations
- [ ] Verify all button behaviors described
- [ ] Verify lifecycle: NOTIFICATION → PENDING → ACTIVE → RESPONDING → COMPLETE

### ScreenCaptureSurface (11)
- [ ] Verify chrome: title, region/window/fullscreen selection
- [ ] Verify capture overlay behavior
- [ ] Verify confirmation view with captured image
- [ ] Verify "Send Screenshot" button behavior
- [ ] Verify "Retake" button behavior
- [ ] Verify surface closes after send (one-way surface)

### CodeDiffSurface (13)
- [ ] Verify chrome: title, file count, diff stats, approve, archive
- [ ] Verify file list with status badges
- [ ] Verify inline diff view (side-by-side/unified toggle)
- [ ] Verify annotate on line behavior
- [ ] Verify footer: notes text area, approve & merge, request changes
- [ ] Verify all button behaviors described

### TerminalSurface (15)
- [ ] Verify chrome: title, command display, clear
- [ ] Verify terminal output area (scrollable, searchable)
- [ ] Verify search behavior (⌘+F, highlights, navigate matches)
- [ ] Verify footer: notes text area, send to Claude, copy, re-run
- [ ] Verify all button behaviors described
- [ ] Verify surface lifecycle: NOTIFICATION → PENDING → ACTIVE → COMPLETE (no Responding for some actions)

### ProcessManager (14)
- [ ] Verify chrome: title, process count, archive all
- [ ] Verify process list with status indicators
- [ ] Verify each process item: name, status, uptime, output summary
- [ ] Verify process controls: view log, stop, restart
- [ ] Verify footer: close → button
- [ ] Verify all button behaviors described
- [ ] Verify lifecycle: Active → Complete (immediate, no Responding)

### Common Surface Tests
- [ ] Verify close [✕] sends { completed: false } to Claude for all surfaces
- [ ] Verify minimize [─] behavior is described for all surfaces
- [ ] Verify surface lifecycle is described for all surfaces
- [ ] Verify surface timeout (30 min) is described for all surfaces
- [ ] Verify surface responses are sent to Claude for all surfaces
- [ ] Verify toast notifications are described for each surface

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All 6 surface types are documented with chrome
2. [ ] All surface interactions have behavior descriptions
3. [ ] All surface lifecycle transitions are described
4. [ ] Close [✕] sends { completed: false } to Claude for all surfaces
5. [ ] Minimize [─] preserves state for all surfaces
6. [ ] Surface timeout (30 min) is described
7. [ ] Toast notifications are described for each surface
8. [ ] All error states are covered
