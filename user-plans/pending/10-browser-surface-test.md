# 10-BrowserSurface — Test Specification

## Purpose

Verify every interactive element on the BrowserSurface has a behavior specification. This is the most heavily-used surface and every click must be accounted for.

## Unit Tests

### Chrome — URL Bar
- [ ] Verify URL bar is editable
- [ ] Verify Claude can pre-populate URL (via openBrowserSurface)
- [ ] Verify user can navigate to a different URL
- [ ] Verify Enter key navigates to entered URL
- [ ] Verify invalid URL shows inline error
- [ ] Verify non-HTTPS URL shows warning

### Chrome — Navigation Buttons
- [ ] Verify Back button goes to previous page (surface stays Active, not Responding)
- [ ] Verify Forward button goes to next page (surface stays Active)
- [ ] Verify Back is disabled when at first page (grayed out)
- [ ] Verify Forward is disabled when at last page (grayed out)
- [ ] Verify Reload button refreshes page with loading spinner
- [ ] Verify Reload has no toast notification

### Chrome — Screenshot Button
- [ ] Verify Screenshot 📷 opens macOS screen capture overlay
- [ ] Verify captured image is sent to Claude automatically
- [ ] Verify "Screenshot sent to Claude" toast appears
- [ ] Verify permission denied shows macOS permission dialog
- [ ] Verify captured image shows in confirmation view

### Chrome — Open External Button
- [ ] Verify Open External 🔗 opens URL in default browser (Safari)
- [ ] Verify surface stays open in Human Assist
- [ ] Verify "Opened in browser" toast appears
- [ ] Verify invalid URL shows inline error

### Footer — Feedback Text Area
- [ ] Verify placeholder text is shown
- [ ] Verify auto-save every 2 seconds to IndexedDB
- [ ] Verify character limit (5000 chars)
- [ ] Verify auto-grow up to 200px max height
- [ ] Verify X button clears text
- [ ] Verify >5000 chars shows inline error

### Footer — Submit → Button
- [ ] Verify validates text area is not empty before submit
- [ ] Verify empty text shows inline error: "Please enter some feedback"
- [ ] Verify button changes to "Sending..." with spinner
- [ ] Verify success shows "✓ Sent" (green) and "Response sent" toast
- [ ] Verify button reverts to "Submit →" after 2 seconds
- [ ] Verify network error shows "Failed to send — queued locally" toast
- [ ] Verify offline button is disabled with "Offline — queued"
- [ ] Verify 30s timeout disables button

### Footer — Take Screenshot → Button
- [ ] Verify opens macOS screen capture overlay
- [ ] Verify captured image shows in confirmation view
- [ ] Verify "Screenshot sent to Claude" toast
- [ ] Verify permission denied shows macOS dialog

### Footer — Open External → Button
- [ ] Verify opens URL in default browser
- [ ] Verify "Opened in browser" toast
- [ ] Verify invalid URL shows inline error

### Surface Header — Close/Minimize/Expand
- [ ] Verify Close [✕] sends { completed: false } to Claude
- [ ] Verify Close [✕] removes surface from active view
- [ ] Verify Close [✕] shows "Surface closed" toast
- [ ] Verify No confirmation on Close [✕]
- [ ] Verify Minimize [─] minimizes to badge in bottom bar
- [ ] Verify Minimize [─] preserves surface state
- [ ] Verify Minimize [─] is silent (no toast)
- [ ] Verify Max 10 minimized surfaces
- [ ] Verify Expand [□] toggles contained ↔ full viewport
- [ ] Verify Expand animation is 300ms smooth resize
- [ ] Verify Minimize preserves scroll position and URL

### Navigation Behavior Rules
- [ ] Verify click link → Surface stays Active (NOT Responding)
- [ ] Verify type URL in bar → Surface stays Active
- [ ] Verify press Enter in URL bar → Surface stays Active
- [ ] Verify scroll page → Surface stays Active
- [ ] Verify submit feedback → Surface goes to Responding
- [ ] Verify take screenshot → Surface stays Active

### Keyboard Shortcuts
- [ ] Verify Enter submits feedback
- [ ] Verify Escape closes surface
- [ ] Verify ⌘+Enter submits even if empty
- [ ] Verify ⌘+R reloads page
- [ ] Verify ⌘+L focuses URL bar
- [ ] Verify ⌘+W closes surface

### Error States
- [ ] Verify page fails to load → "Failed to load page" overlay with [Retry]
- [ ] Verify network disconnect → Top banner "Connection lost"
- [ ] Verify invalid URL → "Invalid URL" inline error
- [ ] Verify Webpage blocks iframe → "Cannot be displayed" overlay

### Toast Messages
- [ ] Verify "Response sent" (3s)
- [ ] Verify "Failed to send — queued locally" (6s)
- [ ] Verify "Screenshot sent to Claude" (3s)
- [ ] Verify "Opened in browser" (2s)
- [ ] Verify "Surface closed" (2s)
- [ ] Verify no toast on minimize

## Implementation Checklist

Before considering this plan "complete":
1. [ ] Every button has a behavior description
2. [ ] Every keyboard shortcut is listed
3. [ ] Every error state is described
4. [ ] Every toast message is specified with duration and action
5. [ ] Navigation behavior rules are clear (Active vs Responding)
6. [ ] Close [✕] sends { completed: false } to Claude
7. [ ] Surface lifecycle transitions are correct
8. [ ] Footer buttons all have before-submit validation
