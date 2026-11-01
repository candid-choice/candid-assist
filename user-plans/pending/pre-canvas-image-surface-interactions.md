# CanvasSurface & ImageSurface — All Interactions

## CanvasSurface — Complete Interaction Spec

### Toolbar

| Control | Behavior | Details |
|---------|----------|---------|
| Pen | Active by default | Click-drag to draw. Stroke width matches selection. |
| Eraser | Click to activate | Click-drag to erase strokes. Same size as pen. |
| Highlighter | Click to activate | Semi-transparent, thick strokes for emphasis. |
| Text | Click to activate | Click on canvas to place text, type, press Enter to confirm. |
| Undo | Button | Reverts last stroke. Up to 50 steps in history. |
| Redo | Button | Re-applies undone strokes. |
| Zoom [100%] | Click to open zoom menu | Options: 50%, 75%, 100%, 150%, 200%, Fit to screen |
| Clear | Button | Asks "Clear all strokes?" before clearing. |

### Text tool behavior

| Property | Value |
|----------|-------|
| Click canvas | Creates text input at click location |
| Type | User types text |
| Enter | Confirms text, adds to canvas |
| Escape | Cancels text input |
| Click outside | Confirms text |
| Max length | 500 characters |
| Font | System font, 14px default |
| Font size | Can change in text input (future) |
| Color | Matches selected pen color |

### Canvas interaction flow

| Action | Behavior |
|--------|----------|
| Click-drag on canvas | Draws stroke |
| Double-click on canvas | Opens text tool at that location |
| Pinch-to-zoom | Zooms canvas in/out (trackpad) |
| Scroll-wheel | Scrolls canvas when zoomed |
| Right-click on canvas | Opens context menu: Copy, Paste, Select All |
| Ctrl+click on canvas | Opens context menu: Copy, Paste, Select All |

### Footer controls

| Control | Behavior |
|---------|----------|
| Notes text area | User writes notes to go with the drawing |
| "Send →" | Sends strokes + notes to Claude |
| "Clear Canvas" | Clears all strokes, shows "Cleared" toast |

### Notes text area
| Property | Value |
|----------|-------|
| Placeholder | "Describe what you drew — what this means, what to fix..." |
| Auto-save | Draft saved to IndexedDB every 2 seconds |
| Max length | 5000 characters |
| Clear button | X appears when text is present |

### "Send →" button
| Property | Value |
|----------|-------|
| Before send | Validates notes text is not empty |
| Empty text | Inline error: "Please add some notes" |
| After send | Button shows "Sending..." with spinner |
| Success | Button changes to "✓ Sent" (green), toast: "Response sent" |
| Error | "Failed to send — queued locally" toast |

### "Clear Canvas" button
| Property | Value |
|----------|-------|
| Confirm | "Clear all strokes?" dialog |
| Yes | Clears all strokes, shows "Cleared" toast |
| No | Dialog dismisses, nothing changes |

### Canvas surface lifecycle
| From | To | Trigger |
|------|-----|---------|
| Active | Active | Draw, erase, zoom, scroll |
| Active | Responding | User clicks Send |
| Active | Complete | Immediate (no Responding state) |
| Active | Minimized | New surface pushed |
| Active | Dismissed | Close [✕] or 30min timeout |

### Canvas keyboard shortcuts
| Shortcut | Action |
|----------|--------|
| Enter | Send canvas + notes |
| ⌘+Enter | Send even if empty |
| Escape | Close surface |
| ⌘+Z | Undo |
| ⌘+Shift+Z | Redo |
| ⌘+0 | Reset zoom to 100% |
| ⌘+Plus | Zoom in |
| ⌘+Minus | Zoom out |
| ⌘+A | Select all strokes |
| ⌘+C | Copy canvas as image |
| ⌘+V | Paste image |
| Delete | Delete selected strokes |
| Backspace | Delete selected strokes |

## ImageSurface — Complete Interaction Spec

### Toolbar

| Control | Behavior | Details |
|---------|----------|---------|
| Zoom | Click to toggle zoom mode | Click image to zoom, click again to zoom out |
| Pan | Click to activate | Click-drag to pan when zoomed |
| Annotate | Click to activate | Opens annotation tools |
| Open | Opens image in default viewer | macOS Preview |
| Send | Sends annotated image to Claude | With notes |

### Annotate tool

| Property | Value |
|----------|-------|
| Arrow | Click-drag to draw arrow |
| Circle | Click-drag to draw circle |
| Text | Click to place text annotation |
| Highlighter | Click-drag to highlight area |
| Freehand | Click-drag to draw free lines |
| Color picker | Default red, user can change |
| Stroke width | Small/Medium/Large radio buttons |
| Clear | Removes all annotations, keeps image |

