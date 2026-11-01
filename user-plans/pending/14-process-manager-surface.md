# 14 — ProcessManager

**Claude Code spawns processes (dev servers, test runners, watchers) but loses track of them.** The user has no visibility into what Claude started, whether it's still running, or how to see the output. This surface is Claude's process dashboard.

## What it does

Shows a live list of all processes Claude Code has launched for the current workspace. Each process shows name, status (running/stopped/crashed), uptime, and a summary line of the most recent output. The user can view live output, kill a process, or restart it.

## Chrome

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Processes             ────   [─] [□] [✕]                              │
│  3 processes running · 0 crashed · [Archive All]                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  ●  Dev Server — Next.js dev server                              │  │
│  │     Running · 5 min ago · Port 3000                               │  │
│  │     Compiled 42 files, 0 errors                                  │  │
│  │  ─────────────────────────────────────────────────────────────   │  │
│  │  [▶ View Log]  [⏹ Stop]  [↻ Restart]                           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  ●  Test Runner — vitest watch                                    │  │
│  │     Running · 2 min ago                                          │  │
│  │     24 passed · 0 failed · 3 pending                               │  │
│  │  ─────────────────────────────────────────────────────────────   │  │
│  │  [▶ View Log]  [⏹ Stop]  [↻ Restart]                           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  ●  Build — tsc                                                    │  │
│  │     Stopped · 10 min ago · Exit code 0                            │  │
│  │  ─────────────────────────────────────────────────────────────   │  │
│  │  [▶ View Log]  [↻ Restart]                                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ───────────────────────────────────────────────────────────────────   │
│  "All processes are running cleanly. The dev server and test runner     │
│   are both up. No crashed processes to worry about."                    │
│  [Close →]                                                             │
└────────────────────────────────────────────────────────────────────────┘
```

| Control | Behavior |
|---------|----------|
| Process status | ● green = running, ⏸ yellow = stopped, ⚠ red = crashed |
| View Log | Expands a terminal panel showing the process's output stream |
| Stop | Sends SIGTERM to the process. Status changes to stopped. |
| Restart | Restarts the process with the same command. Status resets. |
| Archive | Removes completed processes from the active view. Keeps in session history. |

## How it interacts with the user

1. **Claude initiates**: Claude Code launches a process via MCP with a name, command, and label. The surface creates a process entry.
2. **User sees it**: The surface shows the process in the list with status. No action is required unless the user wants to monitor it.
3. **User monitors**: The user can open a process log to see output in real-time. If a process crashes, the surface shows an error notification.
4. **User controls**: The user can stop or restart any process. Claude Code can also request these actions.

## Key design principle

**Processes belong to the workspace, not to Claude Code.** Each workspace has its own process namespace. If the user has two Claude Code sessions open in the same workspace, they share the same process list — no duplicate dev servers, no port conflicts. If the user has two workspace directories open, each has its own process list.

This solves the #1 frustration with Claude Code: "I ran a command and now I don't know if it's still running." The user always knows. Claude Code also always knows — it can ask the MCP "is my process still alive?" instead of guessing.

## What this surface does NOT do

- **Does not replace TerminalSurface** — TerminalSurface shows parsed terminal output (command results, test output). ProcessManager tracks the lifecycle of long-running processes (dev servers, watchers). You can view the raw terminal from ProcessManager, but the two serve different purposes.
- **Does not replace BrowserSurface** — ProcessManager is for processes Claude Code started. BrowserSurface is for web pages Claude Code opened.
