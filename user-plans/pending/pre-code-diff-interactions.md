# CodeDiffSurface — Approve, Request Changes, and Inline Comment Flows

## Overview

Specifies every interaction on the CodeDiffSurface: file list, inline diff viewing, annotate, approve, request changes, and the feedback flow to Claude.

## Full Surface Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Code Review         ────   [─] [□] [✕]                              │
│  2 files changed · 14 additions · 3 deletions · [Archive] [✓ Approve] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  🟢 src/middleware/auth.ts                                       │  │
│  │  +4  -0  Insert null-header guard                                │  │
│  │  ──── [▸ Expand Diff] ──────────────────────────────────────  │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  @ @ src/middleware/auth.ts @@                                   │  │
│  │      export const authMiddleware = async (req: Request) => {      │  │
│  │  -    const token = req.headers.authorization;                    │  │
│  │  +    const token = req.headers.authorization;                    │  │
│  │  +    if (!token) return next(new Error('Missing auth header')); │  │
│  │      return next();                                               │  │
│  │  }                                                                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  🟡 src/utils/handlers.ts                                        │  │
│  │  +10 -3  Added error handling, adjusted tests                    │  │
│  │  ──── [▸ Expand Diff] ────────────────────────────────────────  │  │
│  │                                                                  │  │
│  │  [Collapsed diff content — click to expand]                      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ───────────────────────────────────────────────────────────────────   │
│  "The auth change looks good. In handlers.ts, please also add a       │
│   test for the 503 case. Otherwise this is good to merge."             │
│  [✓ Approve & Merge]  [Request Changes →]                              │
└────────────────────────────────────────────────────────────────────────┘
```

## Header Controls

### File changed summary
| Property | Value |
|----------|-------|
| Display | "2 files changed · 14 additions · 3 deletions" |
| Update | Updates when file is approved/expanded |
| Status | Green when all approved, yellow when some requested changes |

### Archive button
| Property | Value |
|----------|-------|
| Behavior | Removes from active view, keeps in session history |
| Confirm | No confirmation needed |
| Toast | "Diff archived" |
| Effect | Surface remains open, just removed from active view |
| Session | Moves to session timeline history |

### Approve & Merge button (header)
| Property | Value |
|----------|-------|
| Behavior | Approves all files, sends to Claude |
| Confirmation | No confirmation — approves immediately |
| Effect | All file status badges turn green |
| Toast | "All changes approved" |
| Footer | Same as footer button, but always available |

## File list controls

### File status badge
| Property | Value |
|----------|-------|
| Green 🟢 | All changes approved |
| Yellow 🟡 | Changes requested |
| White ⚪ | Unreviewed |
| Click | Expands/collapses file diff |

### Expand Diff
| Property | Value |
|----------|-------|
| Click | Expands diff content inline |
| Icon | ▸ (collapsed), ▾ (expanded) |
| Content | Shows line-by-line diff with added/removed highlighting |
| State | Stays expanded until user clicks to collapse |

### Inline annotate (click on line)
| Property | Value |
|----------|-------|
| Click | Opens comment input on the line |
| Input | Small text field appears next to the line |
| Submit comment | Comment attached to the line, sent to Claude |
| Remove comment | Click "×" on comment to remove |
| Max comments | 100 per file |
| Toast | "Comment added" |
| Error | Empty comment → inline error: "Comment cannot be empty" |

### Toggle side-by-side/unified view
| Property | Value |
|----------|-------|
| Toggle button | "[Side-by-side | Unified]" in toolbar |
| Side-by-side | Shows added lines on right, removed on left |
| Unified | Shows single view with green/red highlighting |
| Default | Unified |
| Save | Preference saved to localStorage |

## Footer Controls

### Feedback text area
| Property | Value |
|----------|-------|
| Placeholder | "Describe your review — what looks good, what needs changing..." |
| Auto-save | Draft saved to IndexedDB every 2 seconds |
| Character limit | 5000 characters |
| Auto-grow | Up to 150px max height |

### Approve & Merge button
| Property | Value |
|----------|-------|
| Behavior | Approves all files, sends feedback to Claude |
| Before submit | Validates feedback text is not empty |
| Empty text | Inline error: "Please enter your review feedback" |
| After approve | All file badges turn green |
| After success | Button changes to "✓ Approved" (green), shows "All changes approved" toast |
| Effect | Sends `{ decision: "approved", comments: [...] }` to Claude |
| Timeout | Button disabled after 30s |
| Error | Network error → "Failed to send — queued locally" toast |

### Request Changes button
| Property | Value |
|----------|-------|
| Behavior | Sends annotated feedback requesting changes |
| Before submit | Validates feedback text is not empty |
| Empty text | Inline error: "Please describe what needs changing" |
| After submit | Button changes to "✓ Changes sent" (orange), shows "Changes sent" toast |
| Effect | Sends `{ decision: "changes", comments: [...] }` to Claude |
| Timeout | Button disabled after 30s |
| Error | Network error → "Failed to send — queued locally" toast |

### Comment on line (inline)
| Property | Value |
|----------|-------|
| Trigger | Click on any line in the diff |
| Input | Text field appears inline next to the line |
| Submit | Comment attached to the line, included in approve/request |
| Remove | Click "×" to remove comment |
| Edit | Click text to edit existing comment |
| Multiple | Can have multiple comments per file |
| Toast | "Comment added" |
| Error | Empty comment → inline error |

## File status flow

| Action | Badge change |
|--------|-------------|
| New file | White ⚪ |
| Add comment | Stays same color |
| Approve all files | All turn green 🟢 |
| Request changes on one file | That file turns yellow 🟡 |
| After "Approve & Merge" | All turn green 🟢 |
| After "Request Changes" | Files with comments turn yellow 🟡 |
| After Claude fixes and resubmits | All revert to white ⚪ |

## Surface lifecycle for CodeDiffSurface

| From | To | Trigger |
|------|-----|---------|
| Active | Active | Click to expand/collapse, add comments |
| Active | Responding | User clicks Approve or Request Changes |
| Responding | Complete | Claude processes, shows "✓ Sent" |
| Active | Minimized | New surface pushed |
| Active | Dismissed | User clicks close [✕] |
| Active | Dismissed | 30min timeout |
| Active | Archived | User clicks Archive |

## Toast messages specific to CodeDiffSurface

| Event | Toast | Duration |
|-------|-------|----------|
| Approve | "All changes approved" | 3s |
| Request changes | "Changes sent" | 3s |
| Comment added | "Comment added" | 1s |
| Surface archived | "Diff archived" | 2s |
| Surface closed | "Surface closed" | 2s |
| Network error | "Failed to send — queued locally" | 6s |

## Keyboard shortcuts in CodeDiffSurface

| Shortcut | Action |
|----------|--------|
| Enter | Submit approve (if feedback text present) |
| ⌘+Enter | Submit even if empty |
| Escape | Close surface |
| ⌘+↑ | Scroll to top of diff |
| ⌘+↓ | Scroll to bottom of diff |
| ⌘+F | Find in diff |
| ⌘+A | Select all comments |
| ⌘+T | Toggle side-by-side/unified view |

## Error states specific to CodeDiffSurface

| Error | UI | Recovery |
|-------|-----|----------|
| Diff fails to parse | "Failed to render diff" overlay | User can try again |
| Invalid diff format | "Malformed diff" error | Claude should fix the diff |
| File not found | "File not found" error | User can request Claude to provide the file |
| Network error | "Failed to send — queued" | Auto-retry on reconnect |
