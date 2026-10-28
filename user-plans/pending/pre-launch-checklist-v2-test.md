# pre-launch-checklist-v2 — Test Specification

## Purpose

Verify the consolidated launch checklist document correctly defines requirements across Desktop App, Auth & Sessions, Surface Delivery, Backend, Error Handling, Onboarding, Go-Live, Testing Requirements, and Launch Criteria.

## Unit Tests

### Desktop App
- [ ] Verify app signing is described (macOS codesign, notarization)
- [ ] Verify app auto-update mechanism is described (Squirrel, Sparkle)
- [ ] Verify app icon and title bar are described
- [ ] Verify window management (minimize, maximize, fullscreen) is described
- [ ] Verify tray icon is described
- [ ] Verify first launch flow is described

### Auth & Sessions
- [ ] Verify Firebase auth (Google sign-in) is described
- [ ] Verify session creation is described
- [ ] Verify session persistence is described
- [ ] Verify session restore after crash is described
- [ ] Verify sign-out flow is described

### Surface Delivery
- [ ] Verify all 6 surface types are listed (Browser, Canvas, Image, ScreenCapture, CodeDiff, Terminal)
- [ ] Verify surface render pipeline is described
- [ ] Verify surface error handling is described
- [ ] Verify surface timeout (30 min) is described
- [ ] Verify surface minimize/maximize is described
- [ ] Verify surface count limit (10 max) is described

### Backend
- [ ] Verify NestJS backend services are described
- [ ] Verify WebSocket connection is described
- [ ] Verify HTTP API endpoints are described
- [ ] Verify Firebase integration is described
- [ ] Verify MCP server integration is described
- [ ] Verify health check endpoint is described

### Error Handling
- [ ] Verify error boundary components are described
- [ ] Verify error catch and retry mechanisms are described
- [ ] Verify offline queue is described
- [ ] Verify error logging (Sentry) is described
- [ ] Verify user-facing error messages are described

### Onboarding
- [ ] Verify 3-step onboarding flow is described:
  - [ ] Step 1: MCP Server Running
  - [ ] Step 2: Connect Claude Code
  - [ ] Step 3: Verify the Connection
- [ ] Verify onboarding skip is described
- [ ] Verify onboarding restart after failure is described

### Go-Live
- [ ] Verify staging deployment is described
- [ ] Verify production deployment is described
- [ ] Verify smoke tests before launch are described
- [ ] Verify rollback plan is described
- [ ] Verify monitoring/alerting is described

### Testing Requirements
- [ ] Verify unit test coverage threshold is described
- [ ] Verify integration test coverage is described
- [ ] Verify E2E test coverage is described
- [ ] Verify manual test scenarios are described
- [ ] Verify accessibility testing is described
- [ ] Verify performance testing is described

### Launch Criteria: Must Have
- [ ] Verify auth works (sign-in, sign-out, session restore)
- [ ] Verify all 6 surface types render correctly
- [ ] Verify error handling works (network, server, client errors)
- [ ] Verify keyboard shortcuts work
- [ ] Verify offline queue works
- [ ] Verify crash recovery works

### Launch Criteria: Should Have
- [ ] Verify dark mode works on all surfaces
- [ ] Verify Retina display support is verified
- [ ] Verify accessibility meets WCAG 2.1 AA
- [ ] Verify performance targets are met (page load < 2s, surface render < 1s)
- [ ] Verify push notifications work (macOS native)

### Launch Criteria: Nice to Have
- [ ] Verify analytics integration is described
- [ ] Verify advanced settings (compact mode, font size) are described
- [ ] Verify multi-monitor support is described
- [ ] Verify low storage handling is described

### Cross-Plan Consistency
- [ ] Verify no contradictions with pre-launch-checklist.md (original version)
- [ ] Verify no contradictions with pre-test-strategy.md (testing requirements)
- [ ] Verify no contradictions with pre-onboarding-flow-detail.md (onboarding)
- [ ] Verify no contradictions with pre-desktop-app-architecture.md (app shell)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All Desktop App requirements are specified
2. [ ] All Auth & Sessions requirements are described
3. [ ] All Surface Delivery requirements are covered
4. [ ] All Backend requirements are described
5. [ ] All Error Handling requirements are covered
6. [ ] All Onboarding requirements are described
7. [ ] All Go-Live requirements are specified
8. [ ] All Testing Requirements are described
9. [ ] All Launch Criteria (Must Have, Should Have, Nice to Have) are complete
10. [ ] No contradictions with other plans
