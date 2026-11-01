# Implementation Order — Plan Consolidation

## Overview

This document consolidates all 15+ unreviewed plan files into a single implementation roadmap. It groups related plans, identifies dependencies, and suggests an order for implementation.

## Plan Grouping

### Group A: Foundation (implement first)
| Plan File | Purpose |
|-----------|---------|
| pre-firestore-data-model.md | Data schema, collections, indexes |
| pre-backend-architecture.md | NestJS services, controllers, modules |
| pre-firebase-rules.md | Security rules, auth configuration |
| pre-desktop-app-architecture.md | Electron process model, IPC |
| pre-desktop-app-shell.md | Shell layout, preload API, IPC security |
| pre-state-management.md | State tree, persistence, sync |

### Group B: MCP & Surface Delivery (implement second)
| Plan File | Purpose |
|-----------|---------|
| pre-mcp-protocol.md | MCP server, tools, notifications |
| pre-mcp-tools-detail.md | 6 tool specs, params, returns |
| pre-mcp-validation.md | Validation rules, error codes |
| pre-surface-render-pipeline.md | Tool call → Firestore → WebSocket → Render |
| pre-ws-events.md | WebSocket events, delivery guarantees |

### Group C: Surface UI (implement third)
| Plan File | Purpose |
|-----------|---------|
| pre-surface-lifecycle-states.md | Surface lifecycle states |
| pre-surface-transitions.md | State transition diagram |
| pre-surface-components.md | Shared UI components |
| pre-surface-lifecycle-states.md (reviewed) | Detailed per-type state behavior |

### Group D: User Flow (implement fourth)
| Plan File | Purpose |
|-----------|---------|
| pre-onboarding-flow-detail.md | 3-step wizard, MCP connection |
| pre-task-composer-detail.md | Command palette, attachments |
| pre-02-page-navigation-flow.md | Route map, guards, transitions |
| pre-workspace-config.md | Workspace detection, config |

### Group E: Error Handling (implement fifth)
| Plan File | Purpose |
|-----------|---------|
| pre-error-handling.md | Error hierarchy per layer |
| pre-error-escalation.md | Cross-layer error escalation |
| pre-crash-recovery.md | Crash detection, recovery dialog |

### Group F: Notifications & UX (implement sixth)
| Plan File | Purpose |
|-----------|---------|
| pre-notification-system.md | macOS, toast, banner notifications |
| pre-launch-checklist.md → pre-launch-checklist-v2.md | Launch readiness checklist |

### Group G: Operations (implement last)
| Plan File | Purpose |
|-----------|---------|
| pre-launch-checklist-v2.md | Consolidated launch checklist |
| pre-cicd-pipeline.md | CI/CD, builds, releases |
| pre-test-strategy.md | Unit, integration, E2E, component tests |
| pre-crash-recovery.md | Crash reporting, analysis |

## Dependencies Graph

```
Group A (Foundation)
    ↓
Group B (MCP & Surface Delivery) — depends on A
    ↓
Group C (Surface UI) — depends on B
    ↓
Group D (User Flow) — depends on A, B
    ↓
Group E (Error Handling) — depends on A, B, C
    ↓
Group F (Notifications & UX) — depends on C
    ↓
Group G (Operations) — depends on all above
```

## Recommended Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- pre-firestore-data-model.md
- pre-backend-architecture.md
- pre-firebase-rules.md
- pre-desktop-app-architecture.md
- pre-desktop-app-shell.md
- pre-state-management.md

**Deliverable:** Working auth flow, session CRUD, base state management.

### Phase 2: MCP & Surface Delivery (Weeks 3-4)
- pre-mcp-protocol.md
- pre-mcp-tools-detail.md
- pre-mcp-validation.md
- pre-surface-render-pipeline.md
- pre-ws-events.md

**Deliverable:** One surface works end-to-end (tool call → render → respond → complete).

### Phase 3: All Surface Types (Weeks 5-6)
- pre-surface-transitions.md
- pre-surface-components.md
- pre-surface-lifecycle-states.md (reviewed)

**Deliverable:** All 6 surface types render and respond.

### Phase 4: User Flow (Weeks 7-8)
- pre-onboarding-flow-detail.md
- pre-task-composer-detail.md
- pre-02-page-navigation-flow.md
- pre-workspace-config.md

**Deliverable:** Complete user journey: login → onboarding → dashboard → surface.

### Phase 5: Error Handling (Weeks 9-10)
- pre-error-handling.md
- pre-error-escalation.md
- pre-crash-recovery.md

**Deliverable:** Error handling at all layers, crash recovery dialog.

### Phase 6: Notifications & UX (Weeks 11-12)
- pre-notification-system.md
- pre-launch-checklist-v2.md

**Deliverable:** Notifications working, all UX polish done.

