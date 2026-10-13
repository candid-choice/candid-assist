# Surface Lifecycle States

Every surface goes through a well-defined lifecycle. This document specifies the states, transitions, and rules for all 7 surface types.

## Common Lifecycle (applies to all surfaces)

```
NOTIFICATION → PENDING → ACTIVE → RESPONDING → COMPLETE / DISMISSED / TIMED_OUT
```

| State | Description | User sees |
|-------|-------------|-----------|
| **Notification** | Surface hasn't been pushed yet — backend is preparing data | User sees a toast: "Surface pushed from Claude" with an "Open" link |
| **Pending** | Surface data is loading, user hasn't interacted yet | Surface chrome appears in bottom bar as a small badge with loading spinner |
| **Active** | Surface is fully rendered and interactive | Main content area shows the surface overlay |
| **Responding** | User has submitted data, waiting for Claude to process | Footer shows "Sending response..." with a spinner |
| **Complete** | User submitted and Claude processed the response | Surface stays open, footer shows "Response sent ✓" for 2s, then auto-minimizes |
| **Dismissed** | User closed the surface without completing | Sends `{ completed: false }` to Claude |
| **Timed Out** | No user interaction for 30 minutes | Auto-disconnect, show toast: "Surface timed out", surface removed |

## Surface-specific states

### BrowserSurface

| State | Behavior |
|-------|----------|
| Initial load | WKWebView loads the URL. Shows loading spinner overlay. |
| Navigating | User clicks links or types in URL bar — surface stays active, doesn't go to Responding. |
| Screenshot taken | User clicks 📷 — surface shows "Capturing..." then shows the captured image with "Send to Claude?" prompt. |
| Submit response | User types feedback and clicks Submit — transitions to Responding. |

### CanvasSurface

| State | Behavior |
|-------|----------|
| Drawing | User draws freely — surface stays Active. No submit triggered until user clicks "Send". |
| Clear | User clicks Clear — confirms first, then clears all strokes. |
| Send | User clicks Send — transitions to Responding, sends all strokes + notes to Claude. |

### ImageSurface

| State | Behavior |
|-------|----------|
| Annotating | User draws annotations — surface stays Active. |
| Clear annotations | User clicks "Clear Annotations" — removes marks, stays Active. |
| Send | User clicks "Send" — transitions to Responding, sends annotated image to Claude. |

### ScreenCaptureSurface

| State | Behavior |
|-------|----------|
| Capture in progress | macOS capture overlay is visible — user can't interact with anything else. |
| Region selected | User selects area — returns to Human Assist, shows confirmation view. |
| Send screenshot | User clicks "Send" — transitions to Responding, sends image to Claude. |
| Retake | User clicks "Retake" — returns to capture overlay. |

### CodeDiffSurface

| State | Behavior |
|-------|----------|
| Reviewing | User scrolls through diffs, adds inline comments — surface stays Active. |
| Approve | User clicks "Approve & Merge" — transitions to Responding, sends `{ decision: "approved", comments: [...] }` to Claude. |
| Request changes | User clicks "Request Changes" — transitions to Responding, sends `{ decision: "changes", comments: [...] }` to Claude. |
| Archive | User clicks "Archive" — surface closes, diff removed from active view. |

### ProcessManager

| State | Behavior |
|-------|----------|
| Monitoring | User watches process list — no submit triggered by monitoring. |
| Stop process | User clicks "Stop" — sends `{ action: "stopped", pid: 12345 }` to Claude immediately. |
| Restart process | User clicks "Restart" — sends `{ action: "restarted", pid: 12345 }` to Claude immediately. |
| View log | User clicks "View Log" — expands terminal panel inline, doesn't trigger submit. |

### TerminalSurface

| State | Behavior |
|-------|----------|
| Scrolling | User scrolls through output — no submit triggered. |
| Search | User searches lines — filters in place, no submit triggered. |
| Send to Claude | User clicks "Send to Claude" — transitions to Responding, sends terminal text to Claude. |
| Copy | User clicks "Copy" — copies text to clipboard, no submit triggered. |
| Re-run | User clicks "Re-run Test" — restarts the last command, shows new output. |

## Rules

1. **One surface at a time** — only one surface can be active in the main content area. If Claude pushes a new surface, the current one is minimized.
2. **Minimize preserves state** — if user closes the app during an active surface, the surface stays in the session and can be resumed on next launch.
3. **Close always sends `{ completed: false }`** — unless the user explicitly submitted (Submit, Send, Approve, Send to Claude), clicking the close button [✕] signals incomplete.
4. **Notifications are ephemeral** — if a surface is pushed while the app is background, macOS notification appears. Clicking it brings the surface to foreground. Dismissing the notification is fine — the surface stays in the session.
5. **ProcessManager and TerminalSurface are always "Complete"** — they don't have a Submit button that transitions to Responding. Actions like Stop, Send, Approve happen immediately without a separate Responding state.
6. **BrowserSurface navigation is always "Active"** — clicking links, typing in URL bar, scrolling — none of these trigger a Responding state. Only the footer Submit button does.
7. **Timeout is per-surface** — 30 minutes of no user interaction in the Active state triggers Timed Out. Responding state does not count toward timeout (Claude is still working).
