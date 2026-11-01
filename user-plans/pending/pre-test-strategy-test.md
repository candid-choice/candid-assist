# pre-test-strategy-test — Test Specification

## Purpose

Verify the test strategy document correctly defines all test layers, renderer/main process/backend testing, E2E critical paths, component variants, test data, coverage thresholds, manual scenarios, and performance tests.

## Unit Tests

### Test Layers
- [ ] Verify Unit tests: test individual functions, components, hooks
- [ ] Verify Integration tests: test component interactions, API calls, state changes
- [ ] Verify E2E tests: test full user flows (onboarding, surface interaction, session management)
- [ ] Verify Component tests: test individual components in isolation with mocked data
- [ ] Verify Contract tests: test API contracts (NestJS backend, MCP server)

### Renderer/Main Process/Backend Testing
- [ ] Verify renderer tests: React components, hooks, state management, styling
- [ ] Verify main process tests: Electron IPC, window management, file system access
- [ ] Verify backend tests: NestJS controllers, services, DTOs, guards, middleware
- [ ] Verify main process ↔ renderer communication tested
- [ ] Verify renderer ↔ backend WebSocket tested

### E2E Critical Paths
- [ ] Verify onboarding: MCP detect → connect → verify → dashboard
- [ ] Verify surface interaction: task → surface push → submit response → Claude continues
- [ ] Verify session management: create → list → detail → rename → archive → delete
- [ ] Verify navigation: dashboard → sidebar → session → settings → back
- [ ] Verify error handling: network loss → reconnect → queued actions replay
- [ ] Verify crash recovery: crash → restart → recovery dialog → restore

### Component Variants
- [ ] Verify all surface types rendered: Browser, Canvas, Image, ScreenCapture, CodeDiff, Terminal
- [ ] Verify all surface states tested: NOTIFICATION, PENDING, ACTIVE, RESPONDING, COMPLETE, DISMISSED, ERROR, TIMED_OUT, MINIMIZED
- [ ] Verify all UI components tested: sidebar, dashboard, session list, settings, help palette
- [ ] Verify dark mode/light mode variants tested
- [ ] Verify responsive layout tested (sidebar collapse, window resize)
- [ ] Verify keyboard navigation tested

### Test Data
- [ ] Verify sample session data defined (title, status, surfaces, timeline)
- [ ] Verify sample surface data defined (type, URL, content, responses)
- [ ] Verify sample user data defined (name, email, photo, preferences)
- [ ] Verify test fixtures for all major entities
- [ ] Verify mock data for error states (network failure, server error)

### Test Configuration
- [ ] Verify Jest/Testing Library for unit and component tests
- [ ] Verify Cypress/Playwright for E2E tests
- [ ] Verify Jest for backend/NestJS tests
- [ ] Verify test environment setup described
- [ ] Verify CI integration for automated test running

### Coverage Thresholds
- [ ] Verify minimum unit test coverage: 80% (lines), 80% (functions), 80% (branches)
- [ ] Verify minimum integration test coverage: 70%
- [ ] Verify minimum E2E test coverage: critical paths only (not 100%)
- [ ] Verify coverage reported per-file and overall
- [ ] Verify coverage check blocks CI merge (required for PR)

### Manual Test Scenarios
- [ ] Verify manual test: onboarding on fresh install
- [ ] Verify manual test: surface rendering on different browsers (if web)
- [ ] Verify manual test: keyboard shortcuts on all surfaces
- [ ] Verify manual test: offline behavior and reconnection
- [ ] Verify manual test: dark mode on all surfaces
- [ ] Verify manual test: Retina display rendering
- [ ] Verify manual test: accessibility (screen reader, keyboard nav)
- [ ] Verify manual test: multi-monitor surface rendering
- [ ] Verify manual test: concurrent surface pushes (up to 10)
- [ ] Verify manual test: performance under load (many surfaces, many surfaces)

### Performance Tests
- [ ] Verify surface render time: first paint < 2s for browser, < 100ms for canvas
- [ ] Verify surface response time: < 300ms for user interaction feedback
- [ ] Verify app startup time: < 3s from cold start
- [ ] Verify sidebar scroll performance: 60fps with 100+ sessions
- [ ] Verify terminal scroll performance: 60fps with 1000+ lines
- [ ] Verify memory usage: no leaks across 8+ hour session
- [ ] Verify CI runs performance tests, alerts on regression

### Cross-Plan Consistency
- [ ] Verify test layers match pre-cicd-pipeline.md (CI/CD test stage)
- [ ] Verify coverage thresholds match pre-launch-checklist.md (launch criteria)
- [ ] Verify E2E paths match pre-implementation-order.md (feature scope)
- [ ] Verify manual tests match pre-launch-checklist.md (launch criteria: must have)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All 5 test layers defined (unit, integration, E2E, component, contract)
2. [ ] All renderer/main process/backend testing strategies described
3. [ ] All E2E critical paths listed
4. [ ] All component variants covered
5. [ ] Test data and fixtures described
6. [ ] Test configuration tools specified (Jest, Cypress/Playwright)
7. [ ] All coverage thresholds defined
8. [ ] All manual test scenarios listed
9. [ ] All performance tests described
10. [ ] No contradictions with other plans