### Phase 7: Operations (Weeks 13-14)
- pre-cicd-pipeline.md
- pre-test-strategy.md
- pre-crash-recovery.md (operations aspect)

**Deliverable:** CI/CD pipeline, tests, crash reporting, launch-ready.

## Cross-Plan Consistency Check

### Identified Issues

1. **Surface count:** Some docs say 6 surfaces, some say 7 (counting ProcessManager separately). **Resolution:** There are 6 MCP tools. ProcessManager may be a UI pattern, not a separate surface type.

2. **BrowserSurface timeout:** The lifecycle says 30min timeout. The validation says "no timeout unless user explicitly closes." **Resolution:** BrowserSurface has a 30min timeout only when the user is NOT navigating. If user clicks links or types, the timeout is paused (only Submit triggers timeout).

3. **ProcessManager submit behavior:** Lifecycle says ProcessManager is "complete" immediately. Some docs say no Responding state, others say all surfaces have a Submit button. **Resolution:** ProcessManager has immediate actions (Stop, Restart) that go directly to Complete. No Responding state. TerminalSurface has "Send to Claude" which goes through Responding.

4. **Max surfaces:** All docs agree on 10. Good.

5. **Append-only rule:** The reviewed `00-overview.md` says surfaces are append-only and sessions are soft-deleted. All unreviewed plans align with this. Good.

6. **MCP server restart:** All docs agree on port retry (3613-3622). Good.

### Unresolved Questions

| Question | Where | Impact |
|----------|-------|--------|
| Is ProcessManager a 7th surface or a UI pattern? | pre-desktop-app-architecture.md vs pre-mcp-tools-detail.md | Affects surface count |
| Should BrowserSurface navigation reset the timeout? | pre-surface-transitions.md vs pre-surface-lifecycle-states.md | Affects UX behavior |
| Does openScreenCapture create a surface or just capture? | pre-mcp-tools-detail.md says surface, pre-mcp-protocol.md says one-way | Affects surface lifecycle |
| Should screen capture go through Responding state? | pre-mcp-tools-detail.md says "no Send button" but is it a surface? | Affects lifecycle states |

## Plan File Inventory

### Reviewed Plans (9 files)
| File | Status |
|------|--------|
| 00-overview.md | Reviewed |
| 01-user-interaction-flow.md | Reviewed |
| 02-page-navigation-flow.md | Reviewed |
| 03-screen-sequence-login.md | Reviewed |
| 04-screen-sequence-dashboard.md | Reviewed |
| 05-screen-sequence-surfaces.md | Reviewed |
| 06-screen-detail-settings-history.md | Reviewed |
| 07-interaction-patterns.md | Reviewed |
| 10-15, surface-lifecycle-states.md (8 files) | Reviewed |

### Unreviewed Plans (18 files)
| File | Status |
|------|--------|
| pre-backend-architecture.md | Unreviewed — comprehensive |
| pre-firestore-data-model.md | Unreviewed — comprehensive |
| pre-mcp-protocol.md | Unreviewed — comprehensive |
| pre-mcp-tools-detail.md | Unreviewed — comprehensive |
| pre-onboarding-flow-detail.md | Unreviewed — comprehensive |
| pre-task-composer-detail.md | Unreviewed — comprehensive |
| pre-desktop-app-architecture.md | Unreviewed — good |
| pre-surface-lifecycle-states.md | Unreviewed — good |
| pre-error-handling.md | Unreviewed — good |
| pre-launch-checklist.md | Unreviewed — redundant, superseded by v2 |
| pre-02-page-navigation-flow.md | **NEW** — enhanced |
| pre-surface-transitions.md | **NEW** — visual spec |
| pre-error-escalation.md | **NEW** — cross-layer |
| pre-mcp-validation.md | **NEW** — validation rules |
| pre-desktop-app-shell.md | **NEW** — shell & IPC |
| pre-surface-render-pipeline.md | **NEW** — pipeline |
| pre-state-management.md | **NEW** — state tree |
| pre-firebase-rules.md | **NEW** — security rules |
| pre-launch-checklist-v2.md | **NEW** — consolidated checklist |
| pre-workspace-config.md | **NEW** — workspace config |
| pre-surface-components.md | **NEW** — component library |
| pre-ws-events.md | **NEW** — WebSocket events |
| pre-test-strategy.md | **NEW** — test strategy |
| pre-cicd-pipeline.md | **NEW** — CI/CD pipeline |
| pre-crash-recovery.md | **NEW** — crash reporting |
| pre-notification-system.md | **NEW** — notifications |
| pre-implementation-order.md | **NEW** — this file |

### Summary
- 9 reviewed plans
- 5 unreviewed plans (original)
- 12 new plans created
- **Total: 26 plan files**
