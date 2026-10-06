# Sidebar & Session List — Interaction Flow

## Overview

Specifies exactly what happens when the user interacts with the left sidebar — every click, hover, right-click, and keyboard shortcut.

## Sidebar Structure

```
┌──────┐
│ New  │  ← "New" button (⌘+N shortcut)
├──────┤
│ Sessions ▼             🔍        │  ← Search + filter + collapse
├──────┤
│ ● Active (3)         ▾           │  ← Section header, clickable
│ ─────────────────────────        │
│ ▶ Fix the login bug           │  ← Active session item
│   Last activity: 2 min ago     │
│                                │
│ ▶ Review code for PR #42      │
│   Last activity: 15 min ago    │
│                                │
│ ● History (5)              ▾   │
│ ─────────────────────────      │
│  ○ "Set up CI pipeline"       │
│    Archived 2 hours ago        │
│                                │
│  ○ "Add unit tests for auth"   │
│    Archived 1 day ago          │
│                                │
│  ◀ Pin this session           │  ← Hover action
└──────┘
```

## Every Button & Interaction

### "New" button
| Property | Value |
|----------|-------|
| Position | Top of sidebar, 16px from top |
| Icon | "+" or "N" |
| Size | 32px × 32px square |
| Behavior | Opens Task Composer (same as ⌘+N) |
| Tooltip | "New task (⌘+N)" |
| Keyboard | Accessible via ⌘+Tab |
| Disabled state | Disabled when app is not authenticated |

### Section headers (Sessions / History)
| Property | Value |
|----------|-------|
| Click action | Toggles collapsed/expanded |
| Arrow indicator | ▸ when collapsed, ▾ when expanded |
| Count | Shows number of sessions in section (e.g., "Active (3)") |
| Click count | 0 = no sessions shown, only header visible |
| Animation | 200ms slide animation for expand/collapse |

### Session item
| Property | Value |
|----------|-------|
| Click (left) | Navigates to Session Detail |
| Click (right) | Opens context menu (see below) |
| Hover | Shows right-click ghost hints + pin/unpin icon |
| Active state | Bold title, green dot indicator, subtle highlight background |
| Hover state | Slightly darker background (#2A2D35 on dark, #F0F0F0 on light) |
| Selected state | Highlighted with accent color border (left, 3px) |
| Disabled | Grayed out when session is loading |

### Search box
| Property | Value |
|----------|-------|
| Position | Top right of sidebar, below "New" button |
| Placeholder | "Search sessions..." |
| Icon | 🔍 (left-aligned, inside input) |
| Clear button | "×" appears when text is entered |
| Behavior | Filters session list by title, description, surface content |
| Debounce | 200ms — filters after 200ms of no typing |
| Keyboard | ⌘+F focuses search, Escape clears it |
| Results | Highlights matching text in search results |
| Empty state | Shows "No results found" when nothing matches |

### Context menu on session item (right-click)
| Option | Action | Confirmation |
|--------|---------|-------------|
| Open in Full View | Navigates to session detail | None |
| Duplicate | Creates a new session with the same title and surfaces | None |
| Rename... | Opens inline rename prompt | Saves on Enter, cancels on Escape |
| Archive | Moves session to History section | None |
| Delete... | Opens confirmation dialog | Yes — "Delete permanently? This cannot be undone." |
| Copy Session URL | Copies deep link to clipboard | Shows "Copied" toast |
| Pin Session | Pins to top of active list | None |
| Hide Session | Archives and hides from list | None |

### Context menu — rename flow
| Step | Action | Result |
|------|--------|--------|
| 1 | User selects "Rename..." | Title becomes an inline text input |
| 2 | User types new name | Input auto-resizes to text width |
| 3 | User presses Enter | Saves new name, shows "Session renamed" toast |
| 4 | User presses Escape | Reverts to original name, no save |
| 5 | User clicks outside | Saves new name |
| Error | Name is empty | Inline error: "Name cannot be empty" |
| Error | Name is >50 chars | Inline error: "Name is too long" |

### Context menu — delete flow
| Step | Action | Result |
|------|--------|--------|
| 1 | User selects "Delete..." | Confirmation dialog appears |
| 2a | User clicks "Delete" | Session deleted, "Session deleted" toast with "Undo" link |
| 2b | User clicks "Cancel" | Dialog dismisses, nothing changes |
| Error | Firestore write fails | Error toast: "Failed to delete session" |
| Error | Network offline | Queued in IndexedDB, shown when online |

### Session item right-click context menu
```
┌──────────────────────────────────┐
│  Open in Full View               │
│  ─────────────────────────────── │
│  Duplicate                       │
│  ─────────────────────────────── │
│  Rename...                       │
│  ─────────────────────────────── │
│  Archive                         │
│  ─────────────────────────────── │
│  Delete...                       │
│  ─────────────────────────────── │
│  Copy Session URL                │
│  ─────────────────────────────── │
│  Pin Session                     │
│  ─────────────────────────────── │
│  Hide Session                    │
└──────────────────────────────────┘
```

## Active vs History sections

### Active section
| Property | Value |
|----------|-------|
| Trigger for entry | Session is active, waiting, or error (not archived) |
| Default state | Expanded |
| Sort order | Most recently updated, then by pinned, then by creation |
| Max items shown | 20 (scrollable, loads more on scroll) |

### History section
| Property | Value |
|----------|-------|
| Trigger for entry | Session is archived, done, or hidden |
| Default state | Collapsed |
| Sort order | Most recently archived, then by creation |
| Show trigger | User clicks to expand, or sees "5 archived" indicator |
| Content | All archived sessions for this user |

## Session list update behavior

| Event | How list updates |
|-------|-----------------|
| New surface pushed to session | Session title gets update, timestamp refreshes, moves to top of list |
| Session archived | Moves from Active to History section |
| Session renamed | Title updates in real-time |
| Session deleted | Removed from both sections, toast shown |
| Session duplicated | New session appears at top of Active with copied title |
| Session pinned | Moves to top of Active section |
| Session unpinned | Returns to normal sort position |
| Network disconnect | List freezes, shows "Offline" badge in sidebar |
| Network reconnect | List refreshes from Firestore, any offline changes replayed |

## Edge cases

1. **Session list empty** → Shows "No sessions yet" with "Tell Claude to help you" prompt
2. **Session title too long** → Truncates with "..." in sidebar, full title in session detail
3. **Session with no surfaces** → Shows "(no surfaces)" next to title
4. **Session with many surfaces** → "14 surfaces" badge shown next to title
5. **Multiple sessions with same name** → Appends number: "Fix login bug (2)"
6. **Session name with special chars** → Displayed as-is, no truncation of special chars
7. **Session with emoji** → Emoji rendered in sidebar (e.g., "🟢 Fix the login bug")
8. **Sidebar collapse** → All sessions hidden, only collapsed header visible; content area expands to fill space
