# Dashboard Interactions — Every Button and Click

## Overview

Specifies every interaction on the Dashboard screen — the empty state, the active surface state, and the "Tell Claude to help you" flow.

## Dashboard Empty State (no active surfaces)

```
┌────────────────────────────────────────────────────────────────────────┐
│  ────────────────────────────────────────────────────────────────────  │
│                                                                        │
│                              ✦  (Human Assist logo)                      │
│                                                                        │
│              Tell Claude to help you by starting a task                 │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │  "Open the staging URL in Human Assist and show me        │  │  │
│  │  │   the latest signup flow. I'll review the design."         │  │  │
│  │  │                                                            │  │  │
│  │  │  ──────────────────────────────────────────────────────── │  │  │
│  │  │                                                            │  │  │
│  │  │  [📎 Add file] [🔗 Add link] [📸 Screenshot]              │  │  │
│  │  │  staging-url.txt                                           │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                  │  │
│  │  [ Send to Claude → ]       [ Cancel ]                            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Or use ⌘+N to open the Task Composer from anywhere                     │
│                                                                        │
│  ────────────────────────────────────────────────────────────────────  │
└────────────────────────────────────────────────────────────────────────┘
```

### Every button on empty state

| Button | Action | Details |
|--------|--------|---------|
| Text area (click) | Focuses text area for typing | Placeholder: "Open the staging URL in Human Assist and show me the latest signup flow..." |
| "Add file" | Opens macOS file picker | User can select files. Shows attached files below text area. Max 10 files. |
| "Add link" | Shows URL input field inline | User types URL. Auto-detects URLs pasted into text area. |
| "Screenshot" | Opens macOS screen capture overlay | User selects region/window/fullscreen. Shows attached screenshot. |
| "Send to Claude →" | Creates session + sends task to Claude | Sends task description + attachments. Creates session. Shows "Task sent to Claude" toast. |
| "Cancel" | Closes Task Composer, keeps draft | Task draft is saved to IndexedDB. Re-openable via ⌘+N. |
| "staging-url.txt" (file tag) | Shows attached file | Click "×" on file tag to remove. |
| Footer link | Opens HelpPalette | Shows keyboard shortcuts, about info. |

### File attachment flow
| Step | Action | Result |
|------|--------|--------|
| 1 | Click "Add file" | macOS file picker opens |
| 2 | User selects file(s) | File(s) shown as tags below text area |
| 3 | File tag | Shows filename, size, type. "×" removes file. |
| 4 | "Clear All" | Removes all attached files |
| Error | File too large (>50MB) | Toast: "File too large (max 50MB)" |
| Error | No files selected | No action, picker closes silently |

### Link attachment flow
| Step | Action | Result |
|------|--------|--------|
| 1 | Click "Add link" | URL input appears inline |
| 2 | User types URL | Auto-validates URL format |
| 3 | Press Enter | URL shown as clickable link tag below text area |
| 4 | Click link tag | Opens URL in default browser |
| 5 | Click "×" on link | Removes link |
| Error | Invalid URL | Inline error: "Please enter a valid URL" |
| Auto | Paste URL into text area | Auto-detects and adds as attached link |

### Screenshot attachment flow
| Step | Action | Result |
|------|--------|--------|
| 1 | Click "Screenshot" | macOS screen capture overlay appears |
| 2 | User selects region | Returns to Human Assist with captured image |
| 3 | Captured image | Shown as thumbnail below text area |
| 4 | Click thumbnail | Opens captured image in Preview |
| 5 | Click "×" on thumbnail | Removes screenshot |
| Error | Screen recording permission | Shows "Screen recording permission required" dialog |
| Error | User cancels capture | No action, no screenshot added |

## Active Surface State (surface pushed from Claude)

