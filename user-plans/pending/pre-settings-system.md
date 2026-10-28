# Settings & Preferences System Plan

## Overview

Defines the settings screen, preferences, and how they affect the app behavior. Settings are grouped into logical categories.

## Settings Groups

| Group | Location | Access |
|-------|----------|--------|
| Profile | Settings → Profile | Click sidebar Settings |
| Workspace | Settings → Workspace | Click sidebar Settings |
| Appearance | Settings → Appearance | Click sidebar Settings |
| Surfaces | Settings → Surfaces | Click sidebar Settings |
| Notifications | Settings → Notifications | Click sidebar Settings |
| Advanced | Settings → Advanced | Click sidebar Settings |

## Profile Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Name | string | From Firebase profile | Display name |
| Email | string | From Firebase profile | Email address (read-only) |
| Photo URL | string | From Firebase profile | Profile picture URL |
| Timezone | string | System default | For timestamps |

## Workspace Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Workspace path | string | Detected | Path to workspace directory |
| Git URL | string | Auto-detected | GitHub URL for workspace |
| Git branch | string | Current branch | Current git branch |
| MCP port | number | 3613 | Port for MCP server |
| Surface timeout | number | 30 | Minutes before surface timeout |
| Max surfaces | number | 10 | Max simultaneous surfaces |

## Appearance Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Theme | dark, light, system | system | App theme |
| Color scheme | blue, green, purple | blue | Accent color |
| Font size | 12, 14, 16 | 14 | Font size for text |
| Compact mode | boolean | false | Reduce spacing |
| Minimize to tray | boolean | true | Minimize to tray instead of dock |

## Surface Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Auto minimize | boolean | true | New surface minimizes current |
| Show surface count | boolean | true | Show count in status bar |
| Surface animations | boolean | true | Enable surface animations |
| Auto close complete | boolean | false | Auto-close surfaces when complete |
| Default surface width | number | 800 | Default surface width in pixels |

## Notification Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Surface notifications | boolean | true | macOS notifications for surfaces |
| Session notifications | boolean | false | Notifications for session events |
| Sound | boolean | false | Play sound on notification |
| Quiet hours | off | off | Quiet hours (future) |

## Advanced Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Enable crash reporting | boolean | true | Send crash reports |
| Enable analytics | boolean | false | Send usage metrics |
| Reset state | button | — | Clear all local state |
| Sign out | button | — | Sign out of Firebase |
| Delete workspace cache | button | — | Clear cached workspace data |

## Settings Save Behavior

| Setting | Save to | Sync to |
|---------|---------|---------|
| Profile | localStorage | Firestore (profile) |
| Workspace | localStorage | Firestore (workspace) |
| Appearance | localStorage | None |
| Surfaces | localStorage | None |
| Notifications | localStorage | Firestore (notifications) |
| Advanced | localStorage | None |

## Settings Validation

| Setting | Validation | Error |
|---------|-----------|-------|
| Workspace path | Must exist, must be directory | "Invalid workspace path" |
| MCP port | Must be 3613-3662, not in use | "Port already in use" |
| Surface timeout | Must be 5-180 minutes | "Invalid timeout value" |
| Max surfaces | Must be 1-20 | "Invalid max surfaces" |
| Default width | Must be 400-1920 | "Invalid width" |

## Settings Migration

| Old Version | New Version | Migration |
|-------------|-------------|-----------|
| 0.x | 1.0 | Migrate old settings to new schema |
| 1.0 | 1.1 | Add new settings with defaults |
| Any | Any | Preserve user's settings on update |

## Settings Screen

```
┌────────────────────────────────────────────────────────────────────────┐
│  Settings                                                             │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                        │
│  ┌──────┬───────────────────────────────────────────────────────────┐  │
│  │ Profile│ Name: [John Doe                           ] [Save]    │  │
│  ├──────┤ Email: john@example.com (read-only)                    │  │
│  ├──────┤ Photo: [Circular avatar]                               │  │
│  ├──────┤ Timezone: [macOS Local Time ▼]                         │  │
│  ├──────┤                                                          │  │
│  │Workspace│ Path: [/Users/john/project      ] [Change]          │  │
│  ├──────┤ Git: https://github.com/user/project                   │  │
│  ├──────┤ Branch: [main ▼]                                       │  │
│  ├──────┤ MCP Port: [3613]                                       │  │
│  ├──────┤                                                          │  │
│  │Appearance│ Theme: [Dark ▼]                                    │  │
│  ├──────┤ Accent: [Blue ▼]                                       │  │
│  ├──────┤ Font size: [14 ▼]                                      │  │
│  ├──────┤ Compact mode: [○●]                                     │  │
│  ├──────┤                                                          │  │
│  │Surfaces│ Auto minimize: [●○]                                  │  │
│  ├──────┤ Show count: [●○]                                       │  │
│  ├──────┤ Animations: [●○]                                       │  │
│  ├──────┤ Surface timeout: [30 min]                              │  │
│  ├──────┤                                                          │  │
│  │Notifications│ Surface: [●○]                                   │  │
│  ├──────┤ Sound: [○●]                                             │  │
│  ├──────┤                                                          │  │
│  │Advanced│ [Reset Local State] [Sign Out] [Delete Workspace]    │  │
│  └──────┴───────────────────────────────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

## Edge Cases

1. **Invalid workspace** → Show error, prompt to select new workspace
2. **Port conflict** → Auto-find next available port
3. **Settings sync conflict** → Last write wins, show toast "Settings updated"
4. **Sign out** → Clear all local settings, sign out of Firebase
5. **Reset state** → Clear all local state, restart app
6. **Delete workspace cache** → Clear cached workspace data, keep settings
