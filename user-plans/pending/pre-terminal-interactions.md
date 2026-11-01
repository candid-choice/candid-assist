# TerminalSurface — Send, Copy, Re-run, and Search Flows

## Full Surface Layout

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

## Terminal Content Area

| Property | Value |
|----------|-------|
| Scroll | Full scroll history of the command output |
| Search | Filter lines by text, highlights matching lines |
| Live updates | New lines appear as command progresses |
| Auto-scroll | Auto-scrolls to bottom when new output arrives |
| Manual scroll | User can scroll up to see older output (auto-scroll pauses) |
| Copy all | Select all text → ⌘+C copies to clipboard |
| Select text | Standard text selection for copying individual lines |
| Line numbers | Optional, shown if enabled in settings |
| Color output | Preserves ANSI color codes (green=pass, red=fail) |

## Search behavior

| Property | Value |
|----------|-------|
| Trigger | Press ⌘+F |
| Input | Small search box appears at top-right of terminal |
| Behavior | Filters visible lines, highlights matches |
| Case-sensitive | Default: case-insensitive |
| Clear | Press Escape or click × to clear |
| Results | Shows "N matches" in search box |
| Navigate | ⌘+G goes to next match, ⌘+Shift+G goes to previous |
| No match | Shows "No results found" message |

## Footer Controls

### Send to Claude → button
| Property | Value |
|----------|-------|
| Behavior | Sends terminal output to Claude |
| Before submit | Validates terminal has content |
| Empty output | Inline error: "No output to send" |
| After submit | Button shows "Sending..." with spinner |
| Success | Button changes to "✓ Sent" (green), toast: "Sent to Claude" |
| Payload | Sends terminal text content to Claude |
| Timeout | Button disabled after 30s |
| Error | "Failed to send — queued locally" toast |

### Copy → button
| Property | Value |
|----------|-------|
| Behavior | Copies terminal output to clipboard |
| What it copies | All terminal text output |
| After copy | Shows "Copied to clipboard" toast |
| Error | "Failed to copy" toast (rare) |

### Re-run Test → button
| Property | Value |
|----------|-------|
| Behavior | Restarts the last command |
| What it does | Re-executes the command that produced the output |
| New output | Appears in the same terminal area |
| Old output | Cleared before re-run |
| After re-run | Terminal shows new output, scroll goes to bottom |
| Error | "Failed to re-run" toast if command not available |

## Close [✕]

| Property | Value |
|----------|-------|
| Behavior | Closes the terminal surface |
| Sends | `{ completed: false }` to Claude |
| Confirm | No confirmation dialog |
| Effect | Surface removed from active view |
| Toast | "Surface closed" |

## Keyboard shortcuts in TerminalSurface

| Shortcut | Action |
|----------|--------|
| Enter | Send to Claude |
| ⌘+Enter | Send even if empty |
| Escape | Close surface |
| ⌘+F | Search terminal |
| ⌘+G | Next match (in search) |
| ⌘+Shift+G | Previous match (in search) |
| ⌘+C | Copy selected text (or all if nothing selected) |
| ⌘+A | Select all text |
| ⌘+R | Re-run command |
| ⌘+↑ | Scroll to top |
| ⌘+↓ | Scroll to bottom |
| Home | Scroll to top |
| End | Scroll to bottom |
| Page Up | Scroll up one page |
| Page Down | Scroll down one page |

## Surface lifecycle for TerminalSurface

| From | To | Trigger |
|------|-----|---------|
| Active | Active | Scroll, search, copy text |
| Active | Responding | User clicks "Send to Claude" |
| Responding | Complete | Claude processes response |
| Active | Complete | ProcessManager-like behavior — actions are immediate |
| Active | Minimized | New surface pushed |
| Active | Dismissed | User clicks close [✕] |
| Active | Dismissed | 30min timeout |

## Error states for TerminalSurface

| Error | UI | Recovery |
|-------|-----|----------|
| Command not available | "Command not found" message | User re-runs or sends empty output |
| Network error | "Failed to send — queued" | Auto-retry on reconnect |
| Output too large | "Output truncated to 10000 chars" | User can scroll to see more |