### Image controls

| Control | Behavior |
|---------|----------|
| Zoom | Pinch-to-zoom, scroll wheel to zoom, double-click to fit |
| Pan | Click-drag when zoomed |
| Rotate | Not supported (future) |
| Flip | Not supported (future) |
| Original size | "1:1" button shows image at actual size |
| Fit to screen | "Fit" button shows entire image |
| Open in Preview | "Open" button opens in macOS Preview app |

### Footer

| Control | Behavior |
|---------|----------|
| Notes text area | User writes notes about the image |
| "Send →" | Sends annotated image + notes to Claude |
| "Clear Annotations" | Removes all annotations, keeps original image |

### Notes text area
| Property | Value |
|----------|-------|
| Placeholder | "Describe what you see — what's wrong, what to fix..." |
| Auto-save | Draft saved to IndexedDB every 2 seconds |
| Max length | 5000 characters |

### "Send →" button
| Property | Value |
|----------|-------|
| Before send | Validates notes text is not empty |
| Empty text | Inline error: "Please add some notes" |
| After send | Button shows "Sending..." with spinner |
| Success | Button changes to "✓ Sent" (green), toast: "Response sent" |
| Error | "Failed to send — queued locally" toast |

### "Clear Annotations" button
| Property | Value |
|----------|-------|
| Confirm | No confirmation needed — clears immediately |
| Toast | "Annotations cleared" |
| Effect | All annotations removed, original image shown |

### ImageSurface lifecycle
| From | To | Trigger |
|------|-----|---------|
| Active | Active | Zoom, pan, annotate, scroll |
| Active | Responding | User clicks Send |
| Active | Complete | Immediate (no Responding state) |
| Active | Minimized | New surface pushed |
| Active | Dismissed | Close [✕] or 30min timeout |

### ImageSurface keyboard shortcuts
| Shortcut | Action |
|----------|--------|
| Enter | Send image + notes |
| ⌘+Enter | Send even if empty |
| Escape | Close surface |
| ⌘+0 | Reset zoom to fit |
| ⌘+Plus | Zoom in |
| ⌘+Minus | Zoom out |
| ⌘+L | Open in Preview |
| ⌘+Shift+A | Clear annotations |
| ⌘+A | Select all annotations |
| Delete | Delete selected annotations |

## ScreenCaptureSurface — Complete Interaction Spec

### Capture mode selection
| Mode | Behavior |
|------|----------|
| Region | User clicks and drags to select rectangle |
| Window | User hovers over windows, clicks to select |
| Full Screen | Captures entire visible screen area |

### Capture flow

| Step | Action | Result |
|------|--------|--------|
| 1 | User clicks "Capture" | macOS capture overlay appears |
| 2 | User selects region/window/screen | Returns to Human Assist with captured image |
| 3 | Captured image shown | Image displayed in confirmation view |
| 4a | User clicks "Send Screenshot →" | Sends image to Claude, surface closes |
| 4b | User clicks "Retake" | Re-opens capture overlay |
| 4c | User clicks close [✕] | Surface closes, sends `{ completed: false }` |

### "Send Screenshot →" button
| Property | Value |
|----------|-------|
| Behavior | Sends captured image to Claude |
| Automatic | Image sent without notes or feedback |
| Toast | "Screenshot sent to Claude" |
| After send | Surface closes automatically |
| Error | "Failed to send" toast, image preserved, try again |

### "Retake" button
| Property | Value |
|----------|-------|
| Behavior | Re-opens capture overlay |
| Effect | Discards current capture |
| Toast | No toast (silent) |
| Repeat | Can retake multiple times |

### Capture mode behavior

| Mode | User interaction |
|------|-----------------|
| Region | Click-drag to select rectangle |
| Window | Click any window to capture |
| Full Screen | Click anywhere on screen |

### ScreenCaptureSurface lifecycle
| From | To | Trigger |
|------|-----|---------|
| Active | Complete | User clicks "Send Screenshot" |
| Active | Dismissed | User clicks close [✕] or "Retake" then closes |
| Active | Minimized | New surface pushed (rare — this is a one-way surface) |

### Key difference from other surfaces

| Aspect | Other surfaces | ScreenCaptureSurface |
|--------|---------------|---------------------|
| Submit flow | User writes notes + sends | Automatic — just captures |
| Response required | Yes | No — one-way, no response text |
| Surface stays open | Yes, for interaction | No, closes after capture |
| Has notes field | Yes | No |
| Has Send button | Manual | Automatic |
