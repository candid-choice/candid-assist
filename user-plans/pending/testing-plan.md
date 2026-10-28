# Testing Plan — Human Assist

## Phase 0: Verify Current Implementation (Manual Testing)

### Desktop App — Manual QA
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1 | App opens | Launch app from terminal | Window appears with "Human Assist" title |
| 2 | Draggable window | Click and drag titlebar | Window moves with cursor |
| 3 | Maximize | Double-click titlebar | Window maximizes to full screen |
| 4 | Tab switching | Click View A, View B tabs | SurfaceHost switches visible surface |
| 5 | HelpPalette | Press ⌘+Shift+Space (if implemented) | HelpPalette slides up from bottom-right |
| 6 | IdleState | No surfaces active | "Waiting for Claude" appears with connected dot |
| 7 | SurfaceHost — Browser | SurfaceHost receives browser config | BrowserSurface renders with URL bar |
| 8 | SurfaceHost — Canvas | SurfaceHost receives canvas config | CanvasSurface renders with drawing area |
| 9 | SurfaceHost — Image | SurfaceHost receives image config | ImageSurface renders with image area |
| 10 | SurfaceHost — Screen | SurfaceHost receives screen config | ScreenSurface renders with capture modes |
| 11 | SurfaceHost — Input | SurfaceHost receives input config | InputSurface renders with text input |
| 12 | All empty dirs checked | Check CodeDiffSurface, TerminalSurface | Directories are empty (stub) |

### Backend — Manual QA
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 13 | Health check | `curl http://localhost:3601/health` | Returns `{ "status": "ok" }` |
| 14 | Auth module exists | Check `src/auth/auth.controller.ts` | Auth controller is defined |
| 15 | Firebase connects | Check `src/firebase/firebase.service.ts` | Firebase is configured with emulator support |
| 16 | Session CRUD | Check `src/services/session/session.service.ts` | 4 methods: create, list, get, delete |
| 17 | Surface CRUD | Check `src/services/surface/surface.service.ts` | 4 methods: create, list, get, delete |
| 18 | Firestore types | Check `src/types/firestore.ts` | All interfaces defined (User, Session, Surface, Notification) |

### Store — Manual QA
| # | Test | Steps | Expected |
|---|------|-------|----------|
| 19 | Store initialization | Check `store/index.ts` | Default views (view-a, view-b), activeSurface=null |
| 20 | openSurface | Call store.openSurface(config) | activeSurface set, helpPaletteOpen=false |
| 21 | completeSurface | Call store.completeSurface(result) | activeSurface=null, result added to completedSurfaces |
| 22 | cancelSurface | Call store.cancelSurface() | activeSurface=null |
| 23 | toggleHelpPalette | Call store.toggleHelpPalette() | helpPaletteOpen toggles |
| 24 | setActiveView | Call store.setActiveView(id) | activeViewId updated |
| 25 | updateViewUrl | Call store.updateViewUrl(id, url) | View's payload updated with new URL |

---

## Phase 1 Tests: MCP Server (Next Priority)

### Unit Tests
| # | Test | Tool | Description |
|---|------|------|-------------|
| 1 | MCP server starts on port 3613 | Vitest | Server binds, listens, responds to health |
| 2 | MCP server retries on port conflict | Vitest | Tries 3614, 3615... up to 10 retries |
| 3 | validateUrl helper | Vitest | Accepts valid URLs, rejects invalid |
| 4 | validateToolArgs | Vitest | Validates each tool's arguments against schema |
| 5 | openBrowserSurface tool | Vitest | Returns `{ surfaceId, status: "opened" }` |
| 6 | openCanvasSurface tool | Vitest | Returns `{ surfaceId, status: "opened" }` |
| 7 | openImageSurface tool | Vitest | Returns `{ surfaceId, status: "opened" }` |
| 8 | openScreenCapture tool | Vitest | Returns `{ surfaceId, status: "started" }` |
| 9 | openCodeDiff tool | Vitest | Returns `{ surfaceId, status: "opened" }` |
| 10 | openTerminalOutput tool | Vitest | Returns `{ surfaceId, status: "opened" }` |
| 11 | Max 10 surfaces check | Vitest | Returns error when 10 surfaces already open |

### Integration Tests
| # | Test | Tool | Description |
|---|------|------|-------------|
| 12 | MCP server ↔ Desktop app | Playwright | Claude calls tool → Surface appears in app |
| 13 | MCP server ↔ Backend | Playwright | Tool call → Surface created in Firestore |
| 14 | MCP server ↔ Firebase | Playwright | Surface pushed → Firestore document exists |
| 15 | MCP server restart | Playwright | Kill server, verify auto-restart on new port |
| 16 | Surface timeout (30min) | Playwright | Surface auto-closes after 30min idle |

