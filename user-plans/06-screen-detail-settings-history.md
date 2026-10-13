# Part 6 — Session Detail, Settings, History

## 11. Session Detail View

**Trigger:** Click on any session from the Sessions List or History view.

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Human Assist                                                      │
│  ──────────────────────────────────────────────────────────────────── │
│  ┌───┐                                                                │
│  │ N │ │  ┌───────────────────────────────────────────────────────┐  │
│  │ e │ │  │  ← Back              🎨 "Fix the login bug"           │  │
│  │ w │ │  │                                                        │  │
│  │ S │ │  │  🟢 Active · Started 2 min ago · 2 surfaces          │  │
│  │ e │ │  │                                                        │  │
│  │ s │ │  │  ─── Timeline ──────────────────────────────────────  │  │
│  │ s │ │  │                                                        │  │
│  │   │ │  │  [2:01 PM]  Claude received task                        │  │
│  │ H │ │  │     "Fix the login bug — auth middleware crashes"       │  │
│  │ o │ │  │                                                        │  │
│  │ s │ │  │  [2:01 PM]  Claude analyzed the codebase                │  │
│  │   │ │  │     Created /src/middleware/auth.ts                     │  │
│  │   │ │  │     Created test file for auth middleware               │  │
│  │   │ │  └────────────────────────────────────────────────────────┘ │  │
│  │   │ │  │                                                        │  │
│  │   │ │  │  ─── User Surfaces ───────────────────────────────────  │  │
│  │   │ │  │                                                        │  │
│  │   │ │  │  [2:02 PM]  Claude asked: "Review auth middleware"     │  │
│  │   │ │  │  ┌──────────────────────────────────────────────────┐   │  │
│  │   │ │  │  │  Code: src/middleware/auth.ts (3 diffs)         │   │  │
│  │   │ │  │  │  ┌──────────┐  ┌──────────┐                     │   │  │
│  │   │ │  │  │  │ ✅ Yes   │  │ ⚠️ Minor  │                    │   │  │
│  │   │ │  │  │  └──────────┘  └──────────┘                     │   │  │
│  │   │ │  │  │  Your response: "Looks good, add tests"          │   │  │
│  │   │ │  │  └──────────────────────────────────────────────────┘   │  │
│  │   │ │  │                                                        │  │
│  │   │ │  │  [2:03 PM]  Claude responded:                          │  │
│  │   │ │  │  "Adding test coverage now..."                         │  │
│  │   │ │  └────────────────────────────────────────────────────────┘  │
│  │   │ │                                                              │
│  │   │ │  [ Resume Active Surface → ]  [ Stop Claude → ]             │
│  └───┘  └─────────────────────────────────────────────────────────────┘
│
│  ──────────────────────────────────────────────────────────────────── │
│  Connected via MCP · 1 active connection                              │
└────────────────────────────────────────────────────────────────────────┘
```

### Session detail sections

| Section | Detail |
|---------|--------|
| **Header** | Back button, session title (editable), status badge, timestamps |
| **Timeline** | Reverse chronological: Claude's actions, surfaces, user responses |
| **User Surfaces** | All surfaces in this session, user's responses, Claude's replies |
| **Actions bar** | "Resume Active Surface" and "Stop Claude" buttons |
| **Right-click** | Duplicate, Archive, Delete, Rename |
| **Surface resume** | Clicking a past surface reopens it in the SurfaceOverlay |

---

## 12. Settings View

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Human Assist                                                      │
│  ──────────────────────────────────────────────────────────────────── │
│  ┌───┐                                                                │
│  │ N │ │  ┌───────────────────────────────────────────────────────┐  │
│  │ e │ │  │  Settings                             [Save & Back]   │  │
│  │ w │ │  │                                                        │  │
│  │ S │ │  ├── Account ──────────────────────────────────────────┤  │
│  │ e │ │  │                                                        │  │
│  │ s │ │  │  Avatar   [⭕ User Name]                             │  │
│  │ s │ │  │  Email: user@example.com                            │  │
│  │   │ │  │  Sign in with: Google                              │  │
│  │ H │ │  │  [ Change email ]  [ Sign out ]                    │  │
│  │ o │ │  └────────────────────────────────────────────────────────┘  │
│  │ s │ │  └────────────────────────────────────────────────────────┘  │
│  │   │ │  └────────────────────────────────────────────────────────┘  │
│  │   │ │  │                                                        │  │
│  │   │ │  ├── Workspace ──────────────────────────────────────────│  │
│  │   │ │  │                                                        │  │
│  │   │ │  │  Code path:  /Users/you/projects/my-app       [Edit] │  │
│  │   │ │  │  Git URL:  https://github.com/you/my-app              │  │
│  │   │ │  │  Claude setup:  CLI Mode (auto-detected)              │  │
│  │   │ │  └────────────────────────────────────────────────────────┘  │
│  │   │ │  └────────────────────────────────────────────────────────┘  │
│  │   │ │  │                                                        │  │
│  │   │ │  ├── Appearance ─────────────────────────────────────────│  │
│  │   │ │  │                                                        │  │
│  │   │ │  │  Theme:  [◉ Light  ○ Dark  ○ System]                 │  │
│  │   │ │  │  Font size: [─ 14px +]                                │  │
│  │   │ │  │  Sidebar width: [▁▁▁▁▁██████▃▃▃▃▃▃▃▃]  Medium       │  │
│  │   │ │  └────────────────────────────────────────────────────────┘  │
│  │   │ │  └────────────────────────────────────────────────────────┘  │
│  │   │ │  │                                                        │  │
│  │   │ │  ├── Notifications ──────────────────────────────────────│  │
│  │   │ │  │                                                        │  │
│  │   │ │  │  ☑ Show desktop notifications                         │  │
│  │   │ │  │  ☑ Play sounds for surfaces                           │  │
│  │   │ │  │  ☑ Banner for active surfaces                         │  │
│  │   │ │  │  ☐ Quiet hours: [10:00 PM] — [7:00 AM]               │  │
│  │   │ │  └────────────────────────────────────────────────────────┘  │
│  │   │ │  └────────────────────────────────────────────────────────┘  │
│  │   │ │  │                                                        │  │
│  │   │ │  ├── Connection ─────────────────────────────────────────│  │
│  │   │ │  │                                                        │  │
│  │   │ │  │  Claude:  ● Connected — Version 1.0.0                  │  │
│  │   │ │  │  MCP:     ● Active — Port 3613                        │  │
│  │   │ │  │  Last seen: 2 minutes ago                             │  │
│  │   │ │  │  [Test Connection]  [View Logs]                       │  │
│  │   │ │  └────────────────────────────────────────────────────────┘  │
│  │   │ │  └────────────────────────────────────────────────────────┘  │
│  │   │ └─────────────────────────────────────────────────────────────┘
│  └───┘  ────────────────────────────────────────────────────────────── │
│         Connected via MCP · 1 active connection                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Settings sections detail

**Account**
| Field | Detail |
|-------|--------|
| Avatar | Click to upload new photo |
| Email | Read-only, change opens email confirm |
| Sign in method | Read-only indicator |
| Change email | Opens email verification flow |
| Sign out | Confirm dialog → clears keychain → goes to Welcome |

**Workspace**
| Field | Detail |
|-------|--------|
| Code path | Folder picker, validates directory exists |
| Git URL | Text input, validates URL format |
| Claude setup | Dropdown: CLI Mode / MCP Mode / Manual |

**Appearance**
| Field | Detail |
|-------|--------|
| Theme | Light/Dark/System — live preview |
| Font size | 12px–18px slider |
| Sidebar width | Narrow / Medium / Wide drag handle |

**Notifications**
| Field | Detail |
|-------|--------|
| Desktop notifications | macOS notification center permission request |
| Sounds | Toggle play sound on surface push |
| Banner | Toggle macOS banner notification |
| Quiet hours | Suppress notifications during hours |

**Connection**
| Field | Detail |
|-------|--------|
| Claude status | ● green = connected, ● red = disconnected |
| MCP status | ● green = active, ● red = inactive |
| Test Connection | Pings MCP, shows result |
| View Logs | Opens a modal with last 100 log lines |

---

## 13. History View

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Human Assist                                                      │
│  ──────────────────────────────────────────────────────────────────── │
│  ┌───┐                                                                │
│  │ N │ │  ┌───────────────────────────────────────────────────────┐  │
│  │ e │ │  │  History                      [Search]  [⚙ Filter]   │  │
│  │ w │ │  │                                                        │  │
│  │ S │ │  │  Today (2)                                             │  │
│  │ e │ │  │  ┌──────────────────────────────────────────────────┐  │  │
│  │ s │ │  │  │  🟢 Fix the login bug                        Active │  │  │
│  │ s │ │  │  │     Last activity: 2 min ago                    │  │  │
│  │ H │ │  │  │  (click to open)                              │  │  │
│  │ o │ │  │  ├────────────────────────────────────────────────┤  │  │
│  │ s │ │  │  │  🟢 Review code for PR #42                  Active   │  │  │
│  │   │ │  │  │  Last activity: 15 min ago                    │  │  │
│  │   │ │  │  └────────────────────────────────────────────────┘  │  │
│  │   │ │  │                                                        │  │
│  │   │ │  │  Yesterday (3)                                         │  │
│  │   │ │  │  [───────────────────────────────────────────]        │  │
│  │   │ │  │  ✓  "Set up CI pipeline"                               │  │
│  │   │ │  │  ✓  "Add unit tests for auth"                          │  │
│  │   │ │  │  ✓  "Refactor data layer"                              │  │
│  │   │ │  │                                                        │  │
│  │   │ │  │  Last 7 days (8)                                       │  │
│  │   │ │  │  [───────────────────────────────────────────]        │  │
│  │   │ │  │  ○  "Migrate to React 19"                              │  │
│  │   │ │  │  ✓  "Update API docs"                                  │  │
│  │   │ │  └────────────────────────────────────────────────────────┘  │
│  │   │ └─────────────────────────────────────────────────────────────┘
│  └───┘  ────────────────────────────────────────────────────────────── │
│         Connected via MCP · 13 total sessions                         │
└────────────────────────────────────────────────────────────────────────┘
```

