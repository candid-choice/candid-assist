# CI/CD & Deployment Pipeline

## Overview

Defines the CI/CD pipeline for Human Assist: build, test, and distribution of the desktop app, plus deployment of the backend.

## Pipeline Stages

```
Push to main
    → Lint
    → Type Check
    → Unit Tests
    → Integration Tests
    → Build (renderer + main)
    → Build (Electron app)
    → Sign & Notarize (macOS)
    → Create DMG
    → Deploy backend
    → Release
```

## Pipeline Configuration

| Stage | Tool | Timeout | Retry |
|-------|------|---------|-------|
| Lint | ESLint + Prettier | 30s | 0 |
| Type Check | tsc --noEmit | 30s | 0 |
| Unit Tests | vitest run | 60s | 1 |
| Integration Tests | playwright test | 120s | 1 |
| E2E Tests | playwright test | 180s | 0 |
| Build (renderer) | vite build | 60s | 1 |
| Build (Electron) | electron-builder | 120s | 1 |
| Sign & Notarize | Apple notarytool | 300s | 2 |
| Deploy backend | ssh/rsync to server | 60s | 0 |
| Release | Create GitHub release | 30s | 0 |

## Build Artifacts

| Artifact | Description | Upload |
|----------|-------------|--------|
| Human-Assist.dmg | macOS installer (DMG) | GitHub Releases |
| Human-Assist.dmg.blockmap | Delta update manifest | GitHub Releases |
| backend.tar.gz | Backend Docker image | Docker Hub |
| coverage.html | Code coverage report | GitHub Pages |
| test-results.xml | Test results XML | CI dashboard |

## Backend Deployment

### Deploy Process
1. Pull latest code from main branch
2. Install dependencies
3. Run tests
4. Build NestJS app
5. Deploy to production server
6. Restart PM2 process
7. Verify health check

### Deployment Target
| Property | Value |
|----------|-------|
| Server | DigitalOcean droplet (or similar) |
| Runtime | PM2 (Node.js process manager) |
| Domain | api.humanassist.dev |
| SSL | Let's Encrypt (nginx) |
| Database | Firebase Firestore (managed) |

### Rollback Process
1. `pm2 rollback human-assist`
2. `pm2 reload human-assist`
3. Verify health check

## Desktop App Release Process

### Release Types

| Type | Version | Channel |
|------|---------|---------|
| Major | 2.0.0 | All users |
| Minor | 1.1.0 | All users |
| Patch | 1.0.1 | All users |

### Signing & Notarization

| Step | Tool | Required |
|------|------|----------|
| Code sign | codesign | Yes |
| Notarize | notarytool | Yes |
| Staple | stapler | Recommended |

### Distribution

| Method | Platform | Notes |
|--------|----------|-------|
| DMG via GitHub Releases | All macOS | Manual download |
| Sparkle auto-update | All macOS | Automatic updates |
| External testing (TestFlight) | Not applicable | macOS app, not iOS |

## Release Checklist

| Item | Done | Notes |
|------|------|-------|
| All tests pass | ❌ | Unit, integration, E2E |
| Coverage threshold met | ❌ | >70% lines |
| DMG builds | ❌ | Sign, notarize |
| Backend deploys | ❌ | Health check passes |
| GitHub release created | ❌ | With changelog |
| Sparkle feed updated | ❌ | deltaUpdate=true |
| README updated | ❌ | With new features |
| CHANGELOG updated | ❌ | With all changes |

## Environment Management

| Environment | URL | Branch | Purpose |
|-------------|-----|--------|---------|
| Development | localhost:3000 | feature/* | Local development |
| Staging | staging.humanassist.dev | staging | QA testing |
| Production | api.humanassist.dev | main | Production |

## Monitoring

| Tool | What it tracks | Alert? |
|------|----------------|--------|
| Sentry | Errors, crashes | Yes |
| Prometheus | Metrics (CPU, memory, requests) | Yes |
| Grafana | Dashboards, alerts | Yes |
| Cloud Watch | Logs, metrics | No |
| Uptime Kuma | Health check endpoints | Yes |

## Rollback Criteria

| Condition | Action |
|-----------|--------|
| Error rate > 5% for 5 min | Auto-rollback |
| Health check fails for 30s | Auto-rollback |
| Crash rate > 10% | Manual rollback |
| Memory leak detected | Manual rollback |
| Database migration fails | Manual rollback |
