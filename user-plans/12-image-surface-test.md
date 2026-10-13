# 12-ImageSurface — Test Specification

## Purpose

Verify every interactive element on the ImageSurface has a behavior specification. This covers visual review with annotation tools.

## Unit Tests

### Chrome — Image Controls
- [ ] Verify Zoom button toggles zoom mode
- [ ] Verify Pan button enables click-drag panning when zoomed
- [ ] Verify Annotate button opens annotation tools
- [ ] Verify Open button opens image in default image viewer (macOS Preview)
- [ ] Verify Send button sends annotated image to Claude
- [ ] Verify Close [✕] sends { completed: false } to Claude

### Annotate Tool — Drawing Mode
- [ ] Verify Arrow: click-drag to draw arrow
- [ ] Verify Circle: click-drag to draw circle
- [ ] Verify Text: click to place text annotation
- [ ] Verify Highlighter: click-drag to highlight area
- [ ] Verify Freehand: click-drag to draw free lines
- [ ] Verify color picker (default red, user can change)
- [ ] Verify stroke width (Small/Medium/Large radio buttons)
- [ ] Verify annotations are sent to Claude when Send is clicked
- [ ] Verify annotations can be individually deleted
- [ ] Verify "Clear Annotations" removes all marks

### Image Controls
- [ ] Verify pinch-to-zoom (trackpad)
- [ ] Verify scroll-wheel zoom
- [ ] Verify double-click fits image to screen
- [ ] Verify click-drag panning when zoomed
- [ ] Verify "1:1" button shows image at actual size
- [ ] Verify "Fit" button shows entire image
- [ ] Verify Open in Preview opens in macOS Preview app

### Footer — Notes Text Area
- [ ] Verify placeholder text is shown
- [ ] Verify auto-save every 2 seconds to IndexedDB
- [ ] Verify character limit (5000 chars)
- [ ] Verify auto-grow up to 150px max height
- [ ] Verify X button clears text
- [ ] Verify empty text shows inline error on send

### Footer — Send → Button
- [ ] Verify validates notes text is not empty before send
- [ ] Verify empty text shows inline error: "Please add some notes"
- [ ] Verify button changes to "Sending..." with spinner
- [ ] Verify success shows "✓ Sent" (green) and "Response sent" toast
- [ ] Verify button reverts to "Send →" after 2 seconds
- [ ] Verify network error shows "Failed to send — queued locally" toast
- [ ] Verify 30s timeout disables button
- [ ] Verify sends annotated image + notes to Claude

### Footer — Clear Annotations Button
- [ ] Verify removes all annotations immediately (no confirmation)
- [ ] Verify original image is kept
- [ ] Verify "Annotations cleared" toast appears
- [ ] Verify all annotations are removed from canvas
- [ ] Verify original image is restored to full view

### Surface Lifecycle
- [ ] Verify Active → Responding on Send button click
- [ ] Verify Responding → Complete on Claude processing
- [ ] Verify Active → Minimized on new surface push
- [ ] Verify Active → Dismissed on close [✕] or 30min timeout
- [ ] Verify close [✕] sends { completed: false } to Claude

### Keyboard Shortcuts
- [ ] Verify Enter sends image + notes
- [ ] Verify ⌘+Enter sends even if empty
- [ ] Verify Escape closes surface
- [ ] Verify ⌘+0 resets zoom to fit
- [ ] Verify ⌘+Plus zooms in
- [ ] Verify ⌘+Minus zooms out
- [ ] Verify ⌘+L opens in Preview
- [ ] Verify ⌘+Shift+A clears annotations
- [ ] Verify ⌘+A selects all annotations
- [ ] Verify Delete deletes selected annotations

### Error States
- [ ] Verify image fails to load → overlay with [Retry]
- [ ] Verify network error → "Failed to send — queued" toast
- [ ] Verify invalid image format → error toast

### Toast Messages
- [ ] Verify "Response sent" (3s)
- [ ] Verify "Annotations cleared" (1s)
- [ ] Verify "Failed to send — queued locally" (6s)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] Every image control has a behavior description
2. [ ] All annotation tools have behavior descriptions
3. [ ] All footer buttons have behavior descriptions
4. [ ] All keyboard shortcuts are listed
5. [ ] Surface lifecycle transitions are correct
6. [ ] Close [✕] sends { completed: false } to Claude
7. [ ] All error states are described
8. [ ] All toast messages are specified with duration
