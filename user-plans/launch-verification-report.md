# Launch Checklist — Verification Report

**Date:** 2026-10-27 · **Branch:** `feature/agent-browser-control`
**Audits:** `pre-launch-checklist.md`, `pre-launch-checklist-v2.md` (consolidated coverage below)

Legend: ✅ verified · ⚠️ partial/documented gap · ❌ not done (accepted for pre-beta)

## Desktop App (Electron)
- ✅ Electron main/preload/renderer split, contextIsolation + sandbox, no nodeIntegration
- ✅ Frameless shell with custom titlebar (WindowShell), traffic-light insets, min/max/close IPC
- ✅ Embedded `<webview>` guests with host-allowlist navigation + external-popup policy
- ✅ Tray icon — ❌ not implemented (accepted gap; window-only app today)
- ⚠️ Code signing / notarization — unsigned local builds; electron-builder config in place (`mac: dir`); signing requires Apple Developer ID (external prerequisite)
- ✅ Auto-update: electron-updater wrapper (packaged-only), Settings ▸ About check button, MCP `checkForUpdates`, toast prompts (Sparkle-flow analogue)
- ✅ Single-instance lock (second launch focuses existing window)
- ✅ Crash recovery: ErrorBoundary + CrashRecovery screen + error hierarchy + escalation banners

## Auth & Sessions
- ✅ Firebase Auth (email + Google) with emulator support (`VITE_FIREBASE_*`)
- ✅ AuthGuard verifies ID tokens; 401 on bad/missing token (live smoke verified)
- ✅ Session CRUD (create/rename/archive/delete) + surface history append
- ✅ Offline-first: IndexedDB persistence (zustand persist) + offline queue with replay executor on reconnect
- ✅ Sign-out clears tokens (auth-storage), sessions unmount cleanly

## Surface Delivery (MCP)
- ✅ All surface types: Browser, Canvas, Image, ScreenCapture, CodeDiff, Terminal, Input, **ProcessManager** (8 types; superset of the plan's 6)
- ✅ Pipeline: agent → WS MCP (:43179) [+ legacy HTTP :3615] → broadcast → store → routed components
- ✅ Response round-trip → session history (Phase 8c), embedded surface records
- ✅ 30-min surface timeout + cleanup; 10-surface cap (MCP_002)
- ✅ Validation codes MCP_001–019 incl. size limits (URL/prompt/diff/command/output)
- ✅ Human handoff for CAPTCHAs/verifications with lock + Done release
- ✅ Harness-session recording (1:1 coding-session ⇄ app session, footer harness id)

## Backend / Firestore
- ✅ NestJS modules (auth, firebase, session, surface, health) + REST
- ✅ Rules: auth-required, user-scoped reads/writes (`firestore.rules`)
- ⚠️ Live Firestore listeners — pull-sync + replay instead (documented)

## Onboarding & UX
- ✅ OnboardingWizard (MCP setup steps, copyable config), HelpPalette (⌘K), toasts, context menus, dark theme (store-backed), keyboard shortcuts
- ✅ Connection presence: footer MCP indicator (true WS state) + per-agent harness badge

## Testing Requirements
- ✅ 44 desktop tests (MCP protocol, validation, browser tools, handoff, process registry)
- ✅ 198 renderer tests (store, surfaces, containers, sync, ws-service, tabs, badges, toasts)
- ✅ Live smoke: full stack + authed CRUD + surface E2E (see implementation-status history)
- ✅ CI restored: `.github/workflows/ci.yml` (desktop tests+build, backend build, web build)

## Go-Live Criteria (status)
- ✅ Core loop (agent ⇄ app) reliable with reconnect/backoff
- ✅ Security baseline (sandbox, isolated bridge, token verification, loopback-only MCP binds)
- ⚠️ Telemetry/crash reporting — local logs only (accepted for beta)
- ⚠️ Signed & notarized macOS build — needs Apple Developer ID (external)
- ✅ Update mechanism implemented (electron-updater)
- ⚠️ Load/soak testing — unstarted (pre-GA item)

## Accepted gaps for beta (explicit)
1. Code signing + notarization (external Apple prerequisite)
2. Tray icon
3. Remote crash reporting/telemetry
4. Firestore live listeners (pull-sync adequate today)
5. Soak/load testing before GA

**Verdict:** checklist complete for **internal beta**; items 1–5 are the GA gate.
