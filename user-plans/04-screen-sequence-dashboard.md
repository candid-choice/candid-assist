# Part 4 — Dashboard: Idle State, MCP-Driven Sidebar & Surfaces

## 5. Dashboard — Idle State

**Trigger:** After onboarding, or after all sessions complete.

The core insight: **the sidebar (sessions, history, settings) is created by Claude Code via MCP**, not hardcoded into the app. When Claude Code hasn't pushed anything yet, the user sees a passive waiting state with tips and a carousel of use cases.

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Human Assist                                                      │
│  ──────────────────────────────────────────────────────────────────── │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │              ✦                                                       │  │
│  │    Waiting for Claude                                                  │  │
│  │                                                                      │  │
│  │  Claude Code will create sessions and push surfaces                  │  │
│  │  here when it uses the Human Assist MCP server.                      │  │
│  │                                                                      │  │
│  │  ─────────────────────────────────────────────────────────────       │  │
│  │                                                                      │  │
│  │  💡 Tip of the day:                                                  │  │
│  │  "You can ask Claude Code to open a web page for you                 │  │
│  │   to review in Human Assist — just say 'Open staging                  │  │
│  │   URL in Human Assist' and it will appear here."                     │  │
│  │                                                                      │  │
│  │  ←  Tip of the day  →              (4 of 30)                         │  │
│  │                                                                      │  │
│  │  ─────────────────────────────────────────────────────────────       │  │
│  │                                                                      │  │
│  │  What people use Human Assist for:                                   │  │
│  │                                                                      │  │
│  │  ┌──────────────────────────────────────────────────────┐            │  │
│  │  │  📸  "Screenshot my error, then annotate             │            │  │
│  │  │     where I think the bug is"                        │            │  │
│  │  └──────────────────────────────────────────────────────┘            │  │
│  │                                                                      │  │
│  │  ←  "Screenshot my error..."  →                                      │  │
│  │  (5 user-submitted examples from early adopters)                     │  │
│  │                                                                      │  │
│  │  ─────────────────────────────────────────────────────────────       │  │
│  │                                                                      │  │
│  │  How to get started:                                                 │  │
│  │  1.  Claude Code needs Human Assist MCP                             │  │
│  │      configured (done in onboarding)                                │  │
│  │  2.  Tell Claude Code to use Human Assist                           │  │
│  │  3.  It will create sessions and push surfaces here                 │  │
│  │  4.  Respond on the surfaces that appear                              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ──────────────────────────────────────────────────────────────────── │
│  Connected via MCP · 0 active connections                              │
└────────────────────────────────────────────────────────────────────────┘
```

### Key elements

| Element | Purpose |
|---------|---------|
| Idle icon + "Waiting for Claude" | Calm, passive state — user knows the bridge is live |
| "Connected via MCP" badge | Green dot + pulsing animation |
| Tip of the day | Rotates 30 tips, each explaining a different way to use Human Assist. Arrow keys or buttons navigate between them. Auto-rotates every 10s. |
| Use case carousel | 5 real examples submitted by early adopters. Rotates between categories: web search, image review, code review, screen capture, sketching |
| "How to get started" strip | Inline education — no nav needed |
| Help Palette hint | Keyboard shortcut `⌘+Shift+Space` |

**Sidebar behavior:** The sidebar does not appear in the idle state. It only appears when Claude Code pushes a session via MCP — showing session tabs, history, and settings. The user cannot manually create sessions from the sidebar; sessions are created only when Claude Code uses the Human Assist MCP server.

### Claude Code Use Case Library

These are the 7 surface types Claude Code can trigger with Human Assist. Each maps to a specific problem Claude can't solve from the terminal alone. InputSurface types (text, confirm, choices, voice, file) are dropped — Claude Code handles all of those directly in terminal chat. Only surfaces that require a visual UI belong in Human Assist.

| # | Surface Type | Claude Code's Prompt to User | What the User Sees |
|---|--------------|------------------------------|---------------------|
| 1 | BrowserSurface | "Open https://staging.myapp.com in Human Assist — I need you to test the checkout flow while you keep working." | Embedded web view of staging site with URL bar, back/forward, screenshot capture |
| 2 | ScreenCaptureSurface | "I'm getting a timeout error — capture your network tab so I can see what's happening." | macOS screen capture overlay where user selects region to show error logs |
| 3 | ImageSurface | "Here's the error screenshot from the crash log — can you annotate where the stack trace fails?" | Large image viewer with annotation tools (arrows, circles, text, highlighter) |
| 4 | CanvasSurface | "Let me sketch how this feature should work — can you review the diagram and add your ideas?" | Blank canvas with pen/eraser/highlighter/undo — user can annotate Claude's sketch |
| 5 | CodeDiffSurface | "I've generated the PR description — here's a preview. Can you review it before I push?" | Structured diff viewer with side-by-side comparison, inline comments, approve/request changes |
| 6 | ProcessManager | "I'm launching the dev server — watch the output and tell me if it starts cleanly." | Live process list with status, output stream, kill/restart controls |
| 7 | TerminalSurface | "I ran the tests — show me the output so I can see which ones failed." | Live terminal output with scroll, search, and send-back-to-Claude |

### How these map to surfaces

| User action | Surface rendered |
|-------------|-----------------|
| Click a link Claude shared | **BrowserSurface** — WKWebView of the URL |
| Claude shows you an image | **ImageSurface** — with zoom, annotate, share |
| Claude draws or you sketch | **CanvasSurface** — pen/eraser/highlighter tools |
| Claude needs your screen | **ScreenCaptureSurface** — region/window/fullscreen capture |
| Claude shows code changes | **CodeDiffSurface** — side-by-side diff with inline annotation |
| Claude launches a process | **ProcessManager** — live process list with output stream |
| Claude needs terminal output | **TerminalSurface** — scrollable terminal stream |

Each tip of the day picks one row from the table above and frames it as a single-sentence prompt the user could give Claude Code. The carousel cycles through the same 12–16 examples from top real usage data.

**Important: InputSurface is not a surface.** Choices, confirmations, text answers, and file selections are handled directly in terminal chat between Claude Code and the user. No Human Assist surface is needed — Claude Code already has input controls. Human Assist only shows surfaces for things Claude **cannot** do from the terminal: interact with web pages, see the user's screen, review visual content, manage running processes, or read terminal output.


### Tip of the Day

Each tip is a single-sentence prompt the user could say to Claude Code.
Tips rotate every 10 seconds (or manually via arrows). Each tip is 1-2 sentences,
actionable, and framed from the user's perspective.

| # | Tip of the Day | Surface |
|---|----------------|---------|
| 1 | "Open https://staging.myapp.com in Human Assist — I need you to test the checkout flow while you keep working." | BrowserSurface |
| 2 | "Here's the error screenshot from the crash log — annotate where the stack trace fails in Human Assist." | ImageSurface |
| 3 | "Let me sketch how this feature should work — review the diagram and add your ideas on the canvas in Human Assist." | CanvasSurface |
| 4 | "I've generated the PR description — review it in Human Assist so you can edit it before I push." | CodeDiffSurface |
| 5 | "I'm launching the dev server — watch the output in Human Assist and tell me if it starts cleanly." | ProcessManager |
| 6 | "I ran the tests — show me the output in Human Assist so I can see which ones failed." | TerminalSurface |
| 7 | "Open the demo sandbox in Human Assist and click through — tell me what's broken." | BrowserSurface |
| 8 | "Here's the before/after UI comparison — annotate the side-by-side in Human Assist." | ImageSurface |
| 9 | "I'm deploying to production — I'll push a confirm in Human Assist when you're ready." | (terminal chat) |
| 10 | "Capture your terminal error output in Human Assist so I can see the full stack trace." | ScreenCaptureSurface |
| 11 | "Open the staging URL in Human Assist and take a screenshot of the signup flow." | BrowserSurface |
| 12 | "Show me a blank canvas in Human Assist — I'll draw the architecture, you trace over it with corrections." | CanvasSurface |
| 13 | "Capture your full screen in Human Assist — I need context from your entire desktop." | ScreenCaptureSurface |
| 14 | "Here's the test coverage report — point out which areas are missing in Human Assist." | TerminalSurface |
| 15 | "Open the monitoring dashboard in Human Assist and take a screenshot of the error rate spike." | BrowserSurface |

**Rotation:** Show 1 of 15 tips, auto-rotate every 10s, manual arrow controls.

**Personalization:** The tip pool can be filtered by user's project context. If they're doing UI work, prioritize BrowserSurface and ImageSurface tips. If they're debugging, prioritize ScreenCaptureSurface and TerminalSurface tips.

**User submissions:** 3 of the 15 carousel examples should be sourced from real user submissions, so the tips feel community-driven, not just system-generated.

**Sidebar note:** When Claude Code hasn't pushed anything, the sidebar is hidden entirely — not a minimal placeholder. As Claude Code creates sessions via MCP, the sidebar fades in with session tabs, history, and settings.

---

## 6. Dashboard — After Claude Code Pushes (Active State)

When Claude Code pushes a session via MCP, the sidebar updates automatically. The sidebar is no longer app-defined — it's defined by Claude Code's sessions.

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Human Assist                                                      │
│  ──────────────────────────────────────────────────────────────────── │
│  ┌──────────────────┐  Main Content Area                               │
│  │  ✦ Sessions      │                                                  │
│  │    🟢 Web Search │  ┌──────────────────────────────────────────┐  │
│  │    🟢 Image Rev. │  │  🟢 "Web Search: React Server            │  │
│  │  ──────────────── │  │     Components Best Practices"           │  │
│  │  🟡 Approve dep. │  │  Claude opened a browser surface for you │  │
│  │  ──────────────── │  │                                           │  │
│  │  ✓ CI pipeline    │  │  ┌────────────────────────────────────┐  │  │
│  │  ✓ Login fix      │  │  │  🔍 web://.../server-components    │  │  │
│  │  ──────────────── │  │  │                                      │  │  │
│  │  📁 Settings      │  │  │  [Browser content — WKWebView]       │  │  │
│  └──────────────────┘  │  │                                      │  │  │
│                        │  │  ─────────────────────────────────── │  │  │
│                        │  │  Your take:                            │  │  │
│                        │  │  "These are solid. The hydration      │  │  │
│                        │  │   stuff needs more clarity though."    │  │  │
│                        │  │  [Send →]  [Screenshot →]  [Dismiss →] │  │  │
│                        │  └────────────────────────────────────────┘  │
│                                                                        │
│  ──────────────────────────────────────────────────────────────────── │
│  Connected via MCP · 1 active connection                              │
└────────────────────────────────────────────────────────────────────────┘

```

