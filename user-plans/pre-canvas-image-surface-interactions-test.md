# pre-canvas-image-surface-interactions — Test Specification

## Purpose

Verify the CanvasSurface and ImageSurface interaction plans correctly specify all interactions.

## CanvasSurface Tests

### Toolbar — Pen
- [ ] Verify Pen is default active tool
- [ ] Verify click-drag draws stroke on canvas
- [ ] Verify stroke width matches selected size
- [ ] Verify Pen can be selected and unselected

### Toolbar — Eraser
- [ ] Verify Eraser removes strokes on contact
- [ ] Verify Eraser has same size as Pen
- [ ] Verify Eraser can be selected and unselected

### Toolbar — Highlighter
- [ ] Verify Highlighter creates semi-transparent, thick strokes
- [ ] Verify Highlighter can be selected and unselected

### Toolbar — Text
- [ ] Verify Text tool lets user type directly on canvas at click location
- [ ] Verify Enter confirms text, Escape cancels
- [ ] Verify Text tool can be selected and unselected

### Toolbar — Undo / Redo
- [ ] Verify Undo reverts last stroke, up to 50 steps in history
- [ ] Verify Redo re-applies undone strokes
- [ ] Verify Undo/Redo can be used multiple times

### Toolbar — Zoom
- [ ] Verify [Zoom 100%] shows current zoom percentage
- [ ] Verify Zoom menu shows: 50%, 75%, 100%, 150%, 200%, Fit to screen
- [ ] Verify selecting zoom applies immediately
- [ ] Verify pinched zoom (trackpad) maps to nearest zoom level
- [ ] Verify scroll-wheel zoom when canvas is zoomed in

### Toolbar — Clear
- [ ] Verify Clear button asks "Clear all strokes?" confirmation dialog
- [ ] Verify "Yes" clears all strokes, shows "Cleared" toast
- [ ] Verify "No" dismisses dialog, nothing changes

### Footer — Notes Text Area
- [ ] Verify placeholder text is shown
- [ ] Verify auto-save every 2 seconds to IndexedDB
- [ ] Verify character limit: 5000 characters
- [ ] Verify auto-grow: up to 150px max height

### Footer — Send → Button
- [ ] Verify sends strokes + notes to Claude
- [ ] Verify validates notes text is not empty before send
- [ ] Verify empty text shows inline error: "Please add some notes"
- [ ] Verify button changes to "Sending..." with spinner
- [ ] Verify success shows "✓ Sent" (green), toast: "Response sent" (3s)
- [ ] Verify button reverts to "Send →" after 2 seconds
- [ ] Verify network error shows "Failed to send — queued locally" (6s)
- [ ] Verify 30s timeout disables button

### Footer — Clear Canvas Button
- [ ] Verify asks "Clear all strokes?" confirmation dialog
- [ ] Verify "Yes" clears all strokes, shows "Cleared" toast
- [ ] Verify "No" dismisses dialog, nothing changes

### Canvas Interactions
- [ ] Verify drag-draw draws stroke
- [ ] Verify double-click opens text tool
- [ ] Verify pinch-to-zoom works (trackpad)
- [ ] Verify scroll-wheel scrolls canvas when zoomed
- [ ] Verify right-click opens context menu: Copy, Paste, Select All

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
- [ ] Verify Active → Responding: Send button click
- [ ] Verify Responding → Complete: Claude processes
- [ ] Verify Active → Minimized: new surface pushed
- [ ] Verify Active → Dismissed: close [✕] or 30min timeout
- [ ] Verify close [✕] sends { completed: false } to Claude

### Error States
- [ ] Verify network error → "Failed to send — queued" toast
- [ ] Verify invalid canvas data → error toast
- [ ] Verify permission denied → macOS dialog

### Toast Messages
- [ ] Verify "Response sent" (3s)
- [ ] Verify "Cleared" (1s)
- [ ] Verify "Failed to send — queued locally" (6s)

## ImageSurface Tests

### Zoom / Pan
- [ ] Verify pinch-to-zoom, scroll
- [ ] Verify double-click fits image to screen
- [ ] Verify click-drag panning when zoomed

### Annotate
- [ ] Verify click to activate annotation mode
- [ ] Verify Drawing mode: arrows, circles, text, highlighter, freehand
- [ ] Verify user can annotate, zoom, pan the image

### Open
- [ ] Verify opens image in default image viewer (macOS Preview)

### Send
- [ ] Verify sends annotated image + notes to Claude
- [ ] Verify validates notes text is not empty before send
- [ ] Verify empty text shows inline error: "Please add some notes"
- [ ] Verify button shows "Sending..." with spinner
- [ ] Verify success shows "✓ Sent" (green), toast: "Response sent" (3s)
- [ ] Verify button reverts to "Send" after 2 seconds
- [ ] Verify network error shows "Failed to send — queued locally" (6s)
- [ ] Verify 30s timeout disables button

### Clear Annotations
- [ ] Verify removes all marks, keeps original image
- [ ] Verify no confirmation needed (clears immediately)
- [ ] Verify "Annotations cleared" toast (1s)
- [ ] Verify all annotations removed, original image restored

### Close [✕]
- [ ] Verify closes the surface
- [ ] Verify sends { completed: false } to Claude
- [ ] Verify no confirmation dialog
- [ ] Verify surface removed from active view

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All toolbar buttons have behavior descriptions
2. [ ] All footer buttons have behavior descriptions
3. [ ] All canvas interactions are described
4. [ ] All keyboard shortcuts are listed
5. [ ] Surface lifecycle transitions are correct
6. [ ] Close [✕] sends { completed: false } to Claude
7. [ ] All error states are described
8. [ ] All toast messages are specified with duration
