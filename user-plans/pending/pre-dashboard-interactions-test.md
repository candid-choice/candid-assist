# pre-dashboard-interactions — Test Specification

## Purpose

Verify the Dashboard interaction plan correctly specifies every button, click, and interaction flow.

## Unit Tests

### Empty State — Text Area
- [ ] Verify text area is clickable for typing
- [ ] Verify placeholder text: "Open the staging URL in Human Assist and show me the latest signup flow..."
- [ ] Verify auto-save draft to IndexedDB every 2 seconds
- [ ] Verify max 5000 characters

### Empty State — Add File
- [ ] Verify "Add file" opens macOS file picker
- [ ] Verify user can select files (up to 10 max)
- [ ] Verify file shown as tag below text area (filename, size, type)
- [ ] Verify "×" on file tag removes file, shows "File removed" toast
- [ ] Verify "Clear All" removes all attached files
- [ ] Verify file too large (>50MB) → "File too large (max 50MB)" toast
- [ ] Verify no files selected → no action, picker closes silently

### Empty State — Add Link
- [ ] Verify "Add link" shows URL input inline
- [ ] Verify user types URL, auto-validates URL format
- [ ] Verify Enter → URL shown as clickable link tag below text area
- [ ] Verify click link tag → opens URL in default browser
- [ ] Verify "×" on link tag removes link
- [ ] Verify invalid URL → inline error: "Please enter a valid URL"
- [ ] Verify paste URL into text area → auto-detects and adds as attached link

### Empty State — Screenshot
- [ ] Verify "Screenshot" opens macOS screen capture overlay
- [ ] Verify user selects region → returns to Human Assist with captured image
- [ ] Verify captured image shown as thumbnail below text area
- [ ] Verify click thumbnail → opens captured image in Preview
- [ ] Verify "×" on thumbnail removes screenshot
- [ ] Verify screen recording permission → shows "Screen recording permission required" dialog
- [ ] Verify user cancels capture → no action, no screenshot added

### Empty State — Send to Claude Button
- [ ] Verify sends task description + attachments
- [ ] Verify creates session in Firestore
- [ ] Verify shows "Task sent to Claude" toast (3s)
- [ ] Verify network loss → "Network lost — queued locally" toast
- [ ] Verify too many sessions → "Too many sessions open" toast

### Empty State — Cancel Button
- [ ] Verify closes Task Composer
- [ ] Verify keeps draft in IndexedDB
- [ ] Verify draft reappears if palette is re-opened via ⌘+N
- [ ] Verify draft expires after 24 hours

### Footer — Help Shortcut
- [ ] Verify footer link opens HelpPalette
- [ ] Verify HelpPalette shows keyboard shortcuts, about info

### ⌘+N Shortcut
- [ ] Verify ⌘+N opens Task Composer from anywhere
- [ ] Verify Task Composer overlays on top if surface is active

## Active Surface State

### Surface Header Controls
- [ ] Verify URL bar is editable
- [ ] Verify Back button goes to previous page, surface stays Active
- [ ] Verify Forward button goes to next page, surface stays Active
- [ ] Verify Reload button refreshes page, shows loading spinner
- [ ] Verify Screenshot 📷 opens macOS screen capture overlay
- [ ] Verify Open External 🔗 opens URL in default browser
- [ ] Verify Close [✕] sends { completed: false } to Claude
- [ ] Verify Minimize [─] minimizes to badge in bottom bar
- [ ] Verify Expand [□] toggles contained ↔ full viewport

### Footer Controls
- [ ] Verify Submit → sends feedback to Claude
- [ ] Verify Take Screenshot → opens macOS capture overlay
- [ ] Verify Open External → opens URL in default browser
- [ ] Verify feedback text area auto-saves, has max 5000 chars

### Toast Messages
- [ ] Verify "Response sent" (3s)
- [ ] Verify "Screenshot sent to Claude" (3s)
- [ ] Verify "Opened in browser" (2s)
- [ ] Verify "Surface closed" (2s)

## Dashboard Transition Flow

| From | Action | To |
|------|--------|-----|
| Empty state | Click "Send to Claude" | Creates session → Task sent to Claude → Surface appears |
| Empty state | Press ⌘+N | Opens Task Composer |
| Empty state | Surface pushed from Claude | Transitions to Active Surface state |
| Active Surface | Surface closed | Transitions back to Empty state |
| Active Surface | "Submit" clicked | Sends response → Shows "Response sent" toast → Surface stays open |
| Active Surface | "Take Screenshot" clicked | Opens capture → Captures → Sends to Claude → Shows "Screenshot sent" toast |
| Active Surface | "Open External" clicked | Opens in browser → Surface stays open |
| Active Surface | Minimize clicked | Surface minimizes → Dashboard shows minimized badge |
| Active Surface | Close clicked | Surface closed → Returns to Empty state |

## Edge Cases

- [ ] User tries to send while offline → Toast: "Network lost — queued locally"
- [ ] User tries to send while surface is responding → Disabled "Send" button, shows "Waiting for Claude..."
- [ ] User clicks "Send" with empty text → Inline error: "Please enter some feedback"
- [ ] User adds >10 files → Toast: "Maximum 10 files"
- [ ] User tries to attach >50MB file → Toast: "File too large (max 50MB)"
- [ ] Task Composer opened while surface is active → Surface stays open, Task Composer overlays on top
- [ ] User drags file onto Task Composer → File auto-attached
- [ ] User pastes URL into text area → Auto-detected and added as attached link

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All buttons have behavior descriptions
2. [ ] All keyboard shortcuts are listed
3. [ ] All error states are described
4. [ ] All toast messages are specified with duration
5. [ ] Transition flow is clear
6. [ ] Edge cases are covered