---

## Phase 2 Tests: WebSocket Service

### Unit Tests
| # | Test | Tool | Description |
|---|------|------|-------------|
| 1 | ws-service connects to Firebase | Vitest | WS client connects, emits 'connected' event |
| 2 | ws-service reconnects | Vitest | WS disconnects, reconnects, emits 'reconnected' |
| 3 | ws-service parses surface events | Vitest | Validates surface event payload structure |
| 4 | Surface push creates surface in store | Vitest | Event → store.openSurface() called |
| 5 | Surface close event handled | Vitest | `surface:closed` event → store.completeSurface() |
| 6 | Surface response event handled | Vitest | `surface:response` event → updates surface state |
| 7 | Surface error event handled | Vitest | `surface:error` event → shows error banner |

### Integration Tests
| # | Test | Tool | Description |
|---|------|------|-------------|
| 8 | Full pipeline: Tool → WS → Renderer | Playwright | MCP tool → Firestore → WS → Surface renders |
| 9 | Multiple surfaces simultaneously | Playwright | 5 surfaces pushed, all render in order |
| 10 | Surface minimize/restore | Playwright | New surface arrives → current minimized → click restores |
| 11 | Offline queuing | Playwright | Disconnect WS, queue events, reconnect → replay |

---

## Phase 3 Tests: Auth Flow (Phase 4 Start)

### Unit Tests
| # | Test | Tool | Description |
|---|------|------|-------------|
| 1 | Auth hook — no token | Vitest | Shows sign-in screen |
| 2 | Auth hook — invalid token | Vitest | Shows sign-in screen (token expired) |
| 3 | Auth hook — valid token | Vitest | Shows dashboard |
| 4 | Auth hook — logout | Vitest | Clears token, redirects to sign-in |
| 5 | Keychain save | Vitest | Stores token securely |
| 6 | Keychain read | Vitest | Returns token, null if not found |

### Integration Tests
| # | Test | Tool | Description |
|---|------|------|-------------|
| 7 | Sign-in flow | Playwright | Click Google → Auth → Dashboard appears |
| 8 | Sign-in flow — email | Playwright | Email/password → Auth → Dashboard appears |
| 9 | First launch → Onboarding | Playwright | First open app → Step 1 (MCP server) |
| 10 | Onboarding Step 1 → Step 2 | Playwright | MCP server running → Copy URL → Next |
| 11 | Onboarding Step 2 → Step 3 | Playwright | Edit mcp.json → Copy config → Next |
| 12 | Onboarding Step 3 → Dashboard | Playwright | Verify connection → Dashboard appears |
| 13 | Onboarding skip (returning user) | Playwright | Already onboarded → Dashboard immediately |
| 14 | Onboarding resume (quit mid-way) | Playwright | Quit after Step 1 → Resume at Step 2 |

---

## Phase 4 Tests: Dashboard Shell

### Unit Tests
| # | Test | Tool | Description |
|---|------|------|-------------|
| 1 | Empty dashboard renders | Vitest | Shows "Waiting for Claude" prompt |
| 2 | Dashboard with active session | Vitest | Shows session card in sidebar |
| 3 | Sidebar — session click | Vitest | Clicking session → loads its surfaces |
| 4 | Sidebar — history tab | Vitest | Shows archived sessions |
| 5 | Sidebar — settings tab | Vitest | Settings panel appears |
| 6 | Sidebar — collapsed state | Vitest | Sessions hidden, content fills width |
| 7 | Session card status badge | Vitest | Active (green), Waiting (blue), Done (gray) |
| 8 | Session card right-click menu | Vitest | Shows Rename, Archive, Delete options |

### Integration Tests
| # | Test | Tool | Description |
|---|------|------|-------------|
| 9 | Task Composer opens surface | Playwright | Type request → Send → Surface renders |
| 10 | Session moves to bottom when done | Playwright | Session status changes → moves in sidebar |
| 11 | Session archive | Playwright | Archive session → removed from active, appears in History |
| 12 | Session delete | Playwright | Delete session → removed from sidebar and history |
| 13 | Session search | Playwright | Search in sidebar → filters by title |
| 14 | Multiple sessions in sidebar | Playwright | 3 sessions pushed → all appear in sidebar |

---

## Phase 5 Tests: Surface Interaction

