# BrowserSurface — Every Button, Navigation, and Response Flow

## Overview

Specifies every interaction on the BrowserSurface: URL bar, navigation buttons, screenshot, submit, close, and the feedback flow to Claude.

## Full Surface Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Browser             ────   [─] [□] [✕]                              │
│  🔍 https://staging.myapp.com/checkout          ↻  ←  →  [📷] [🔗]    │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  [WKWebView — interactive web content]                            │  │
│  │                                                                  │  │
│  │  [User is viewing the staging checkout page]                      │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ───────────────────────────────────────────────────────────────────   │
│  "The checkout works, but the coupon code field is missing from the    │
│   payment form."                                                       │
│  [Submit →]  [Take Screenshot →]  [Open External →]                   │
└────────────────────────────────────────────────────────────────────────┘
```

## Header Controls

### URL bar (🔍)
| Property | Value |
|----------|-------|
| Behavior | Editable text field |
| Claude pre-populates | Claude can set the URL via `openBrowserSurface(url: "...")` |
| User can change | User can type a new URL |
| Enter key | Navigates to the entered URL |
| Escape | Unfocuses URL bar |
| Validation | Accepts any URL (http/https), shows warning for non-HTTPS |
| Auto-complete | Shows recent URLs in dropdown as user types |
| Copy URL | Right-click → "Copy URL" (future) |
| Error | Invalid URL → inline error: "Invalid URL" |

### Back arrow (←)
| Property | Value |
|----------|-------|
| Behavior | Goes back one page in WKWebView |
| Available | Yes, if back history exists |
| Disabled | Grayed out when at first page |
| Effect | Surface stays Active, does NOT go to Responding |
| Toast | No toast |

### Forward arrow (→)
| Property | Value |
|----------|-------|
| Behavior | Goes forward one page in WKWebView |
| Available | Yes, if forward history exists |
| Disabled | Grayed out when at last page |
| Effect | Surface stays Active, does NOT go to Responding |
| Toast | No toast |

### Reload (↻)
| Property | Value |
|----------|-------|
| Behavior | Refreshes the current page |
| Icon | Rotates during reload (CSS animation) |
| Effect | Surface stays Active, shows loading spinner |
| Toast | No toast |
| Error | If page fails to load, shows "Failed to load page" overlay |

### Screenshot (📷)
| Property | Value |
|----------|-------|
| Behavior | Opens macOS screen capture overlay |
| Capture | Captures the visible area of the web page |
| After capture | Image shown in confirmation view with "Send to Claude" |
| Send | Sends screenshot to Claude via WebSocket |
| Toast | "Screenshot sent to Claude" |
| Error | If screen recording permission not granted, shows permission dialog |

### Open External (🔗)
| Property | Value |
|----------|-------|
| Behavior | Opens URL in default browser (Safari) |
| Opens | URL from URL bar |
| Effect | Surface stays open in Human Assist |
| Toast | "Opened in browser" |
| Error | If URL is invalid, inline error: "Invalid URL" |

## Footer Controls

### Feedback text area
| Property | Value |
|----------|-------|
| Placeholder | "Describe what you see — what works, what doesn't, what needs fixing..." |
| Auto-save | Draft saved to IndexedDB every 2 seconds |
| Character limit | 5000 characters |
| Auto-grow | Text area grows as user types (up to 200px max height) |
| Clear text | X button appears when text is present |
| Error | >5000 chars → inline error: "Too long, max 5000" |

### Submit → button
| Property | Value |
|----------|-------|
| Behavior | Sends feedback to Claude |
| Before submit | Validates text area is not empty |
| Empty text | Inline error: "Please enter some feedback" |
| After submit | Button changes to "Sending..." with spinner |
| Success | Button changes to "✓ Sent" (green), toast: "Response sent" |
| After success | Button reverts to "Submit →" after 2 seconds |
| Network error | Toast: "Failed to send — queued locally" |
| Offline | Button disabled, shows "Offline — queued" |

### Take Screenshot → button
| Property | Value |
|----------|-------|
| Behavior | Opens macOS screen capture overlay |
| Capture | User selects region of the web page |
| After capture | Image shown in confirmation view |
| Send | Sends to Claude automatically |
| Toast | "Screenshot sent to Claude" |
| Retake | User can click "Retake" to capture again |
| Error | "Screen recording permission required" dialog if permission not granted |

### Open External → button
| Property | Value |
|----------|-------|
| Behavior | Opens URL in default browser |
| Opens | URL from URL bar |
| Effect | Surface stays open |
| Toast | "Opened in browser" |
| Error | "Invalid URL" inline error |

## Close/Minimize/Expand header buttons

### Close [✕]
| Property | Value |
|----------|-------|
| Behavior | Closes the surface |
| Sends | `{ completed: false }` to Claude |
| Confirm | No confirmation dialog |
| Effect | Surface removed from active view |
| Toast | "Surface closed" |
| Session | Session remains in session list |
| Error | If send fails, shows "Failed to notify Claude" toast, surface still closed |

### Minimize [─]
| Property | Value |
|----------|-------|
| Behavior | Minimizes surface to bottom bar badge |
| Effect | Surface stays in session, content area shows dashboard |
| Restore | Click badge in bottom bar to restore surface |
| State | All state preserved (URL, scroll position, zoom) |
| Toast | No toast (silent) |
| Limit | Max 10 minimized surfaces |

### Expand [□]
| Property | Value |
|----------|-------|
| Behavior | Toggles between contained and full viewport |
| Contained | Surface shows in default width (~800px) |
| Full | Surface expands to fill content area |
| Toggle | Click button to switch |
| Animation | 300ms smooth resize |

## Navigation behavior rules

| Action | Surface state change |
|--------|---------------------|
| Click link | Surface stays Active |
| Type URL in bar | Surface stays Active |
| Press Enter in URL bar | Surface stays Active |
| Scroll page | Surface stays Active |
| Submit feedback | Surface goes to Responding |
| Take screenshot | Surface stays Active |
| Open external | Surface stays Active |
| Close button | Surface closed, sends `{ completed: false }` |
| Minimize button | Surface minimized, stays in session |

## Surface lifecycle transitions specific to BrowserSurface

| From | To | Trigger |
|------|-----|---------|
| Active | Active | Click link, type URL, scroll |
| Active | Responding | User clicks Submit |
| Responding | Complete | Claude processes response, shows "✓ Sent" |
| Active | Error | Network disconnect during submit |
| Active | Minimized | New surface pushed from Claude |
| Minimized | Active | User clicks minimized badge |
| Error | Active | Network recovers, user clicks retry |
| Active | Dismissed | User clicks close [✕] |
| Active | Dismissed | 30min timeout |

## Toast messages specific to BrowserSurface

| Event | Toast | Duration |
|-------|-------|----------|
| Submit success | "Response sent" | 3s |
| Submit failure | "Failed to send — queued locally" | 6s |
| Screenshot sent | "Screenshot sent to Claude" | 3s |
| Open external | "Opened in browser" | 2s |
| Surface closed | "Surface closed" | 2s |
| Surface minimized | (no toast) | — |
| Surface error | "Failed to load surface" | 6s |
| Timeout | "Surface timed out" | 4s |

## Keyboard shortcuts in BrowserSurface

| Shortcut | Action |
|----------|--------|
| Enter | Submit feedback |
| Escape | Close surface |
| ⌘+Enter | Submit even if empty |
| ⌘+R | Reload page |
| ⌘+L | Focus URL bar |
| ⌘+W | Close surface |
| ⌘+H | Go back |
| ⌘+Shift+H | Go forward |
| ⌘+F | Find in page |
| ⌘+0 | Reset zoom |
| ⌘+Plus | Zoom in |
| ⌘+Minus | Zoom out |

## Error states specific to BrowserSurface

| Error | UI | Recovery |
|-------|-----|----------|
| Page fails to load | "Failed to load page" overlay with [Retry] button | Click Retry to reload |
| Network disconnect | Banner: "Connection lost — reconnecting..." | Auto-reconnect, banner fades |
| Invalid URL | "Invalid URL" inline error | User enters valid URL |
| Webpage blocks iframe | "This page cannot be displayed in Human Assist" | User opens in external browser |
| JavaScript error on page | "JavaScript error" overlay | User can click "Continue anyway" |
