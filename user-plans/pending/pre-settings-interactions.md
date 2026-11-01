# Settings Screen — Every Field, Button, and Save Flow

## Overview

Specifies every interaction on the Settings screen. Every field, every toggle, every button, and every confirmation dialog.

## Settings Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│  Settings                             [Save & Back]                    │
│  ────────────────────────────────────────────────────────────────────  │
│  ┌──────┐                                                                 │
│  │ Acc │ ├── Account ──────────────────────────────────────────────────┤  │
│  │  W │ │                                                                 │  │
│  │  S │ │  Avatar   [⭕ User Name]                            [Edit]     │  │
│  │  s │ │  Email: user@example.com                                  │  │
│  │    │ │  Sign in with: Google                                     │  │
│  │    │ │  [ Change email ]  [ Sign out ]                           │  │
│  └──────┤ └─────────────────────────────────────────────────────────────┘  │
│  │ Wor │                                                                 │
│  │  A │ ├── Workspace ─────────────────────────────────────────────────┤  │
│  │  P │ │                                                                 │  │
│  │    │ │  Code path:  /Users/you/projects/my-app             [Edit]    │  │
│  │    │ │  Git URL:  https://github.com/you/my-app                    │  │
│  │    │ │  Claude setup:  CLI Mode (auto-detected)                    │  │
│  └──────┤ └─────────────────────────────────────────────────────────────┘  │
│  │ App │                                                                 │
│  │  C │ ├── Appearance ────────────────────────────────────────────────┤  │
│  │    │ │                                                                 │  │
│  │    │ │  Theme:  [◉ Light  ○ Dark  ○ System]                        │  │
│  │    │ │  Font size: [─ 14px +]                                      │  │
│  │    │ │  Sidebar width: [▁▁▁▁▁██████▃▃▃▃▃▃▃▃]  Medium             │  │
│  └──────┤ └─────────────────────────────────────────────────────────────┘  │
│  │ Not │                                                                 │
│  │  C │ ├── Notifications ─────────────────────────────────────────────┤  │
│  │    │ │                                                                 │  │
│  │    │ │  ☑ Show desktop notifications                                 │  │
│  │    │ │  ☑ Play sounds for surfaces                                   │  │
│  │    │ │  ☑ Banner for active surfaces                                 │  │
│  │    │ │  ☐ Quiet hours: [10:00 PM] — [7:00 AM]                      │  │
│  └──────┤ └─────────────────────────────────────────────────────────────┘  │
│  │ Con │                                                                 │
│  │  S │ ├── Connection ────────────────────────────────────────────────┤  │
│  │    │ │                                                                 │  │
│  │    │ │  Claude:  ● Connected — Version 1.0.0                         │  │
│  │    │ │  MCP:     ● Active — Port 3613                                │  │
│  │    │ │  Last seen: 2 minutes ago                                     │  │
│  │    │ │  [Test Connection]  [View Logs]                               │  │
│  └──────┤ └─────────────────────────────────────────────────────────────┘  │
│  │ Adv │                                                                 │
│  └──────┤  [Reset State]  [Sign Out]                                      │
│         ───────────────────────────────────────────────────────────────  │
└────────────────────────────────────────────────────────────────────────┘
```

## Section Navigation (left sidebar)

| Interaction | Behavior |
|-------------|----------|
| Click section name | Scrolls to that section, highlights it |
| Click chevron ▸/▾ | Collapses/expands section content |
| Active section | Bold text, accent color indicator on left edge |
| Keyboard | ⌘+1 through ⌘+5 navigates between sections |

## Account Section

### Avatar
| Property | Value |
|----------|-------|
| Display | Circular image (48px diameter) with user's photo |
| Click behavior | Opens macOS file picker for new image |
| Drag-and-drop | User can drag image onto avatar to change it |
| Resize | Auto-scales to 200×200 for upload |
| Max size | 5MB |
| Format | PNG, JPG, WebP |
| Error | "Image too large" toast, "Unsupported format" toast |

### Email
| Property | Value |
|----------|-------|
| Display | Read-only, grayed-out text |
| Behavior | Cannot edit directly |
| Change email | Clicks "Change email" → Opens email verification flow |

### Sign in method
| Property | Value |
|----------|-------|
| Display | "Sign in with: Google" (read-only) |
| Behavior | Shows current sign-in method |

### Change email button
| Property | Value |
|----------|-------|
| Click behavior | Opens email verification flow |
| Flow | User enters new email → Firebase sends verification → User clicks link → Email updated |
| Error | "Invalid email" inline error |
| Success | "Verification email sent" toast |

### Sign out button
| Property | Value |
|----------|-------|
| Click behavior | Shows confirmation dialog |
| Dialog | "Are you sure you want to sign out? All unsaved changes will be lost." |
| Confirm | Clears keychain, navigates to Welcome screen, shows "Signed out" toast |
| Cancel | Dialog dismisses, nothing changes |
| Error | If Firebase sign out fails, shows error toast: "Failed to sign out" |

## Workspace Section

### Code path
| Property | Value |
|----------|-------|
| Display | Text field with current path |
| Edit button | [Edit] button next to the field |
| Click Edit | Opens macOS folder picker |
| Validation | Must be an existing directory |
| Error | "Directory not found" inline error |
| Success | Path saved, "Workspace saved" toast |
| Keyboard | Can type path directly |
| Drag-and-drop | User can drag a folder onto the workspace field |

### Git URL
| Property | Value |
|----------|-------|
| Display | Text field with current URL |
| Behavior | Auto-detected from git remote |
| Editable | Yes, user can change manually |
| Validation | Must be valid URL format |
| Error | "Invalid URL format" inline error |
| Success | "Git URL updated" toast |

### Claude setup
| Property | Value |
|----------|-------|
| Display | Dropdown showing current mode |
| Options | CLI Mode / MCP Mode / Manual |
| Behavior | Auto-detected on launch |
| Change | User can select different mode |
| CLI Mode | Claude Code runs locally, connects via MCP |
| MCP Mode | Claude Code runs remotely, connects via MCP |
| Manual | User manually configures Claude Code |
| Error | "Invalid mode" toast if mode not supported |

## Appearance Section

### Theme
| Property | Value |
|----------|-------|
| Options | Light / Dark / System |
| Selection | Radio buttons (◉ selected, ○ unselected) |
| Live preview | Changes take effect immediately |
| Save | Saved to localStorage, synced to Firestore |
| System | Follows macOS system theme automatically |
| Error | None — all values are valid |

### Font size
| Property | Value |
|----------|-------|
| Display | "[− 14px +]" |
| Min value | 12px |
| Max value | 18px |
| − button | Decreases by 1px, disables at 12px |
| + button | Increases by 1px, disables at 18px |
| Live preview | Changes take effect immediately |
| Error | None — button disables at boundaries |

### Sidebar width
| Property | Value |
|----------|-------|
| Display | Slider bar (▁▁▁▁▁██████▃▃▃▃▃▃▃▃) |
| Min width | 180px (narrow) |
| Max width | 320px (wide) |
| Default | 240px (medium) |
| Drag handle | Click and drag the slider to resize |
| Live preview | Sidebar resizes immediately |
| Labels | "Narrow", "Medium", "Wide" shown below slider |
| Error | None — slider clamps to min/max |

## Notifications Section

### Desktop notifications
| Property | Value |
|----------|-------|
| Display | Checkbox ☑ (enabled) / ☐ (disabled) |
| Default | Enabled |
| First time user | Prompts macOS notification permission |
| Permission denied | Checkbox shows "⚠ Permission denied" in gray |
| Enable | Request macOS permission, show toast "Notifications enabled" |
| Disable | Stop showing macOS notifications, show toast "Notifications disabled" |

### Play sounds
| Property | Value |
|----------|-------|
| Display | Checkbox ☑ / ☐ |
| Default | Disabled |
| Enable | Play system alert sound on surface push |
| Disable | No sound on surface push |

### Banner for active surfaces
| Property | Value |
|----------|-------|
| Display | Checkbox ☑ / ☐ |
| Default | Enabled |
| Enable | Show top banner when surface pushed |
| Disable | No banner on surface push |

### Quiet hours
| Property | Value |
|----------|-------|
| Display | "☐ Quiet hours: [10:00 PM] — [7:00 AM]" |
| Default | Disabled |
| Enable | Checkbox enables start/end time selectors |
| Start time | Time picker for start of quiet hours |
| End time | Time picker for end of quiet hours |
| Behavior | No notifications between start and end time |
| Error | End time must be after start time |

## Connection Section

### Claude status
| Property | Value |
|----------|-------|
| Display | "● Connected — Version 1.0.0" |
| Green dot | Connected and active |
| Red dot | Disconnected |
| Yellow dot | Reconnecting |
| Version | Shown if connected, "—" if not |

### MCP status
| Property | Value |
|----------|-------|
| Display | "● Active — Port 3613" |
| Green dot | Active and listening |
| Red dot | Inactive (server not running) |
| Port | Shows current port number |

### Last seen
| Property | Value |
|----------|-------|
| Display | "Last seen: 2 minutes ago" |
| Format | Relative time (minutes, hours, days) |
| Offline | "Last seen: never" |

### Test Connection button
| Property | Value |
|----------|-------|
| Click behavior | Pings MCP server |
| Success | Shows green checkmark, "Connection successful" toast |
| Failure | Shows red X, "Connection failed" toast |
| Timeout | Shows "Timed out after 5s" error |
| During test | Button shows "Testing..." spinner |

### View Logs button
| Property | Value |
|----------|-------|
| Click behavior | Opens a modal with last 100 log lines |
| Modal title | "MCP Server Logs" |
| Content | Scrollable text area with last 100 lines |
| Copy button | Copies all logs to clipboard |
| Clear button | Clears logs (future) |
| Close | Dismisses modal |

## Bottom Actions

### Reset State button
| Property | Value |
|----------|-------|
| Click behavior | Shows confirmation dialog |
| Dialog | "Reset all local settings? This cannot be undone." |
| Confirm | Clears all local state (localStorage, IndexedDB), restarts app |
| Cancel | Dialog dismisses, nothing changes |
| Success | App restarts with default settings |
| Error | "Failed to clear state" toast |

### Sign Out button
| Property | Value |
|----------|-------|
| Click behavior | Shows confirmation dialog |
| Dialog | "Sign out of Human Assist? All unsaved changes will be lost." |
| Confirm | Signs out of Firebase, clears keychain, navigates to Welcome screen |
| Cancel | Dialog dismisses, nothing changes |
| Success | "Signed out" toast, Welcome screen shown |
| Error | "Failed to sign out" toast |

## Save & Back button (top right)

| Property | Value |
|----------|-------|
| Click behavior | Saves all settings, navigates back to dashboard |
| Save behavior | Saves to localStorage first, then syncs to Firestore |
| Cancel | Dismisses changes, navigates back without saving |
| Error | Shows "Failed to save settings" toast |
| Loading | Button shows spinner while saving |
| Keyboard | ⌘+S to save, Escape to cancel |

## Keyboard shortcuts in Settings

| Shortcut | Action |
|----------|--------|
| Escape | Close settings, go back to dashboard |
| ⌘+S | Save and close |
| ⌘+W | Close settings without saving |
| Tab | Move between fields |
| Enter | Activate focused control |

## Edge cases

1. **Invalid workspace path** → "Directory not found" inline error, "Edit" button stays active
2. **Git URL changes** → "Git URL updated" toast, git branch/combo auto-updated
3. **Network loss during save** → "Failed to save — queued locally" toast
4. **Network restore** → Queued changes replay, "Settings saved" toast
5. **Concurrent edits** → Last write wins, toast "Settings updated" if remote changed
6. **Firebase auth expires** → Redirect to sign-in, settings lost
7. **Workspace directory deleted** → "Workspace deleted, please select a new one" dialog
8. **Settings too large** → "Settings too large, please reduce" toast
9. **Invalid JSON in localStorage** → Reset to defaults, show "Settings reset" toast
10. **First-time user** → Some settings grayed out until onboarding completes
