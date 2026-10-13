# 05-Screen-Sequence-Surfaces — Test Specification

## Purpose

Verify all 6 surface types are described with complete UI specs and interaction flows.

## Unit Tests

### BrowserSurface
- [ ] Verify chrome (title, URL bar, back/forward, reload, screenshot, open external)
- [ ] Verify footer (feedback text area, submit button)
- [ ] Verify all button behaviors are described
- [ ] Verify lifecycle (NOTIFICATION → PENDING → ACTIVE → RESPONDING → COMPLETE)
- [ ] Verify surface timeout (30 min) is described
- [ ] Verify minimize/close behavior is described

### CanvasSurface
- [ ] Verify chrome (title, close, minimize)
- [ ] Verify toolbar (pen, eraser, highlight, text, undo, redo, zoom, clear)
- [ ] Verify footer (notes text area, send button, clear canvas button)
- [ ] Verify all button behaviors are described
- [ ] Verify stroke data is captured and sent to Claude

### ImageSurface
- [ ] Verify chrome (title, navigate, zoom, annotate, open, send)
- [ ] Verify annotation tools (arrow, circle, text, highlighter, freehand)
- [ ] Verify footer (notes text area, send button, clear annotations button)
- [ ] Verify all button behaviors are described
- [ ] Verify annotated image is sent with notes to Claude

### ScreenCaptureSurface
- [ ] Verify chrome (title, region/window/fullscreen selection)
- [ ] Verify capture overlay behavior
- [ ] Verify confirmation view with captured image
- [ ] Verify "Send Screenshot" button behavior
- [ ] Verify "Retake" button behavior
- [ ] Verify surface closes after send (one-way surface)
- [ ] Verify macOS permissions are described

### CodeDiffSurface
- [ ] Verify chrome (title, file count, diff stats, approve, archive)
- [ ] Verify file list with status badges
- [ ] Verify inline diff view (side-by-side/unified toggle)
- [ ] Verify annotate on line behavior
- [ ] Verify footer (notes text area, approve & merge, request changes)
- [ ] Verify all button behaviors are described
- [ ] Verify approval status changes color (green/yellow)

### TerminalSurface
- [ ] Verify chrome (title, command display, clear)
- [ ] Verify terminal output area (scrollable, searchable)
- [ ] Verify search behavior (⌘+F, highlights, navigate matches)
- [ ] Verify footer (notes text area, send to Claude, copy, re-run)
- [ ] Verify all button behaviors are described
- [ ] Verify output is sent to Claude as text

## Common Surface Tests
- [ ] Verify close [✕] sends { completed: false } to Claude for all surfaces
- [ ] Verify minimize [─] behavior is described for all surfaces
- [ ] Verify surface lifecycle is described for all surfaces
- [ ] Verify surface timeout (30 min) is described for all surfaces
- [ ] Verify surface responses are sent to Claude for all surfaces
- [ ] Verify toast notifications are described for each surface

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All 6 surface types have chrome specifications
2. [ ] All surface interactions have behavior descriptions
3. [ ] All surface lifecycle transitions are described
4. [ ] Close [✕] sends { completed: false } to Claude
5. [ ] Minimize [─] preserves state
6. [ ] Surface timeout (30 min) is described
7. [ ] Toast notifications are described for each surface
