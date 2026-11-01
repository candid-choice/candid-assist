# ProcessManager — All Interactions and Surface Lifecycle

## Full Layout

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

## Header Controls

### Archive All button
| Property | Value |
|----------|-------|
| Behavior | Archives all completed processes |
| Confirm | No confirmation needed |
| Toast | "All processes archived" |
| Effect | Running processes stay visible, stopped/crashed are archived |

### Process count ("3 processes running · 0 crashed")
| Property | Value |
|----------|-------|
| Display | Shows running and crashed counts |
| Update | Updates in real-time as processes change |
| Click | No action (informational) |

## Process Item Controls

### Process status indicator
| Status | Color | Meaning |
|--------|-------|---------|
| ● Running | Green | Process is actively running |
| ⏸ Stopped | Yellow | Process was stopped by user |
| ⚠ Crashed | Red | Process exited with error |

### "View Log" button
| Property | Value |
|----------|-------|
| Behavior | Expands terminal panel inline below the process entry |
| Content | Shows process output in real-time |
| Auto-scroll | Scrolls to bottom when new output arrives |
| Close | Click "View Log" again to collapse |
| Update | New lines appear in real-time as process runs |
| Scrollable | User can scroll up to see older output |
| Copy | Select text and ⌘+C to copy |
| When stopped | Shows last known output |
| When crashed | Shows error output |

### "Stop" button
| Property | Value |
|----------|-------|
| Behavior | Sends SIGTERM to the process |
| Effect | Process status changes from Running to Stopped |
| Confirm | No confirmation (quiet action) |
| Toast | "Process stopped" |
| After stop | "Stop" button becomes "Restart" |
| Error | "Failed to stop process" toast |

### "Restart" button
| Property | Value |
|----------|-------|
| Behavior | Restarts the process with the same command |
| Effect | Process status changes from Stopped/Crashed to Running |
| Confirm | No confirmation |
| Toast | "Process restarted" |
| After restart | Status changes to Running, log shows new output |
| Error | "Failed to restart process" toast |

### "Close →" button (footer)
| Property | Value |
|----------|-------|
| Behavior | Closes the ProcessManager surface |
| Sends | No `{ completed: false }` — ProcessManager is always "complete" |
| Effect | Surface removed from active view |
| Toast | "Process list closed" |
| Session | Process list remains in session history |

## Process list interactions

| Interaction | Behavior |
|-------------|----------|
| Click process name | Expands process details (command, pid, uptime) |
| Click again | Collapses process details |
| Click on status | No action |
| Click on "Compiled 42 files" | No action (informational only) |

## Process list sort order

| Order | Condition |
|-------|-----------|
| First | Running processes, sorted by uptime (newest first) |
| Second | Stopped processes, sorted by stop time |
| Third | Crashed processes, sorted by crash time |

## Process list update behavior

| Event | How list updates |
|-------|-----------------|
| Process started | New entry appears at top of list, green status |
| Process stopped | Entry moves to "Stopped" section, yellow status |
| Process crashed | Entry moves to "Crashed" section, red status |
| Process output | Log panel updates in real-time if open |
| Process completed | Entry stays visible in "Stopped" section |
| Process archived | Entry removed from active view |
| Network disconnect | List freezes, shows "Offline" badge |
| Network reconnect | List refreshes from backend |

## ProcessManager surface lifecycle

| From | To | Trigger |
|------|-----|---------|
| Active | Active | View log, stop, restart, archive |
| Active | Complete | Any action (immediate — no Responding state) |
| Active | Minimized | New surface pushed |
| Active | Dismissed | Close [✕] or 30min timeout |

## ProcessManager keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| Escape | Close surface |
| ⌘+R | Restart selected process |
| ⌘+W | Close surface |
| ⌘+↑ | Scroll to top of list |
| ⌘+↓ | Scroll to bottom of list |

## Error states for ProcessManager

| Error | UI | Recovery |
|-------|-----|----------|
| Process fails to start | "Failed to start process" toast | User tries again |
| Process not found | "Process not found" error | Surface updates, user refreshes |
| Network error | "Failed to stop — queued" | Auto-retry on reconnect |
| Permission denied | "Permission denied" toast | User checks permissions |

## Edge cases for ProcessManager

1. **User stops all processes** → All entries show Stopped status, no running processes
2. **All processes crash** → All entries show Crashed status, user can restart all
3. **Process auto-restarts** → Status changes from Crashed to Running automatically
4. **User restarts while log is open** → Log clears and shows new output
5. **User stops a process while log is open** → Log shows "Process stopped" message
6. **Multiple stop/restart in quick succession** → Actions queued, processed in order
7. **Process manager opens while no processes** → Shows "No processes running" message
8. **Process manager opens during app launch** → Shows loading spinner while processes load
