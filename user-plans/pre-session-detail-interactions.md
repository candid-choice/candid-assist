# Session Detail View — Every Button, Timeline Event, and Action Flow

## Full Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Human Assist                                                      │
│  ────────────────────────────────────────────────────────────────────  │
│  ┌───┐                                                                │
│  │ N │ │  ┌───────────────────────────────────────────────────────┐  │
│  │ e │ │  │  ← Back              🎨 "Fix the login bug"           │  │
│  │ S │ │  │                                                        │  │
│  │ e │ │  │  🟢 Active · Started 2 min ago · 2 surfaces          │  │
│  │ s │ │  │                                                        │  │
│  │ H │ │  │  ─── Timeline ──────────────────────────────────────  │  │
│  │ o │ │  │                                                        │  │
│  │ s │ │  │  [2:01 PM]  Claude received task                        │  │
│  │   │ │  │     "Fix the login bug — auth middleware crashes"       │  │
│  │   │ │  │                                                        │  │
│  │   │ │  │  [2:01 PM]  Claude analyzed the codebase                │  │
│  │   │ │  │     Created /src/middleware/auth.ts                     │  │
│  │   │ │  │     Created test file for auth middleware               │  │
│  │   │ │  └────────────────────────────────────────────────────────┘ │  │
│  │   │ │  │                                                        │  │
│  │   │ │  │  ─── User Surfaces ───────────────────────────────────  │  │
│  │   │ │  │                                                        │  │
│  │   │ │  │  [2:02 PM]  Claude asked: "Review auth middleware"     │  │
│  │   │ │  │  ┌──────────────────────────────────────────────────┐   │  │
│  │   │ │  │  │  Code: src/middleware/auth.ts (3 diffs)         │   │  │
│  │   │ │  │  │  ┌──────────┐  ┌──────────┐                     │   │  │
│  │   │ │  │  │  │ ✅ Yes   │  │ ⚠️ Minor  │                    │   │  │
│  │   │ │  │  │  └──────────┘  └──────────┘                     │   │  │
│  │   │ │  │  │  Your response: "Looks good, add tests"          │   │  │
│  │   │ │  │  └──────────────────────────────────────────────────┘   │  │
│  │   │ │  │                                                        │  │
│  │   │ │  │  [2:03 PM]  Claude responded:                          │  │
│  │   │ │  │  "Adding test coverage now..."                         │  │
│  │   │ │  └────────────────────────────────────────────────────────┘  │
│  │   │ │                                                              │
│  │   │ │  [ Resume Active Surface → ]  [ Stop Claude → ]             │
│  └───┘  └─────────────────────────────────────────────────────────────┘
│                                                                        │
│  ────────────────────────────────────────────────────────────────────  │
│  Connected via MCP · 1 active connection                              │
└────────────────────────────────────────────────────────────────────────┘
```

## Header Controls

### Back button (←)
| Property | Value |
|----------|-------|
| Action | Navigates back to session list/dashboard |
| Confirm | No confirmation needed |
| Error | If navigation fails, stays on current page with error toast |

### Session title (🎨 "Fix the login bug")
| Property | Value |
|----------|-------|
| Editable | Yes, click to rename |
| Click | Title becomes text input |
| Save | Enter saves, Escape reverts |
| Max length | 50 characters |
| Empty | Shows "Untitled session" |
| Error | >50 chars → "Name too long" inline error |

### Status badge (🟢 Active)
| Property | Value |
|----------|-------|
| Green dot | Session is active, Claude is working |
| Blue dot | Session is waiting for user |
| Yellow dot | Session has errors |
| Red dot | Session is in error state |
| Gray dot | Session is archived/done |

### Status text ("Active · Started 2 min ago · 2 surfaces")
| Property | Value |
|----------|-------|
| Status | "Active", "Waiting", "Done", "Error" |
| Started | Time when session started |
| Surface count | Number of surfaces in this session |
| Click | No action (informational only) |

## Timeline Actions

### Timeline event (Claude received task)
| Property | Value |
|----------|-------|
| Timestamp | [2:01 PM] shown on left |
| Title | "Claude received task" |
| Description | "Fix the login bug — auth middleware crashes" |
| Click | Expands to show full details (if collapsed) |
| Collapsed | Click again to collapse |
| Default | Expanded |

### Timeline event (Claude analyzed codebase)
| Property | Value |
|----------|-------|
| Timestamp | [2:01 PM] |
| Title | "Claude analyzed the codebase" |
| Description | "Created /src/middleware/auth.ts" + "Created test file" |
| Expand | Click to expand all sub-events |
| Collapse | Click again to collapse |
| File links | If description mentions files, shows clickable file links |

### Surface event (Claude asked a question)
| Property | Value |
|----------|-------|
| Timestamp | [2:02 PM] |
| Title | "Claude asked: Review auth middleware" |
| Surface preview | Shows preview of the surface content (code diff) |
| Response buttons | "Yes" (green), "Minor" (yellow) — click to respond |
| User's response | "Your response: Looks good, add tests" |
| Click response | Opens the response in expanded view |
| Edit response | Click response text to edit |
| Re-send | Click "Re-send" to send the same response again |

## Response buttons in surface preview

### ✅ Yes button
| Property | Value |
|----------|-------|
| Click | Marks the response as approved |
| Color | Green background, white text |
| Effect | "Yes" saved as user response, sent to Claude |
| Toast | "Response sent" |
| After | Button changes to "✓ Yes" (still green) |
| Error | Network error → "Failed to send — queued" toast |

### ⚠️ Minor button
| Property | Value |
|----------|-------|
| Click | Marks as minor approval with feedback needed |
| Color | Yellow background, dark text |
| Effect | Opens comment input, sends feedback to Claude |
| Comment | Required — user must enter a comment |
| Empty comment | Inline error: "Please add a comment" |
| After | Button changes to "✓ Minor" (still yellow) |
| Error | Network error → "Failed to send — queued" toast |

## Actions bar

### Resume Active Surface → button
| Property | Value |
|----------|-------|
| Behavior | Opens the currently active surface in full view |
| No active surface | Button disabled, shows "No active surface" |
| Surface not found | Shows "Surface not found" error |
| Success | Surface opens in main content area |
| Toast | "Surface resumed" |
| Error | Network error → "Failed to resume — queued" toast |

### Stop Claude → button
| Property | Value |
|----------|-------|
| Behavior | Stops Claude's current execution |
| Confirm | Shows "Stop Claude? This will cancel the current execution." |
| Confirm → Yes | Stops Claude, shows "Claude stopped" toast |
| Confirm → No | Dismisses dialog, nothing changes |
| After stop | Session status changes to "Done" |
| Error | Network error → "Failed to stop Claude" toast |

### Stop Claude confirm dialog
```
┌──────────────────────────────────────────────────────────────────┐
│  Stop Claude?                                                    │
│  ─────────────────────────────────────────────────────────────── │
│                                                                  │
│  This will cancel Claude's current execution. Any in-progress    │
│  work will be lost.                                              │
│                                                                  │
│  [ Cancel ]      [ Stop Claude ]                                 │
└──────────────────────────────────────────────────────────────────┘
```

## Right-click on session in list

| Option | Action |
|--------|--------|
| Open in Full View | Navigates to this session detail |
| Duplicate | Creates copy of session + all surfaces |
| Rename | Opens inline rename prompt |
| Archive | Moves session to History |
| Delete | Opens confirmation dialog |
| Copy Session URL | Copies deep link |

## Error states for Session Detail

| Error | UI | Recovery |
|-------|-----|----------|
| Session not found | "Session not found. [Back to Sessions]" | Click navigates back to session list |
| Network error | "Connection lost" banner | Auto-retry, toast when reconnected |
| Session load fail | "Failed to load session" with [Retry] | Click retry to reload |
| Surface not found | "Surface not found" inline | Click "Back to Sessions" to navigate away |

## Session timeline actions

| Event | User can do |
|-------|-------------|
| Task received | No action (read-only history) |
| Code analysis | No action (read-only history) |
| Surface pushed | Click surface preview to open, or click "Resume" in actions bar |
| Claude response | No action (read-only history) |
| Surface response | Click to expand, click "Re-send" to send again |

## Toasts for Session Detail

| Event | Toast | Duration |
|-------|-------|----------|
| Resume surface | "Surface resumed" | 3s |
| Stop Claude | "Claude stopped" | 3s |
| Surface response sent | "Response sent" | 3s |
| Surface response failed | "Failed to send — queued" | 6s |
| Session renamed | "Session renamed" | 2s |
| Session archived | "Session archived" | 2s |
| Session deleted | "Session deleted" | 3s |

## Keyboard shortcuts in Session Detail

| Shortcut | Action |
|----------|--------|
| Escape | Close current surface (if open) |
| ⌘+R | Refresh timeline |
| ⌘+W | Close surface |
| ⌘+↑ | Scroll timeline to top |
| ⌘+↓ | Scroll timeline to bottom |
| ⌘+F | Search timeline |
| Enter | Submit surface response (when surface is focused) |
