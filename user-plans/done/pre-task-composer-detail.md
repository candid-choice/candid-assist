# Task Composer Detail

## Overview

The Task Composer is a command palette that appears at the bottom-center of the window when the user presses ⌘+N or clicks "New Task" in the help palette. It allows the user to initiate a new task for Claude Code to work on using Human Assist.

## UI

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✎ Compose a Task for Claude Code                                     │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                        │
│  Tell Claude Code to use Human Assist.                                 │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  "Open the staging URL in Human Assist and show me              │  │
│  │   the latest signup flow. I'll review the design."               │  │
│  │                                                                  │  │
│  │  ────────────────────────────────────────────────────────────── │  │
│  │                                                                  │  │
│  │  [📎 Add file] [🔗 Add link] [📸 Screenshot]                  │  │
│  │  staging-url.txt                                                 │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│         [ Send to Claude → ]       [ Cancel ]                           │
└────────────────────────────────────────────────────────────────────────┘
```

## Components

| Component | Behavior |
|-----------|----------|
| **Task prompt** | Large text area. User types the task description. Auto-saves draft. |
| **File attachment** | Click "Add file" or drag-and-drop from desktop. Shows attached files in a list. |
| **Link attachment** | Click "Add link" or paste a URL. Shows attached links in a list. |
| **Screenshot attachment** | Click "Screenshot" or press ⌘+S. Opens macOS screen capture overlay. Shows attached screenshots in a list. |
| **Send button** | Sends the task to Claude Code. Creates a session. |
| **Cancel button** | Closes the Task Composer, keeps draft. |

## File Attachment

| Action | Behavior |
|--------|----------|
| Add file | Shows file picker. User selects file(s). Shows attached files in a list. |
| Drag-and-drop | User drags file(s) from desktop onto the text area. Adds to attached files. |
| Remove file | User clicks "X" next to file. Removes from attached files. |
| Clear all | User clicks "Clear All". Removes all attached files. |

## Link Attachment

| Action | Behavior |
|--------|----------|
| Add link | Shows link input. User types URL. Shows attached links in a list. |
| Paste URL | User pastes URL into text area. Auto-detects URL and adds to attached links. |
| Remove link | User clicks "X" next to link. Removes from attached links. |
| Clear all | User clicks "Clear All". Removes all attached links. |

## Screenshot Attachment

| Action | Behavior |
|--------|----------|
| Take screenshot | Opens macOS screen capture overlay. User selects region/window/fullscreen. Shows attached screenshot in a list. |
| Remove screenshot | User clicks "X" next to screenshot. Removes from attached screenshots. |
| Clear all | User clicks "Clear All". Removes all attached screenshots. |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘+N | Open Task Composer |
| Escape | Close Task Composer, keep draft |
| Enter | Send if text exists |
| ⌘+Enter | Always send (even if empty) |
| ⌘+S | Take screenshot |
| ⌘+Click link | Open link in browser |
| ⌘+Click file | Open file in editor |

## Submission Flow

| Step | Action |
|------|--------|
| 1 | User types task description. |
| 2 | User attaches files, links, or screenshots (optional). |
| 3 | User clicks "Send to Claude" or presses Enter. |
| 4 | App creates a session in Firestore. |
| 5 | App sends the task description + attachments to Claude Code via HTTP POST. |
| 6 | Claude Code receives the prompt and processes it. |
| 7 | Claude Code may push surfaces to the app via MCP. |
| 8 | App shows the surfaces in the main content area. |
| 9 | User interacts with surfaces, submits responses. |
| 10 | Claude Code continues execution. |
| 11 | When Claude Code finishes, app shows "Task complete" toast. |
| 12 | User navigates to Session List to view the completed task. |

## Error Handling

| Error | Location | UI | Recovery |
|-------|----------|-----|----------|
| Task send fails | Task composer | Toast: "Failed to send task" | User retries. Task is saved as draft. |
| Network loss | Task send | Toast: "Network lost — queued locally" | Task is queued in IndexedDB. Replays on reconnect. |
| Firebase timeout | Task send | Toast: "Firebase timeout — retrying..." | Task is queued. Replays after 5s timeout. |
| Backend error | Task send | Toast: "Backend error — try again" | User retries. Task is saved as draft. |
| Too many sessions | Task send | Toast: "Too many sessions open" | User closes a session before sending. |
| Max surfaces (10) | Task send | Toast: "Maximum 10 surfaces open at once" | User closes surfaces before sending. |

## Edge Cases

1. **Offline onboarding** — If user has no internet during first launch, Task Composer is disabled. Shows "Check connection" state.
2. **Multiple windows** — Currently single-window; future: one window per session.
3. **Concurrent Claude instances** — Only one Claude Code process can connect at a time. If user tries to send a task while another Claude instance is active, toast: "Another Claude instance is active."
4. **Surface ordering** — If Claude pushes 5 surfaces rapidly, last 4 queue as background surfaces.
5. **User closes app during task send** — Task is saved as draft. On reopen, user sees the draft in the Task Composer.
6. **User signs in on a different machine** — Workspace syncs from Firestore, previous state preserved.
7. **Large session history** — Virtualized list, loads 20 at a time, searchable.
8. **MacOS dark mode** — All UI adapts; surfaces use native dark mode if available.
9. **Retina / 4K displays** — All UI is resolution-independent.
10. **Multiple monitors** — Surfaces can span across monitors; screen capture handles multi-monitor.
11. **Low storage** — Toast: "Low storage — queued actions may not save".
12. **Accessibility** — All buttons have alt text, keyboard navigable, VoiceOver compatible.