```
┌────────────────────────────────────────────────────────────────────────┐
│  ────────────────────────────────────────────────────────────────────  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  ✦ Browser          ────   [─] [□] [✕]                            │  │
│  │  🔍 https://staging.myapp.com/checkout   ↻  ←  →  [📷] [🔗]      │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  [Embedded web content — WKWebView, interactive]                 │  │
│  │                                                                  │  │
│  │  "The checkout works, but the coupon code field is missing from   │  │
│  │   the payment form."                                              │  │
│  │  [Submit →]  [Take Screenshot →]  [Open External →]              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ────────────────────────────────────────────────────────────────────  │
└────────────────────────────────────────────────────────────────────────┘
```

### Every button on active surface

| Button | Action | Details |
|--------|--------|---------|
| Submit → | Sends feedback to Claude | Text area captures user's feedback. Sends via WebSocket. Shows "Sending..." then "Response sent ✓" toast. |
| Take Screenshot → | Captures visible area of the web page | Opens macOS screenshot overlay. Captured image sent to Claude automatically. Shows "Screenshot sent to Claude" toast. |
| Open External → | Opens URL in default browser | Opens in Safari (or system default). Surface stays open. Shows "Opened in browser" toast. |
| Back | Goes to previous page in WKWebView | Standard browser navigation. |
| Forward | Goes to next page in WKWebView | Standard browser navigation. |
| Reload ↻ | Refreshes the page | Shows loading spinner. Surface stays Active. |
| URL bar | Editable, can navigate to other URLs | Claude pre-populates. User can navigate elsewhere. Surface stays Active. |
| Back / Forward arrows | Standard browser navigation | Surface stays Active (not Responding). |
| Screenshot 📷 | Captures visible area | Same as "Take Screenshot" button. |
| Open External 🔗 | Opens in default browser | Same as "Open External" button. |
| Close [✕] | Closes surface, sends {completed: false} | Surface removed from active view. Shows "Surface closed" toast. |
| Minimize [─] | Minimizes to badge in bottom bar | Surface stays in session, can be restored. |
| Expand [□] | Toggles contained ↔ full viewport | Content area expands/shrinks. |

## Dashboard transition flow

| From | Action | To |
|------|--------|-----|
| Empty state | Click "Send to Claude" | Creates session → Task sent to Claude → Surface appears → Empty state → Surface state |
| Empty state | Press ⌘+N | Opens Task Composer |
| Empty state | Surface pushed from Claude | Transitions to Active Surface state |
| Active Surface | Surface closed | Transitions back to Empty state |
| Active Surface | "Submit" clicked | Sends response → Shows "Response sent" toast → Surface stays open |
| Active Surface | "Take Screenshot" clicked | Opens capture → Captures → Sends to Claude → Shows "Screenshot sent" toast |
| Active Surface | "Open External" clicked | Opens in browser → Surface stays open |
| Active Surface | Minimize clicked | Surface minimizes → Dashboard shows minimized badge |
| Active Surface | Close clicked | Surface closed → Returns to Empty state |

## Toast on surface actions

| Action | Toast message | Duration | Action |
|--------|--------------|----------|--------|
| Submit | "Response sent" | 3s | None |
| Take Screenshot | "Screenshot sent to Claude" | 3s | None |
| Open External | "Opened in browser" | 2s | None |
| Close | "Surface closed" | 2s | None |
| Minimize | "Surface minimized" | 1s | None |

## Edge cases

1. **User tries to send while offline** → Toast: "Network lost — queued locally"
2. **User tries to send while surface is responding** → Disabled "Send" button, shows "Waiting for Claude..."
3. **User clicks "Send" with empty text** → Inline error: "Please enter some feedback"
4. **User adds >10 files** → Toast: "Maximum 10 files"
5. **User tries to attach >50MB file** → Toast: "File too large (max 50MB)"
6. **Task Composer opened while surface is active** → Surface stays open, Task Composer overlays on top
7. **User drags file onto Task Composer** → File auto-attached
8. **User pastes URL into text area** → Auto-detected and added as attached link
9. **Surface pushes while Task Composer is open** → Task Composer closes, surface opens
