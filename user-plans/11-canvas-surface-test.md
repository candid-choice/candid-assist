# 11-CanvasSurface — Test Specification

## Purpose

Verify every interactive element on the CanvasSurface has a behavior specification. This covers the freeform drawing/diagramming surface.

## Unit Tests

### Chrome — Tool Bar
- [ ] Verify Pen is the default active tool
- [ ] Verify Eraser removes strokes on contact drag
- [ ] Verify Highlighter creates semi-transparent, thick strokes
- [ ] Verify Text tool lets user type directly on canvas
- [ ] Verify Text tool has 500 char max, Enter confirms, Escape cancels
- [ ] Verify Undo/Redo support up to 50 steps in history
- [ ] Verify Zoom has +/− buttons and pinch-to-zoom support
- [ ] Verify Clear button asks for confirmation before clearing

### Chrome — Zoom Control
- [ ] Verify [Zoom 100%] shows current zoom percentage
- [ ] Verify Zoom menu shows: 50%, 75%, 100%, 150%, 200%, Fit to screen
- [ ] Verify selecting zoom applies immediately
- [ ] Verify pinched zoom (trackpad) maps to nearest zoom level
- [ ] Verify scroll-wheel zoom when canvas is zoomed in

### Footer — Notes Text Area
- [ ] Verify placeholder text is shown
- [ ] Verify auto-save every 2 seconds to IndexedDB
- [ ] Verify character limit (5000 chars)
- [ ] Verify auto-grow up to 150px max height
- [ ] Verify X button clears text

### Footer — Send → Button
- [ ] Verify validates notes text is not empty before send
- [ ] Verify empty text shows inline error: "Please enter some notes"
- [ ] Verify button changes to "Sending..." with spinner
- [ ] Verify success shows "✓ Sent" (green) and "Response sent" toast
- [ ] Verify button reverts to "Send →" after 2 seconds
- [ ] Verify network error shows "Failed to send — queued locally" toast
- [ ] Verify 30s timeout disables button
- [ ] Verify sends all strokes + notes to Claude as combined payload

### Footer — Clear Canvas Button
- [ ] Verify asks "Clear all strokes?" confirmation dialog
- [ ] Verify "Yes" clears all strokes and shows "Cleared" toast
- [ ] Verify "No" dismisses dialog, nothing changes
- [ ] Verify all strokes are removed from canvas

### Drawing Behavior
- [ ] Verify click-draw draws stroke on canvas
- [ ] Verify stroke width matches selected tool
- [ ] Verify Eraser removes strokes on contact (same size as pen)
- [ ] Verify Highlighter creates semi-transparent thick strokes
- [ ] Verify Text places text at click location
- [ ] Verify Text confirms on Enter, cancels on Escape

### Canvas Interactions
- [ ] Verify drag-draw draws stroke
- [ ] Verify double-click opens text tool
- [ ] Verify pinch-to-zoom works (trackpad)
- [ ] Verify scroll-wheel scrolls canvas when zoomed
- [ ] Verify right-click opens context menu (Copy, Paste, Select All)

### Keyboard Shortcuts
- [ ] Verify Enter sends canvas + notes
- [ ] Verify ⌘+Enter sends even if empty
- [ ] Verify Escape closes surface
- [ ] Verify ⌘+Z undoes last stroke (up to 50)
- [ ] Verify ⌘+Shift+Z redoes undone stroke
- [ ] Verify ⌘+0 resets zoom to 100%
- [ ] Verify ⌘+Plus zooms in
- [ ] Verify ⌘+Minus zooms out
- [ ] Verify ⌘+A selects all strokes
- [ ] Verify ⌘+C copies canvas as image
- [ ] Verify ⌘+V pastes image

### Surface Lifecycle
- [ ] Verify Active → Responding on Send button click
- [ ] Verify Responding → Complete on Claude processing
- [ ] Verify Active → Complete (immediate — no Responding for some flows)
- [ ] Verify Active → Minimized on new surface push
- [ ] Verify Active → Dismissed on close [✕] or 30min timeout
- [ ] Verify close [✕] sends { completed: false } to Claude

### Error States
- [ ] Verify network error → "Failed to send — queued" toast
- [ ] Verify invalid canvas data → error toast
- [ ] Verify permission denied → macOS dialog

### Toast Messages
- [ ] Verify "Response sent" (3s)
- [ ] Verify "Cleared" (1s)
- [ ] Verify "Failed to send — queued locally" (6s)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] Every toolbar button has a behavior description
2. [ ] Every footer button has a behavior description
3. [ ] All drawing behaviors are described
4. [ ] All keyboard shortcuts are listed
5. [ ] Surface lifecycle transitions are correct
6. [ ] Close [✕] sends { completed: false } to Claude
7. [ ] All error states are described
8. [ ] All toast messages are specified with duration
