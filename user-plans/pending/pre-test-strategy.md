# Test Strategy

## Overview

Defines the testing approach for Human Assist across all layers: renderer, main process, backend, and integration.

## Test Layers

| Layer | Tool | Scope | Coverage Target |
|-------|------|-------|-----------------|
| Unit | Vitest | Components, hooks, utilities, validation | 80% |
| Integration | Playwright | Surface render pipeline, IPC flow | 50% |
| E2E | Playwright | Full user journey: login → onboarding → dashboard | 20% |
| Component | Storybook | Surface components, shell components | All components |
| Contract | OpenAPI + mock | Backend API contracts | All endpoints |

## Unit Tests

### Renderer (React)

| What | Tool | Pattern |
|------|------|---------|
| Components | Vitest + React Testing Library | Render, query, interact, assert |
| Hooks | Vitest + @testing-library/react-hooks | Call hook, assert state |
| State | Vitest | Create store, dispatch, assert state |
| IPC | Vitest + vi.mock | Mock IPC calls, assert behavior |

### Main Process (Electron)

| What | Tool | Pattern |
|------|------|---------|
| MCP server | Vitest | Start/stop MCP, assert behavior |
| IPC handlers | Vitest | Send IPC, assert result |
| Error handling | Vitest | Trigger error, assert recovery |

### Backend (NestJS)

| What | Tool | Pattern |
|------|------|---------|
| Controllers | Jest | HTTP request, assert response |
| Services | Jest | Call service, assert behavior |
| DTOs | Jest | Validate, assert errors |

### Integration Tests

| What | Tool | Scenario |
|------|------|----------|
| Surface pipeline | Playwright | Tool call → surface render |
| Auth flow | Playwright | Sign in → onboarding → dashboard |
| Offline mode | Playwright | Disconnect → queue → reconnect → replay |
| Surface lifecycle | Playwright | Push → active → respond → complete |

## E2E Tests

### Critical Paths

1. **Sign in → Onboarding → Dashboard**
   - User signs in with Google
   - User completes onboarding
   - User sees empty dashboard

2. **Task Composer → Surface**
   - User opens Task Composer (⌘+N)
   - User types task, clicks Send
   - Surface appears in content area
   - User submits response
   - Surface completes

3. **Surface Lifecycle**
   - Surface pushed
   - Surface becomes Active
   - User interacts with surface
   - User submits response
   - Surface becomes Complete

4. **Error Recovery**
   - Network disconnects
   - User sees banner
   - Network restores
   - Actions replay

## Component Tests (Storybook)

| Component | Variants |
|-----------|----------|
| Surface chrome | active, minimized, error |
| Surface footer | submit, send, approve, disabled |
| Toast | success, error, warning, info |
| Banner | error, warning, info, success |
| Sidebar | collapsed, expanded |
| Session item | active, archived, error |
| Help Palette | keyboard shortcuts, about |

## Test Data

### Mock Data
| Type | Data |
|------|------|
| User | `{ id: "user_abc", email: "test@example.com" }` |
| Session | `{ id: "sess_abc", title: "Test Session" }` |
| Surface | `{ id: "surf_abc", type: "browser", url: "https://example.com" }` |
| Notification | `{ id: "msg_abc", type: "surface", message: "New surface" }` |

### Mock Server
| Purpose | Tool |
|---------|------|
| MCP server mock | Node.js HTTP server |
| Backend API mock | NestJS microservice |
| WebSocket mock | WS library |

## Test Configuration

### Environment Variables

| Variable | Test Value | Production Value |
|----------|-----------|-----------------|
| FIREBASE_API_KEY | test-key | real-key |
| FIREBASE_PROJECT_ID | test-project | human-assist |
| BACKEND_URL | http://localhost:3000 | https://api.humanassist.dev |
| MCP_PORT | 3613 | 3613 |

### CI Pipeline

| Stage | Action | Tool |
|--------|--------|------|
| Lint | ESLint + Prettier | CI |
| Type check | TypeScript compiler | CI |
| Unit tests | Vitest | CI |
| Component tests | Storybook | CI |
| Integration tests | Playwright | CI |
| E2E tests | Playwright | CI |
| Build | Vite/Electron builder | CI |
| Bundle | DMG creation | CI |

## Coverage Thresholds

| Metric | Threshold |
|--------|-----------|
| Lines | >70% |
| Branches | >60% |
| Functions | >80% |
| Statements | >75% |

## Manual Test Scenarios

| Scenario | Steps |
|----------|-------|
| Surface timeout | Open surface, wait 30min, verify auto-close |
| Max surfaces | Push 12 surfaces, verify only 10 open |
| Offline recovery | Disconnect, queue actions, reconnect, verify replay |
| App crash recovery | Kill process, restart, verify restore dialog |
| Dark mode | Toggle system theme, verify UI adapts |
| Multiple monitors | Move window to second monitor, verify surfaces span |
| Screen capture | Request capture, verify macOS permission dialog |

## Performance Tests

| Metric | Target | Tool |
|--------|--------|------|
| Cold start | <2s | Electron test harness |
| Surface render | <2s | Playwright performance API |
| IPC latency | <5ms | Custom benchmark |
| WebSocket reconnect | <3s | Manual test |
| Session list render | <100ms (20 items) | Storybook |
