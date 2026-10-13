# pre-state-management-test — Test Specification

## Purpose

Verify the State Management document correctly defines state categories, state tree structure, persistence strategy, sync rules, offline state, and state recovery.

## Unit Tests

### State Categories
- [ ] Verify auth state: current user, session token, sign-in method
- [ ] Verify sessions state: active sessions, archived sessions, session detail
- [ ] Verify surfaces state: active surfaces, minimized surfaces, complete surfaces
- [ ] Verify UI state: sidebar collapsed, active surface, selected session, settings panel
- [ ] Verify notifications state: active notifications, read notifications, notification preferences
- [ ] Verify connection state: connected, disconnected, reconnecting, offline

### State Tree Structure (AppState)
- [ ] Verify root AppState object exists
- [ ] Verify AppState.auth: user, token, isLoggedIn
- [ ] Verify AppState.sessions: active[], history[], current
- [ ] Verify AppState.surfaces: active[], minimized[], complete[]
- [ ] Verify AppState.ui: sidebar, activeSurface, settingsPanel
- [ ] Verify AppState.notifications: active[], preferences
- [ ] Verify AppState.connection: status, lastSeen
- [ ] Verify AppState is serializable (for localStorage/IndexedDB/Firestore sync)

### Persistence — localStorage
- [ ] Verify auth state persisted to localStorage
- [ ] Verify UI state persisted to localStorage (sidebar width, settings)
- [ ] Verify notification preferences persisted to localStorage
- [ ] Verify localStorage key structure defined (e.g., ha_auth, ha_ui, ha_settings)
- [ ] Verify localStorage versioning for migration
- [ ] Verify localStorage read on app init, writes on state changes

### Persistence — IndexedDB
- [ ] Verify surfaces state persisted to IndexedDB (large payload)
- [ ] Verify session list persisted to IndexedDB (long history)
- [ ] Verify offline actions queue in IndexedDB
- [ ] Verify IndexedDB key structure defined
- [ ] Verify IndexedDB read/write strategy described
- [ ] Verify IndexedDB backup: localStorage as fallback for small data

### Persistence — Firestore
- [ ] Verify sessions persisted to Firestore (sessions collection)
- [ ] Verify surfaces persisted to Firestore (surfaces collection)
- [ ] Verify notifications persisted to Firestore (notifications collection)
- [ ] Verify user profile synced to Firestore (users collection)
- [ ] Verify Firestore sync triggered on state changes
- [ ] Verify Firestore conflict resolution: last write wins

### Sync Rules
- [ ] Verify auth state: synced to Firestore profile, not synced from
- [ ] Verify session state: synced to Firestore sessions, synced from
- [ ] Verify surface state: synced to Firestore surfaces, synced from
- [ ] Verify UI state: not synced to Firestore (client only)
- [ ] Verify notification preferences: synced to Firestore, synced from
- [ ] Verify connection state: not synced (ephemeral, not persisted)
- [ ] Verify offline: changes queued in IndexedDB, replayed on reconnect

### Offline State
- [ ] Verify offline state tracked (connection status = offline)
- [ ] Verify offline actions queued in IndexedDB
- [ ] Verify offline UI state preserved (session list, surface data)
- [ ] Verify offline reconnection: replay queued actions
- [ ] Verify offline reconnection: fetch latest from Firestore
- [ ] Verify offline reconnection: conflict resolution (last write wins)

### State Recovery — Restart
- [ ] Verify app restart: restore state from localStorage/IndexedDB
- [ ] Verify app restart: session state restored from Firestore
- [ ] Verify app restart: connection re-established
- [ ] Verify app restart: offline queue replayed

### State Recovery — Reconnection
- [ ] Verify reconnection: sync state from Firestore
- [ ] Verify reconnection: replay queued actions
- [ ] Verify reconnection: conflict resolution if state changed
- [ ] Verify reconnection: toast "Reconnected" with latest changes

### State Recovery — Crash
- [ ] Verify crash: state preserved in IndexedDB
- [ ] Verify crash: crash report sent to Firebase/Sentry
- [ ] Verify crash recovery: dialog shows recovered sessions/surfaces
- [ ] Verify crash recovery: user selects "All", "Some", or "None"

### Cross-Plan Consistency
- [ ] Verify state tree matches pre-firestore-data-model.md (Firestore collections)
- [ ] Verify persistence matches pre-desktop-app-architecture.md (localStorage/IndexedDB)
- [ ] Verify recovery matches pre-crash-recovery.md (crash handling)
- [ ] Verify sync matches pre-ws-events.md (WebSocket event sync)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All state categories are correctly defined
2. ] All AppState tree structure is complete and serializable
3. [ ] All persistence strategies (localStorage, IndexedDB, Firestore) are described
4. [ ] All sync rules are specified (what syncs, what doesn't, direction)
5. [ ] Offline state behavior is fully described
6. [ ] All state recovery scenarios are covered (restart, reconnection, crash)
7. [ ] No contradictions with other plans
