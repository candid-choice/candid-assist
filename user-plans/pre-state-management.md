# State Management Architecture

## Overview

This document defines how state is managed across the Human Assist renderer. It covers the React state tree, persistence strategy, and state sync between renderer, main process, and backend.

## State Categories

| Category | Location | Persistence | Sync target |
|----------|----------|-------------|-------------|
| Auth | React context + localStorage | Permanent | Backend (Firestore) |
| Session list | React state + IndexedDB | Permanent | Backend (Firestore) |
| Current surface | React state + IndexedDB | Semi-permanent | Backend (Firestore) |
| Surface responses (draft) | React state + IndexedDB | Until sent | Backend (Firestore) |
| UI state (sidebar, toasts) | React state | Ephemeral | N/A |
| Settings | React state + localStorage | Permanent | Backend (Firestore) |
| Connection state | React context | Ephemeral | WebSocket |
| Notifications | React state + IndexedDB | 7 days | Backend (Firestore) |

## State Tree

```
AppState
├── auth
│   ├── user: User | null
│   ├── session: FirebaseSession | null
│   └── loading: boolean
├── sessions
│   ├── list: Session[] (sorted by updatedAt, desc)
│   ├── active: Session | null
│   └── loading: boolean
├── surfaces
│   ├── active: Surface | null
│   ├── minimized: Surface[]
│   ├── history: Surface[] (for current session)
│   └── loading: boolean
├── ui
│   ├── sidebarOpen: boolean
│   ├── currentRoute: string
│   ├── toasts: Toast[]
│   ├── banners: Banner[]
│   ├── helpOpen: boolean
│   └── darkMode: boolean
├── notifications
│   ├── list: Notification[]
│   └── unread: number
└── connection
    ├── status: "connected" | "reconnecting" | "disconnected"
    └── lastSync: timestamp
```

## Persistence Strategy

### localStorage (Browser API)
| Data | Schema |
|------|--------|
| settings | `{ theme, autoMinimize, notifications }` |
| auth.user | `{ id, email, name, photoURL }` (non-sensitive) |

### IndexedDB (Browser API)
| Key | Data | TTL |
|-----|------|-----|
| sessions.list | Session[] | Until manual clear |
| surfaces.active | Surface | Until closed |
| surfaces.minimized | Surface[] | Until closed |
| surfaces.draft | SurfaceResponse[] | Until sent |
| notifications | Notification[] | 7 days |
| queuedActions | Action[] | Until sent |

### Firestore (Backend)
| Collection | Documents | Sync direction |
|------------|-----------|----------------|
| sessions | One per session | Renderer → Backend |
| surfaces | One per surface | Backend → Renderer |
| users | One per user | Bidirectional |
| notifications | One per user | Bidirectional |

## Sync Rules

| State | Sync interval | Direction | Conflict resolution |
|-------|--------------|-----------|-------------------|
| Sessions | On change | Renderer → Firestore | Last write wins |
| Surfaces | On change | Backend → Renderer | Backend is source of truth |
| User profile | On change | Bidirectional | Last write wins |
| Notifications | On change | Bidirectional | Backend is source of truth |
| Draft responses | On change | Renderer → Firestore (after send) | Local draft survives until sent |

## Offline State

When offline:
1. All state writes go to IndexedDB
2. All state reads try IndexedDB first
3. Offline badge shown in footer
4. Sync queue tracks all pending writes

When online:
1. Sync queue replays all pending writes in order
2. IndexedDB is invalidated with fresh data from Firestore
3. Conflicts are resolved by Firestore (last write wins)
4. Failed syncs show toast notifications

## State Recovery

### After App Restart
1. Load auth from localStorage (if exists)
2. If auth exists:
   a. Fetch sessions from Firestore
   b. Fetch surfaces from Firestore
   c. Restore active surface from IndexedDB
3. If auth doesn't exist:
   a. Show sign-in screen

### After Auth Reconnection
1. Fetch user profile from Firestore
2. Fetch all sessions for user
3. Clear local stale data
4. Restore active surface if it exists

### After Crash
1. Read Electron crash state from disk
2. Show crash recovery dialog
3. User chooses which sessions/surfaces to restore
4. Restore selected state from IndexedDB

## State Transitions

```
[App Start]
    → Check localStorage for auth
        → No auth → Sign In screen
        → Has auth → Check session validity
            → Invalid → Sign In screen
            → Valid → Load from Firestore
                → Sessions loaded → Restore active surface
                    → Active surface exists → Render surface
                    → No active surface → Show Dashboard (empty)
```
