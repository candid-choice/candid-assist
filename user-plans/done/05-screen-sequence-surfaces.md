# Part 5 — Screen Sequence: Surface Renderers & Session Detail

## 9. Surface Rendering (Every Surface)

All surfaces render as a **full-viewport overlay** within the main content area. The sidebar stays visible. The surface replaces the idle state.

### Common Surface Chrome (top bar)

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ [Title]             ────   [─] [□] [✕]                              │
│     [Optional instruction bar]                                       │
└────────────────────────────────────────────────────────────────────────┘
```

| Element | Behavior |
|---------|----------|
| ✦ icon | App branding, never interactive |
| Title | Surface type label (e.g., "Web View", "Code Review") |
| Divider | Splits title from window controls |
| Minimize [─] | Minimizes to dock (surfaces appear as small badges in the bottom bar) |
| Expand [□] | Toggles full-window / contained size |
| Close [✕] | Dismisses surface; sends `{completed: false}` to Claude |

### 9a. BrowserSurface

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Web View              ────   [─] [□] [✕]                              │
│  ───────────────────────────────────────────────────────────────────   │
│  🔍 https://staging.myapp.com/checkout          ↻  ←  →  [📷] [🔗]    │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [Embedded web content — WKWebView, full interactive]                   │
│                                                                        │
│  ───────────────────────────────────────────────────────────────────   │
│  "The checkout works, but the coupon code field is missing from the    │
│   payment form."                                                       │
│  [Submit →]  [Take Screenshot →]  [Open External →]                    │
└────────────────────────────────────────────────────────────────────────┘
```

| Element | Behavior |
|---------|----------|
| URL bar | Editable. Claude can pre-populate; user can navigate elsewhere. |
| Back / Forward / Reload | Standard browser controls. |
| Screenshot 📷 | Captures the visible area, sends to Claude as an image. |
| Open external 🔗 | Opens the URL in the default browser. |
| Footer action | Pre-filled by Claude's context; user edits then submits. |