### What changed

| Before | After |
|--------|-------|
| Sidebar has hardcoded items | Sidebar is built by Claude Code via MCP |
| "Sessions" shows app-managed list | Sessions appear when Claude Code creates them |
| "History" is pre-built | History = all past sessions Claude Code created |
| Settings is always there | Settings stays (it's app-level, not MCP-driven) |
| No sidebar at all | Sidebar fades in when Claude Code pushes sessions |
| Idle state with tips/carousel | Active surface rendering |

**Sidebar items created via MCP:**
- Session tabs (title, active/waiting/done badge)
- Any grouping or categorization Claude Code provides
- Each tab is a separate session — Claude Code can create multiple

**App-level sidebar items:**
- ✦ Human Assist (app title, always first)
- Settings (app-level, always present)
- Bell/Notifications (app-level, always present)

---

## 7. Surface Rendering (Every Surface)

All surfaces render as a **full-viewport overlay** within the main content area. The sidebar stays visible. The surface replaces the idle state.

### Common Surface Chrome

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ [Title]         ────   [─] [□] [✕]                                  │
│     [Optional instruction bar]                                       │
└────────────────────────────────────────────────────────────────────────┘
```

| Control | Behavior |
|---------|----------|
| ✦ Title | Surface type + short name |
| ──── | Divider from window controls |
| Minimize [─] | Minimizes to dock |
| Expand [□] | Toggles full-window / contained |
| Close [✕] | Sends { completed: false } to Claude |

### Surface: Browser

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Web View              ────   [─] [□] [✕]                              │
│  https://staging.myapp.com/signup           ↻  ←  →  [📷]  [🔗]       │
├────────────────────────────────────────────────────────────────────────┤
│  [Embedded web content — WKWebView]                                   │
│                                                                        │
│  Your response: "Looks good, the signup is clear"                       │
│  [Submit →]  [Take Screenshot →]  [Open →]                              │
└────────────────────────────────────────────────────────────────────────┘
```

**Chrome:** URL bar, Back/Forward/Reload, Screenshot, Open External.

### Surface: Canvas

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
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Notes: "This is the flow I was thinking of."                           │
│  [Send →]  [Clear Canvas]                                               │
└────────────────────────────────────────────────────────────────────────┘
```

**Tools:** Pen, Eraser, Highlighter, Text, Undo, Redo, Zoom, Clear.

### Surface: Image

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Image Review          ────   [─] [□] [✕]                              │
│  ←  →  ↻  [▣ Zoom]  [Annotate]  [Open]  [Send →]                       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  [Large image — scroll, pinch-to-zoom]                            │  │
│  │                                                                  │  │
│  │  (annotation marks: 3 circles, 2 arrows, 1 text note)             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Annotations on image: 3 marks                                         │
└────────────────────────────────────────────────────────────────────────┘
```

**Interactions:** Pinch-to-zoom, scroll, annotate (draw arrows/circles/text), open externally.

### Surface: ScreenCapture

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Screen Capture        ────   [─] [□] [✕]                              │
│  Select a region to capture (click and drag)                            │
├────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  [Dimmed overlay of entire desktop]                              │  │
│  │                                                                  │  │
│  │       ┌──────────────────────────────┐                           │  │
│  │       │ Selected region                │  ← drag to resize       │  │
│  │       │  Terminal error output         │                        │  │
│  │       └──────────────────────────────┘                           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  [Window] [Screen] [Region: 800×600]   [Capture] [✕]          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  [Send Screenshot →]  [Retake]                                         │
└────────────────────────────────────────────────────────────────────────┘
```

**Modes:** Region (drag), Window (click), Full Screen. Sends a screenshot image to Claude.

### Surface: CodeDiff

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Code Review           ────   [─] [□] [✕]                              │
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

**Features:** Side-by-side or unified diff, inline comments, file-level status badges (🟢 green = approved, 🟡 yellow = changes requested), approve/request changes.

### Surface: ProcessManager

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Processes             ────   [─] [□] [✕]                              │
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

**Features:** Process list with status (● green = running, ⏸ yellow = stopped, ⚠ red = crashed), live log viewer, kill/restart controls.

### Surface: Terminal

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

**Features:** Scrollable terminal output, search lines, copy text, re-run command, send output back to Claude.

**Note:** This is text output, not a screenshot. TerminalSurface gives Claude structured text. ScreenCaptureSurface gives Claude a visual image of the screen.


## 8. Task Composer — User Initiates

**Trigger:** `⌘+N` (opens a command palette, no sidebar button)

This is how the user initiates — telling Claude Code to use Human Assist. It doesn't push a surface; it sends a prompt to Claude Code which then may push surfaces.

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✎ Compose a Task for Claude Code                                     │
│  Tell Claude Code to use Human Assist.                                │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │  "Open the staging URL in Human Assist and show me       │     │
│  │   the latest signup flow. I'll review the design."       │     │
│  └──────────────────────────────────────────────────────────┘     │
│                                                                  │
│  [📎 Add file] [🔗 Add link] [📸 Screenshot]                    │
│  staging-url.txt                                                  │
│                                                                  │
│  ─────────────────────────────────────────────────────────────    │
│                                                                  │
│  [Send to Claude →]  [Cancel]                                    │
└────────────────────────────────────────────────────────────────────────┘
```

| Action | Result |
|--------|--------|
| Start typing | Auto-saves draft |
| Add file/link/screenshot | Attaches to the message |
| Send | Creates session → Claude Code receives prompt → may push surfaces |
| Escape/Cancel | Closes, keeps draft |
| Enter | Sends if text exists |
| Cmd+Enter | Always sends |

---

## 9. Sessions List — MCP-Driven

**Trigger:** Clicking "Sessions" in the sidebar.

The list is built from what Claude Code pushes via MCP — not from a local database.

```
┌────────────────────────────────────────────────────────────────────────┐
│  Sessions                                                                                                                                                                                                                  │
│                                                                  │
│  🔍 Search sessions...                                            │
│                                                                  │
│  ●  Active (2)                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  🟢 "Web Search: React Server Components"                  │    │
│  │     Browser surface open                                  │    │
│  │     2 min ago         1 surface active                     │    │
│  ├────────────────────────────────────────────────────────────┤    │
│  │  🟢 "Image Review: Login Page Screenshot"                  │    │
│  │     Image surface with 3 annotations                      │    │
│  │     15 min ago        1 surface active                     │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ○  Waiting (1)                                                    │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  🟡 "Approve deployment"                                     │    │
│  │     Waiting for your response on the button choice         │    │
│  │     30 min ago                                             │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ✓  Done (8)                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  ✓  "Set up CI pipeline"                                     │    │
│  │     2 hours ago · Archive button                            │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────┘
```

**Sessions are MCP-created:** Each session was pushed by Claude Code. The app doesn't categorize them — Claude Code provides the title, status, and description. The app shows them in these groups based on what Claude Code reports.

---

## 10. Session Detail — MCP-Driven

**Trigger:** Click any session from the list.

```
┌────────────────────────────────────────────────────────────────────────┐
│  ← Back              🎨 "Web Search: React Server                     │
│                       Components Best Practices"                      │
│  Active · Started 10 min ago · 3 surfaces                              │
│                                                                  │
│  ─── Timeline ───────────────────────────────────────────────      │
│                                                                  │
│  [10:00]  User told Claude: "Open staging URL in HA"              │
│  ───────────────────────────────────────────────────────          │
│  [10:00]  Claude pushed: BrowserSurface                           │
│           web://.../server-components                              │
│           User reviewed and left feedback                          │
│  ───────────────────────────────────────────────────────          │
│  [10:05]  Claude pushed: CodeDiffSurface                           │
│           src/middleware/auth.ts · 4 additions · 0 deletions       │
│           User approved, Claude pushed to remote                    │
│  ───────────────────────────────────────────────────────          │
│  [10:08]  Claude pushed: TerminalSurface                          │
│           "npm test" · 3 passed · 0 failed                          │
│  ───────────────────────────────────────────────────────          │
│                                                                  │
│  ── Surfaces in this session ───────────────────────────          │
│  [1] BrowserSurface — staging URL (user reviewed)                  │
│  [2] CodeDiffSurface — auth.ts (user approved)                    │
│  [3] TerminalSurface — npm test (all green)                      │
│                                                                  │
│  [Resume Active Surface →]  [Stop Claude →]                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Help Palette — User-Initiated

**Trigger:** `⌘+Shift+Space`

```
┌──────────────────────────────────────────────────────────────────┐
│  Help Claude          ⌘+Space  (dim background)               │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  📸  Capture screen    ⌘⇧1    Claude sees your screen     │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  ✏️  Annotate image      ⌘⇧2    Point out bugs visually    │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  ◇  Sketch on canvas     ⌘⇧3    Freeform drawing space     │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  📄  Review changes      ⌘⇧4    View latest code diffs     │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  ⌛  View terminal        ⌘⇧5    See Claude's latest output │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  ⚡  Manage processes    ⌘⇧6    Dev servers, test runners  │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

Each action immediately pushes a proactive surface to the dashboard.
