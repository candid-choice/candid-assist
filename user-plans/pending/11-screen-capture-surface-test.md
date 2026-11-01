# 11-ScreenCaptureSurface — Test Specification

## Purpose

Verify every interactive element on the ScreenCaptureSurface has a behavior specification. This is the one-way capture surface.

## Unit Tests

### Capture Mode Selection
- [ ] Verify Region mode: user clicks and drags to select rectangle
- [ ] Verify Window mode: user hovers over windows, clicks to select
- [ ] Verify Full Screen mode: user clicks anywhere on screen
- [ ] Verify mode selection changes capture behavior
- [ ] Verify macOS permissions dialog appears when needed

### Capture Overlay
- [ ] Verify dimmed overlay of entire desktop appears
- [ ] Verify selected region is shown with border
- [ ] Verify region can be resized (drag edges)
- [ ] Verify region can be moved (drag center)
- [ ] Verify region size is shown (e.g., "800×600")

### Footer Controls
- [ ] Verify [Window] [Screen] [Region: 800×600] mode indicators
- [ ] Verify [Capture] button activates macOS capture overlay
- [ ] Verify [✕] close button sends { completed: false } to Claude
- [ ] Verify [Send Screenshot →] sends captured image to Claude
- [ ] Verify [Retake] re-opens capture overlay

### Send Screenshot → Button
- [ ] Verify sends captured image to Claude automatically
- [ ] Verify image is sent without notes or feedback (one-way surface)
- [ ] Verify "Screenshot sent to Claude" toast appears
- [ ] Verify surface closes automatically after send
- [ ] Verify network error shows "Failed to send" toast
- [ ] Verify image is preserved if send fails (try again possible)

### Retake Button
- [ ] Verify re-opens the capture overlay
- [ ] Verify discards current capture
- [ ] Verify no toast on retake (silent)
- [ ] Verify can retake multiple times in succession

### macOS Screen Capture Permission
- [ ] Verify "Screen recording permission required" dialog when permission not granted
- [ ] Verify user can grant permission in System Settings
- [ ] Verify after granting, capture works normally
- [ ] Verify permission denied shows error toast

### Surface Lifecycle
- [ ] Verify Active → Complete on Send Screenshot (one-way, closes after)
- [ ] Verify Active → Dismissed on close [✕] or Retake then close
- [ ] Verify close [✕] sends { completed: false } to Claude
- [ ] Verify no Responding state (one-way surface, no user feedback)
- [ ] Verify surface does not stay open after send (unlike other surfaces)

### Error States
- [ ] Verify failed capture shows error toast
- [ ] Verify capture cancelled shows no error (silent)
- [ ] Verify permission denied shows macOS dialog
- [ ] Verify network error → "Failed to send — queued" toast

### Toast Messages
- [ ] Verify "Screenshot sent to Claude" (3s)
- [ ] Verify "Screen recording permission required" (6s)
- [ ] Verify "Failed to send" (6s)
- [ ] Verify "Capture cancelled" (no toast — silent)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All 3 capture modes (Region, Window, Full Screen) have behavior descriptions
2. [ ] Capture overlay behavior is described
3. [ ] Send Screenshot → button sends image to Claude automatically
4. [ ] Retake button re-opens overlay
5. [ ] Close [✕] sends { completed: false } to Claude
6. [ ] Surface lifecycle is correct (Active → Complete, one-way)
7. ] macOS permission dialog is described
8. [ ] All error states are described
9. [ ] All toast messages are specified with duration