### 9b. CanvasSurface

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Canvas                ────   [─] [□] [✕]                              │
│  ───────────────────────────────────────────────────────────────────   │
│  Pen  Eraser  Highlight  Text  Undo  Redo  [Zoom 100%]  [Clear]         │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │    [Drawing area — dot grid background]                          │  │
│  │                                                                  │  │
│  │    ┌─────┐     ┌─────┐     ┌─────┐                              │  │
│  │    │ API │────▶│ CG  │────▶│ DB  │                              │  │
│  │    └─────┘     └─────┘     └─────┘                              │  │
│  │                                                                  │  │
│  │    (User traces over Claude's drawing with corrections in green) │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ───────────────────────────────────────────────────────────────────   │
│  Notes: "This is the flow I was thinking of. Does it work?"            │
│  [Send →]  [Clear Canvas]                                               │
└────────────────────────────────────────────────────────────────────────┘
```

| Element | Behavior |
|---------|----------|
| Pen tool | Draws freeform lines |
| Eraser | Erases strokes |
| Highlighter | Semi-transparent strokes |
| Text | Types text directly on the canvas |
| Undo / Redo | Standard history (up to 50 steps) |
| Zoom | +/− buttons; pinch-to-zoom on trackpad |
| Clear | Clears all strokes (confirms before clearing) |
| Send | Sends all strokes + notes to Claude as a combined image + text |

### 9c. ImageSurface

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Image Review          ────   [─] [□] [✕]                              │
│  ───────────────────────────────────────────────────────────────────   │
│  ←  →  ↻  [▣ Zoom]  [Annotate]  [Open]  [Send →]                       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  [Large image — scroll, pinch-to-zoom]                            │  │
│  │                                                                  │  │
│  │  (annotation marks: 3 circles, 2 arrows, 1 text note)             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ───────────────────────────────────────────────────────────────────   │
│  "The header padding is wrong and the button color is off."            │
│  [Send →]  [Clear Annotations]                                          │
└────────────────────────────────────────────────────────────────────────┘
```

**Interactions:** Pinch-to-zoom, scroll, annotate (draw arrows/circles/text), open externally.

### 9d. ScreenCaptureSurface

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Screen Capture        ────   [─] [□] [✕]                              │
│  ───────────────────────────────────────────────────────────────────   │
│  Select a region to capture (click and drag)                             │
├────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  [Dimmed overlay of entire desktop]                              │  │
│  │                                                                  │  │
│  │       ┌──────────────────────────────┐                           │  │
│  │       │ Selected region                │  ← drag to resize        │  │
│  │       │  Terminal error output         │                        │  │
│  │       └──────────────────────────────┘                           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  [Window] [Screen] [Region: 800×600]   [Capture] [✕]          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ───────────────────────────────────────────────────────────────────   │
│  [Send Screenshot →]  [Retake]                                          │
└────────────────────────────────────────────────────────────────────────┘
```

| Mode | Behavior |
|------|----------|
| Region | User drags to select a rectangle on screen. |
| Window | Click any window to capture its entire bounds. |
| Full Screen | Captures the entire visible screen area. |

**Sends:** A screenshot image to Claude. This is a **one-way** surface — capture → send → Claude processes the image.

### 9e. CodeDiffSurface

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Code Review           ────   [─] [□] [✕]                              │
│  ───────────────────────────────────────────────────────────────────   │
│  2 files changed · 14 additions · 3 deletions · [Archive] [✓ Approve] │
├────────────────────────────────────────────────────────────────────────┤
│  🟢 src/middleware/auth.ts    +4  -0  Insert null-header guard         │
│  ────────────────────────────────────────────────────────────────────  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  @ @ src/middleware/auth.ts @@                                   │  │
│  │      export const authMiddleware = async (req: Request) => {      │  │
│  │  -    const token = req.headers.authorization;                    │  │
│  │  +    const token = req.headers.authorization;                    │  │
│  │  +    if (!token) return next(new Error('Missing auth header')); │  │
│  │      return next();                                               │  │
│  │  }                                                                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ───────────────────────────────────────────────────────────────────   │
│  "The auth change looks good. Please also add a test for the 503 case."│
│  [✓ Approve & Merge]  [Request Changes →]                              │
└────────────────────────────────────────────────────────────────────────┘
```

| Element | Behavior |
|---------|----------|
| File list | Collapsible per-file view with status badge (🟢 = approved, 🟡 = changes requested, ⚪ = unreviewed) |
| Inline diff | Side-by-side or unified view. Added lines green, removed lines red, unchanged gray. |
| Annotate | Click any line to add an inline comment. Sent to Claude. |
| Approve | Marks the diff as approved. Claude proceeds with merge/deploy. |
| Request changes | Sends annotated feedback to Claude. |
| Archive | Removes the diff from active view; keeps in session history. |
| Toggle view | Switches between side-by-side and unified views. |

### 9f. ProcessManager

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Processes             ────   [─] [□] [✕]                              │
│  ───────────────────────────────────────────────────────────────────   │
│  3 processes running · 0 crashed · [Archive All]                       │
├────────────────────────────────────────────────────────────────────────┤
│  ●  Dev Server — Next.js dev server                                    │
│     Running · 5 min ago · Port 3000                                     │
│     Compiled 42 files, 0 errors                                        │
│  [▶ View Log]  [⏹ Stop]  [↻ Restart]                                 │
│  ───────────────────────────────────────────────────────────────────   │
│  ●  Test Runner — vitest watch                                          │
│     Running · 2 min ago                                                │
│     24 passed · 0 failed · 3 pending                                    │
│  [▶ View Log]  [⏹ Stop]  [↻ Restart]                                 │
│  ───────────────────────────────────────────────────────────────────   │
│  ●  Build — tsc                                                         │
│     Stopped · 10 min ago · Exit code 0                                  │
│  [▶ View Log]  [↻ Restart]                                           │
│  ───────────────────────────────────────────────────────────────────   │
│  [Close →]                                                             │
└────────────────────────────────────────────────────────────────────────┘
```

| Element | Behavior |
|---------|----------|
| Process status | ● green = running, ⏸ yellow = stopped, ⚠ red = crashed |
| View Log | Expands a terminal panel showing the process's output stream |
| Stop | Sends SIGTERM to the process |
| Restart | Restarts the process with the same command |
| Archive | Removes completed processes from the active view |

### 9g. TerminalSurface

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Terminal              ────   [─] [□] [✕]                              │
│  ───────────────────────────────────────────────────────────────────   │
│  npm test                                                                │
│  ───────────────────────────────────────────────────────────────────   │
│  PASS  src/middleware/auth.test.ts (3 tests)                             │
│  PASS  src/utils/handlers.test.ts (5 tests)                                │
│  FAIL  src/services/payment.test.ts (2 tests)                              │
│    ✕ Should handle 503 error gracefully                                  │
│    Expected 503, got 200                                                  │
│  Test Suites: 1 failed, 2 passed, 3 total                                │
│  Tests:       1 failed, 8 passed, 9 total                                │
│  Time:        2.3s                                                      │
│  ───────────────────────────────────────────────────────────────────   │
│  "The payment test is failing — it's getting 200 instead of 503."        │
│  [Send to Claude →]  [Copy →]  [Re-run Test →]                         │
└────────────────────────────────────────────────────────────────────────┘
```

| Element | Behavior |
|---------|----------|
| Scroll | Full scroll history of command output |
| Search | Filter lines by text |
| Send to Claude | Sends terminal output back to Claude as text |
| Copy | Copies terminal output to clipboard |
| Re-run | Restarts the last command; new output appears in the same view |
| Close [✕] | Sends `{ completed: false }` |

**Note:** This is text output, not a screenshot. TerminalSurface gives Claude structured text. ScreenCaptureSurface gives Claude a visual image. They serve different needs.

## 10. Session Detail — MCP-Driven

**Trigger:** Click any session from the list.

```
┌────────────────────────────────────────────────────────────────────────┐
│  ← Back              🎨 "Web Search: React Server                     │
│                       Components Best Practices"                      │
│  Active · Started 10 min ago · 3 surfaces                              │
│                                                                        │
│  ─── Timeline ───────────────────────────────────────────────          │
│                                                                        │
│  [10:00]  User told Claude: "Open staging URL in HA"                  │
│  ───────────────────────────────────────────────────────              │
│  [10:00]  Claude pushed: BrowserSurface                               │
│           web://.../server-components                                  │
│           User reviewed and left feedback                              │
│  ───────────────────────────────────────────────────────                │
│  [10:05]  Claude pushed: CodeDiffSurface                               │
│           src/middleware/auth.ts · 4 additions · 0 deletions           │
│           User approved, Claude pushed to remote                       │
│  ───────────────────────────────────────────────────────                │
│  [10:08]  Claude pushed: TerminalSurface                              │
│           "npm test" · 3 passed · 0 failed                              │
│  ───────────────────────────────────────────────────────                │
│                                                                        │
│  ── Surfaces in this session ───────────────────────────                │
│  [1] BrowserSurface — staging URL (user reviewed)                     │
│  [2] CodeDiffSurface — auth.ts (user approved)                        │
│  [3] TerminalSurface — npm test (all green)                           │
│                                                                        │
│  [Resume Active Surface →]  [Stop Claude →]                           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Help Palette — User-Initiated

**Trigger:** `⌘+Shift+Space`

```
┌────────────────────────────────────────────────────────────────────────┐
│  Help Claude          ⌘+Space  (dim background)                      │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  📸  Capture screen    ⌘⇧1    Claude sees your screen            │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  ✏️  Annotate image      ⌘⇧2    Point out bugs visually           │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  ◇  Sketch on canvas     ⌘⇧3    Freeform drawing space           │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  📄  Review changes      ⌘⇧4    View latest code diffs            │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  ⌛  View terminal        ⌘⇧5    See Claude's latest output       │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  ⚡  Manage processes    ⌘⇧6    Dev servers, test runners         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

Each action immediately pushes a proactive surface to the dashboard.

**Note:** No file picker, no voice recording, no text input, no choices, no confirmations — those are all handled in terminal chat. The help palette only exposes surfaces for things Claude can't do from the terminal.

## 12. Surface Type Summary

The 7 surfaces and what makes each unique:

| # | Surface | What Claude sees | What the human sees | What the human does |
|---|---------|-----------------|---------------------|---------------------|
| 1 | **BrowserSurface** | A URL pushed | A web page | Navigate, click, fill forms, report back |
| 2 | **CanvasSurface** | A sketch/diagram | A drawing space | Annotate Claude's drawing, add corrections |
| 3 | **ImageSurface** | A visual | An image | Zoom, annotate, point out visual bugs |
| 4 | **ScreenCaptureSurface** | Nothing — needs to see | A desktop capture overlay | Select region/window/screen, send screenshot |
| 5 | **CodeDiffSurface** | Code changes | A structured diff viewer | Review inline, annotate lines, approve/decline |
| 6 | **ProcessManager** | Process lifecycle | A process list | Monitor, stop, restart, view logs |
| 7 | **TerminalSurface** | Nothing — needs to read | A terminal stream | Scroll, search, copy text, send output to Claude |

InputSurface types (text, confirm, choices, voice, file) are not surfaces. Claude Code handles all of those directly in terminal chat. Human Assist only shows surfaces for things Claude **cannot** do from the terminal.