### Unit Tests
| # | Test | Tool | Description |
|---|------|------|-------------|
| 1 | BrowserSurface — URL bar | Vitest | Typing URL updates view |
| 2 | BrowserSurface — submit | Vitest | Submit button sends feedback to Claude |
| 3 | CanvasSurface — draw | Vitest | Drawing stroke recorded in payload |
| 4 | CanvasSurface — clear | Vitest | Clear button resets canvas |
| 5 | ImageSurface — zoom | Vitest | Zoom in/out scales image |
| 6 | ImageSurface — annotate | Vitest | Drawing annotation recorded in payload |
| 7 | ScreenSurface — region mode | Vitest | Selecting region captures area |
| 8 | ScreenSurface — window mode | Vitest | Selecting window captures it |
| 9 | ScreenSurface — fullscreen mode | Vitest | Click captures entire screen |
| 10 | InputSurface — text | Vitest | Typing text captured in payload |
| 11 | InputSurface — confirm/choices | Vitest | Button selection sent as payload |
| 12 | InputSurface — voice | Vitest | Voice recording (placeholder) |
| 13 | SurfaceShell — Done button | Vitest | Calls onDone callback |
| 14 | SurfaceShell — Cancel button | Vitest | Calls onCancel callback |
| 15 | SurfaceSurface — footer prop | Vitest | Renders optional footer content |

### Integration Tests
| # | Test | Tool | Description |
|---|------|------|-------------|
| 16 | Surface → Submit → Claude | Playwright | Surface opens → user submits → Claude receives data |
| 17 | Surface → Cancel → Close | Playwright | User clicks cancel → surface disappears |
| 18 | 5 surfaces simultaneously | Playwright | 5 surfaces open → all render correctly |
| 19 | 10th surface limit | Playwright | 10 surfaces open → 11th rejected with error |
| 20 | Surface minimize when new one arrives | Playwright | New surface pushed → current minimized, new renders |
| 21 | Surface timeout (30min) | Playwright | Surface open → 30min idle → auto-close |

---

## Phase 6 Tests: Error Handling

### Unit Tests
| # | Test | Tool | Description |
|---|------|------|-------------|
| 1 | Surface load fails | Vitest | Shows "Failed to load" overlay with retry |
| 2 | Network drops | Vitest | Shows "Reconnecting..." banner |
| 3 | WebSocket reconnects | Vitest | Reconnects after disconnect, replays queued events |
| 4 | MCP server unavailable | Vitest | Shows "MCP server not running" state |
| 5 | Invalid surface event | Vitest | Logs error, discards event |
| 6 | Surface ID validation | Vitest | Rejects malformed surface IDs |

### Integration Tests
| # | Test | Tool | Description |
|---|------|------|-------------|
| 7 | Full error recovery | Playwright | Disconnect → reconnect → replay events → app works |
| 8 | Surface render timeout | Playwright | Surface takes >5s to load → shows timeout error |
| 9 | Multiple errors simultaneous | Playwright | Network drops + surface load fails → shows both |

---

## Phase 7 Tests: Crash Recovery

### Manual Tests
| # | Test | Description |
|---|------|-------------|
| 1 | Kill process mid-surface | Kill app with surface open → Restart → Surface restored |
| 2 | Kill process mid-session | Kill app with active session → Restart → Session list restored |
| 3 | Kill process mid-auth | Kill app while signing in → Restart → Sign-in screen |
| 4 | Force quit | Force quit (Cmd+Q) → Restart → All state preserved |

---

## E2E Critical Path

1. **Full user journey:** Sign in → Onboarding (3 steps) → Dashboard → Open Task Composer → Submit request → Surface appears → User interacts → Submit → Surface completes
2. **Surface lifecycle:** Surface pushed → Active → User responds → Complete → Move to History
3. **Error recovery:** Network disconnect → User sees error banner → Network restores → App replays queued actions
4. **Multi-session:** 3 sessions pushed → User switches between them → All states preserved

## Coverage Targets

| Metric | Phase 1-3 | Phase 4 | Phase 5-7 |
|--------|-----------|---------|-----------|
| Unit tests | >60% | >70% | >80% |
| Integration | >30% | >50% | >60% |
| E2E | 5% | >20% | >40% |

## Manual Test Scenarios (Ongoing)

| Scenario | Steps |
|----------|-------|
| Surface timeout | Open surface, wait 30min, verify auto-close |
| Max surfaces | Push 12 surfaces, verify only 10 open |
| Offline recovery | Disconnect, queue actions, reconnect, verify replay |
| App crash recovery | Kill process, restart, verify restore dialog |
| Multiple monitors | Move window to second monitor, verify surfaces span |
| Screen capture | Request capture, verify macOS permission dialog |
| Dark mode | Toggle system theme, verify UI adapts |
