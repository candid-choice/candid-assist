# Launch Checklist — Consolidated

## Overview

The original `pre-launch-checklist.md` has extensive duplicate "NestJS" entries that should be consolidated. This document provides a clean, actionable checklist for launch readiness.

## Core Requirements

### Desktop App
| Item | Status | Notes |
|------|--------|-------|
| MCP server starts on launch | ❌ | Port 3613, auto-retry 3614-3622 |
| MCP server stops on quit | ❌ | Graceful shutdown |
| All 6 MCP tools work | ❌ | Browser, Canvas, Image, ScreenCapture, CodeDiff, Terminal |
| Surface lifecycle works | ❌ | NOTIFICATION → PENDING → ACTIVE → RESPONDING → COMPLETE |
| IPC bridge works | ❌ | Preload script validates all calls |
| Help Palette works | ❌ | ⌘+Shift+Space, 6 shortcuts |
| Keyboard shortcuts work | ❌ | ⌘+N, Escape, Enter |
| Toast notifications work | ❌ | Bottom-center, max 4 stacked |
| Banners work | ❌ | Top banner for connection state |
| macOS dark mode works | ❌ | System theme detection |
| Retina / 4K display | ❌ | Resolution-independent UI |
| Multiple monitors | ❌ | Surfaces span monitors |
| Accessibility | ❌ | Alt text, keyboard nav, VoiceOver |

### Authentication & Sessions
| Item | Status | Notes |
|------|--------|-------|
| Firebase Auth (Google) | ❌ | OAuth flow working |
| Firebase Auth (Email) | ❌ | Email/password flow |
| Auth state persistence | ❌ | Survives app restart |
| Session CRUD | ❌ | Create, read, update, archive, delete |
| Session list loads | ❌ | Sorted by updatedAt, desc |
| Session detail loads | ❌ | Shows surfaces for session |

### Surface Delivery
| Item | Status | Notes |
|------|--------|-------|
| WebSocket real-time updates | ❌ | Surface pushes from backend |
| Surface render pipeline | ❌ | Tool call → Firestore → WebSocket → IPC → Render |
| Surface minimize animation | ❌ | Current → minimized, new → active |
| Surface queue (>1 surface) | ❌ | Max 10, queue excess |
| Surface timeout (30min) | ❌ | Auto-disconnect |
| Surface error recovery | ❌ | Retry, dismiss, restore |

### Backend
| Item | Status | Notes |
|------|--------|-------|
| NestJS app deploys | ❌ | HTTP endpoints live |
| Firestore security rules | ❌ | Users, sessions, surfaces, notifications |
| Auth middleware works | ❌ | JWT verification |
| Error handling works | ❌ | Global error filters |
| CORS configuration | ❌ | Allow localhost:5173 for dev |
| Rate limiting | ❌ | 20 surfaces/min, 3 surfaces/sec |
| HTTP endpoints tested | ❌ | All CRUD operations |

### Error Handling & Recovery
| Item | Status | Notes |
|------|--------|-------|
| Offline mode | ❌ | Actions queued in IndexedDB |
| Offline replay | ❌ | Replays on reconnect |
| Crash recovery | ❌ | "App crashed — what to restore" dialog |
| Session recovery | ❌ | Last active session restored |
| Surface state preserved | ❌ | Minimized surfaces survive restart |
| Error logging | ❌ | Sentry for frontend, Cloud Watch for backend |

### Onboarding
| Item | Status | Notes |
|------|--------|-------|
| Step 1: MCP server running | ❌ | Shows endpoint, copy URL |
| Step 2: Connect Claude Code | ❌ | Config snippet, restart Claude |
| Step 3: Verify connection | ❌ | Confirms Claude sees Human Assist |
| Troubleshooting panel | ❌ | Port blocked, firewall, old Claude |
| Success toast | ❌ | "All set!" message |
| Dashboard after onboarding | ❌ | "Waiting for Claude" state |

## Go-Live Requirements

| Item | Description |
|------|-------------|
| Production Firebase project | Auth, Firestore configured |
| Production NestJS app | Deployed, endpoints accessible |
| Signed & notarized app bundle | macOS Gatekeeper ready |
| DMG installer | Drag-to-Applications or installer |
| Sparkle auto-updater | For future updates |
| README.md | Installation, setup, troubleshooting |
| CONTRIBUTING.md | Development setup |
| CHANGELOG.md | Version history |
| Error tracking | Sentry project configured |
| Metrics | Basic usage metrics |

## Testing Requirements

| Scenario | Tested | Notes |
|----------|--------|-------|
| macOS 12+ compatibility | ❌ | All features tested |
| Retina display rendering | ❌ | All UI crisp |
| 4K display rendering | ❌ | Scales properly |
| Multiple monitor span | ❌ | Surfaces span correctly |
| Dark mode | ❌ | All UI adapts |
| Light mode | ❌ | All UI adapts |
| Offline mode | ❌ | Queued actions replay |
| App restart | ❌ | State preserved |
| App crash recovery | ❌ | Dialog appears |
| Sign out flow | ❌ | Surfaces send {completed:false} |
| Sign in flow | ❌ | All surfaces load |
| Network loss | ❌ | Banner shows |
| Network restore | ❌ | Actions replay |
| Firebase timeout | ❌ | Banner shows |
| Invalid credentials | ❌ | Inline error message |
| Account suspended | ❌ | Full-screen message |
| Token expired | ❌ | Silent re-auth |
| Surface timeout | ❌ | Auto-disconnect toast |
| Max surfaces (10) | ❌ | Toast, rejects excess |
| Max sessions (50) | ❌ | Toast |
| Surface ordering | ❌ | Last N queued, rest rejected |
| Concurrent Claude | ❌ | Only one instance active |
| Large session history | ❌ | Virtualized list |
| Accessibility (keyboard) | ❌ | Tab, Enter, Escape |
| Accessibility (VoiceOver) | ❌ | All elements announced |

## Launch Criteria

### Must Have (blocks launch)
1. [ ] All 6 MCP tools work
2. [ ] Surface lifecycle is correct
3. [ ] Auth flow works end-to-end
4. [ ] Firebase is configured for production
5. [ ] App installs and launches without errors
6. [ ] Onboarding flow completes successfully

### Should Have (blocks launch)
7. [ ] Error handling works for all layers
8. [ ] Offline mode works
9. [ ] Crash recovery works
10. [ ] All accessibility requirements met
11. [ ] README and documentation complete
12. [ ] Security rules tested

### Nice to Have (can delay launch)
13. [ ] Metrics collection working
14. [ ] Error tracking configured
15. [ ] Auto-updater configured
16. [ ] Performance benchmarks met
17. [ ] All tests passing (unit + integration)