### History interactions

| Action | Behavior |
|--------|----------|
| Click entry | Opens Session Detail (read-only view of past session) |
| Search | Filters all sessions by title, description, surface content |
| Filter | Opens filter popover: Status (all/active/done/error), Date range, Tags |
| Right-click | Rename, Duplicate, Archive, Delete |
| "Clear completed" | Confirm dialog → removes all archived sessions |
| Scroll | Virtualized list, loads batches of 20 |

---

## 14. Notifications Panel (slides from right)

```
┌──────────────────────────────────────────────────────────────────┐
│  Notifications                                   [✕ Close]       │
│  ────────────────────────────────────────────────────────────    │
│                                                                  │
│  Today                                                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ✦  Claude needs your help                             New│   │
│  │  "Review the auth middleware"                            │   │
│  │  2 min ago                         [Open] [Dismiss]     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ✅  Code review complete                              Open│   │
│  │  "I found 2 issues in your code"                         │   │
│  │  15 min ago                        [Open] [Dismiss]     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Yesterday                                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  🟢  Session "Set up CI" completed                       View│   │
│  │  "CI pipeline is ready"                                  │   │
│  │  Yesterday                          [View] [Dismiss]    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [ Clear All Notifications ]                                     │
└──────────────────────────────────────────────────────────────────┘
```
