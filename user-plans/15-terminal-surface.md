# 15 — TerminalSurface

**Claude Code runs commands but can't see the output.** The user sees the terminal, Claude Code doesn't. TerminalSurface gives Claude visibility into what the user sees in their terminal.

## What it does

Renders a scrollable terminal stream with the output of Claude Code's most recent command. The user can scroll, search, and copy output. Claude Code can stream new output in real-time as the command progresses. The user sends the terminal output back to Claude so Claude can read it.

## Chrome

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Terminal            ────   [─] [□] [✕]                               │
│  ──────────────────────────────────────────────────────────────────    │
│  npm test                                                                 │
│  ───────────────────────────────────────────────────────────────────   │
│                                                                        │
│  PASS  src/middleware/auth.test.ts (3 tests)                           │
│  PASS  src/utils/handlers.test.ts (5 tests)                            │
│  FAIL  src/services/payment.test.ts (2 tests)                          │
│    ✕ Should handle 503 error gracefully                                │
│    Expected 503, got 200                                               │
│                                                                        │
│  Test Suites: 1 failed, 2 passed, 3 total                              │
│  Tests:       1 failed, 8 passed, 9 total                              │
│  Time:        2.3s                                                     │
│                                                                        │
│  ───────────────────────────────────────────────────────────────────   │
│  "The payment test is failing — it's getting 200 instead of 503."      │
│  [Send to Claude →]  [Copy →]  [Re-run Test →]                         │
└────────────────────────────────────────────────────────────────────────┘
```

| Control | Behavior |
|---------|----------|
| Scroll | Full scroll history of the command output. |
| Search | Filter lines by text. Useful when logs are long. |
| Send to Claude | Sends terminal output back to Claude as text. |
| Copy | Copies terminal output to clipboard. |
| Re-run | Restarts the last command. New output appears in the same view. |
| Close [✕] | Sends `{ completed: false }`. |

## Use cases (tips)

| # | Tip | What Claude sees |
|---|---|---|
| 8 | "I found 3 potential bugs. Show me a text input in Human Assist and I'll tell you which to fix first." | Claude runs tests or linter, user sees output in terminal, Claude needs to read it |
| 25 | "Record a 30-second voice note in Human Assist explaining why the last release failed." | Claude runs deployment script, user sees output, Claude needs to understand the failure |
| 27 | "Here's the test coverage report. Point out which areas are missing in Human Assist so I can write better tests." | Claude generates coverage report, user views it, Claude reads the result |

## Key design principle

**This is Claude's eyes on the terminal.** Claude Code runs commands. The user sees the output in their terminal. Claude Code cannot see it. This surface bridges that gap: the user sees the terminal, Claude reads it.

Claude Code can push a command to be run, then push TerminalSurface to show the output. The user scrolls through it, annotates it, and sends it back. Claude then understands what happened and can act.

This is fundamentally different from ScreenCaptureSurface. ScreenCapture sends a **screenshot** of terminal output (image). TerminalSurface sends the **text content** (structured). Claude prefers text — it can parse, search, and reason about it. ScreenCapture is for things Claude needs to see visually (screenshots, UI bugs). TerminalSurface is for things Claude needs to read.

## What this surface does NOT do

- **Does not replace ScreenCaptureSurface** — Text vs image. TerminalSurface is for structured terminal output. ScreenCapture is for visual things Claude can't parse.
- **Does not replace ProcessManager** — ProcessManager tracks long-running processes. TerminalSurface shows the output of a specific command. They complement each other.
- **Does not replace CodeDiffSurface** — Git output is text. A code diff needs visual presentation with inline annotation.
