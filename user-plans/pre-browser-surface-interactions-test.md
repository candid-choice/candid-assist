# pre-browser-surface-interactions — Test Specification

## Purpose

Verify the BrowserSurface interaction plan correctly specifies every button, keyboard shortcut, and interaction flow.

## Unit Tests

### URL Bar
- [ ] Verify URL bar is editable
- [ ] Verify Claude can pre-populate URL (via openBrowserSurface)
- [ ] Verify user can navigate to a different URL
- [ ] Verify Enter key navigates to entered URL
- [ ] Verify Escape unfocuses URL bar
- [ ] Verify invalid URL shows inline error
- [ ] Verify non-HTTPS URL shows warning
- [ ] Verify auto-complete shows recent URLs
- [ ] Verify right-click → "Copy URL" (future)

### Back / Forward / Reload
- [ ] Verify Back button goes to previous page, surface stays Active
- [ ] Verify Back is disabled (grayed out) when at first page
- [ ] Verify Forward button goes to next page, surface stays Active
- [ ] Verify Forward is disabled (grayed out) when at last page
- [ ] Verify Reload button refreshes page, shows loading spinner
- [ ] Verify Reload has no toast notification
- [ ] Verify Back/Forward/Reload do NOT trigger Responding state

### Screenshot 📷
- [ ] Verify opens macOS screen capture overlay
- [ ] Verify captures visible area of web page
- [ ] Verify after capture, image shown in confirmation view with "Send to Claude"
- [ ] Verify Send sends screenshot to Claude via WebSocket
- [ ] Verify "Screenshot sent to Claude" toast appears
- [ ] Verify error if screen recording permission not granted → permission dialog

### Open External 🔗
- [ ] Verify opens URL in default browser (Safari)
- [ ] Verify surface stays open in Human Assist
- [ ] Verify "Opened in browser" toast appears
- [ ] Verify invalid URL shows inline error: "Invalid URL"

### Footer — Feedback Text Area
- [ ] Verify placeholder text is shown
- [ ] Verify auto-save draft to IndexedDB every 2 seconds
- [ ] Verify character limit: 5000 characters
- [ ] Verify auto-grow: up to 200px max height
- [ ] Verify X button clears text
- [ ] Verify >5000 chars → inline error: "Too long, max 5000"

### Submit → Button
- [ ] Verify sends feedback to Claude
- [ ] Verify validates text area is not empty before submit
- [ ] Verify empty text shows inline error: "Please enter some feedback"
- [ ] Verify button changes to "Sending..." with spinner
- [ ] Verify success shows "✓ Sent" (green), toast: "Response sent" (3s)
- [ ] Verify button reverts to "Submit →" after 2 seconds
- [ ] Verify network error shows "Failed to send — queued locally" (6s)
- [ ] Verify offline: button disabled, shows "Offline — queued"
- [ ] Verify 30s timeout disables button

### Take Screenshot → Button
- [ ] Verify opens macOS screen capture overlay
- [ ] Verify captures visible area of web page
- [ ] Verify after capture, image shown in confirmation view
- [ ] Verify Send sends to Claude automatically
- [ ] Verify "Screenshot sent to Claude" toast (3s)
- [ ] Verify Retake: user can capture again
- [ ] Verify error: "Screen recording permission required" dialog

### Open External → Button
- [ ] Verify opens URL in default browser
- [ ] Verify surface stays open
- [ ] Verify "Opened in browser" toast (2s)
- [ ] Verify invalid URL → inline error: "Invalid URL"

### Close [✕]
- [ ] Verify closes the surface
- [ ] Verify sends { completed: false } to Claude
- [ ] Verify no confirmation dialog
- [ ] Verify surface removed from active view
- [ ] Verify "Surface closed" toast (2s)
- [ ] Verify session remains in session list
- [ ] Verify if send fails, shows "Failed to notify Claude" toast, surface still closed

### Minimize [─]
- [ ] Verify minimizes surface to bottom bar badge
- [ ] Verify surface stays in session, content area shows dashboard
- [ ] Verify surface can be restored by clicking badge
- [ ] Verify all state preserved (URL, scroll position, zoom)
- [ ] Verify no toast (silent)
- [ ] Verify max 10 minimized surfaces

### Expand [□]
- [ ] Verify toggles between contained and full viewport
- [ ] Verify contained: surface shows in default width (~800px)
- [ ] Verify full: surface expands to fill content area
- [ ] Verify 300ms smooth resize animation

### Navigation Behavior Rules
- [ ] Verify click link → surface stays Active (NOT Responding)
- [ ] Verify type URL in bar → surface stays Active
- [ ] Verify press Enter in URL bar → surface stays Active
- [ ] Verify scroll page → surface stays Active
- [ ] Verify submit feedback → surface goes to Responding

### Surface Lifecycle
- [ ] Verify Active → Active: click link, type URL, scroll
- [ ] Verify Active → Responding: user clicks Submit
- [ ] Verify Responding → Complete: Claude processes response
- [ ] Verify Active → Error: network disconnect during submit
- [ ] Verify Active → Minimized: new surface pushed from Claude
- [ ] Verify Minimized → Active: user clicks minimized badge
- [ ] Verify Error → Active: network recovers, user clicks retry
- [ ] Verify Active → Dismissed: user clicks close [✕] or 30min timeout

### Toast Messages
- [ ] Verify "Response sent" (3s)
- [ ] Verify "Failed to send — queued locally" (6s)
- [ ] Verify "Screenshot sent to Claude" (3s)
- [ ] Verify "Opened in browser" (2s)
- [ ] Verify "Surface closed" (2s)

### Keyboard Shortcuts
- [ ] Verify Enter submits feedback
- [ ] Verify Escape closes surface
- [ ] Verify ⌘+Enter submits even if empty
- [ ] Verify ⌘+R reloads page
- [ ] Verify ⌘+L focuses URL bar
- [ ] Verify ⌘+W closes surface
- [ ] Verify ⌘+H goes back
- [ ] Verify ⌘+Shift+H goes forward
- [ ] Verify ⌘+F finds in page
- [ ] Verify ⌘+0 resets zoom
- [ ] Verify ⌘+Plus zooms in
- [ ] Verify ⌘+Minus zooms out

### Error States
- [ ] Verify page fails to load → "Failed to load page" overlay with [Retry]
- [ ] Verify network disconnect → Top banner "Connection lost — reconnecting..."
- [ ] Verify invalid URL → "Invalid URL" inline error
- [ ] Verify Webpage blocks iframe → "This page cannot be displayed in Human Assist"

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All buttons have behavior descriptions
2. [ ] All keyboard shortcuts are listed
3. [ ] All error states are described
4. [ ] All toast messages are specified with duration
5. [ ] Navigation behavior rules are clear (Active vs Responding)
6. [ ] Close [✕] sends { completed: false } to Claude
7. [ ] Surface lifecycle transitions are correct
8. [ ] Footer buttons all have before-submit validation
