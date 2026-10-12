# pre-launch-checklist — Test Specification

## Purpose

Verify the launch checklist document correctly defines all pre-launch requirements across MCP server, surfaces, error handling, Firebase, IPC, HelpPalette, shortcuts, toasts, banners, dark mode, Retina, accessibility, offline, and restart/crash recovery.

## Unit Tests

### MCP Server
- [ ] Verify MCP server startup is described (port 3613, HTTP server)
- [ ] Verify MCP server health check is described
- [ ] Verify MCP server error handling is described
- [ ] Verify MCP server restart on crash is described

### Surfaces
- [ ] Verify all 6 surface types are listed in launch checklist
- [ ] Verify surface render pipeline is described
- [ ] Verify surface error handling is described
- [ ] Verify surface lifecycle states are described

### Error Handling
- [ ] Verify all error layers are listed (surface → session → backend → app)
- [ ] Verify error boundary components are described
- [ ] Verify error recovery flows are described
- [ ] Verify error logging is described

### Firebase
- [ ] Verify Firebase initialization is described
- [ ] Verify Firestore security rules are described
- [ ] Verify Firebase auth is described
- [ ] Verify Firebase storage is described

### IPC
- [ ] Verify IPC channels are listed
- [ ] Verify IPC security model is described (no eval, no evalJSON)
- [ ] Verify IPC error handling is described
- [ ] Verify IPC test coverage is described

### HelpPalette
- [ ] Verify HelpPalette is listed in launch checklist
- [ ] Verify HelpPalette keyboard shortcut (⌘+Shift+Space) is described
- [ ] Verify HelpPalette search functionality is described

### Shortcuts
- [ ] Verify all keyboard shortcuts are listed
- [ ] Verify shortcut conflicts are checked
- [ ] Verify shortcut scopes are described (Global, Surface, Text input)

### Toasts and Banners
- [ ] Verify toast system is described (position, duration, actions)
- [ ] Verify banner system is described (top, error/warning/success)
- [ ] Verify toast/banner queue management is described

### Dark Mode
- [ ] Verify dark mode is tested on all surfaces
- [ ] Verify dark mode is tested on all UI components
- [ ] Verify dark mode follows macOS system theme

### Retina
- [ ] Verify Retina display support is tested
- [ ] Verify image assets are Retina-ready (2x resolution)
- [ ] Verify canvas rendering is Retina-compatible

### Accessibility
- [ ] Verify keyboard navigation is tested
- [ ] Verify screen reader compatibility is described
- [ ] Verify high contrast mode is tested
- [ ] Verify focus management is described

### Offline
- [ ] Verify offline mode behavior is described
- [ ] Verify offline queue management is described
- [ ] Verify offline error states are described

### Restart/Crash Recovery
- [ ] Verify restart behavior is described (save state, restore state)
- [ ] Verify crash reporting is described (Sentry integration)
- [ ] Verify crash recovery dialog is described
- [ ] Verify recovered sessions/surfaces are described

### Cross-Plan Consistency
- [ ] Verify no contradictions with pre-launch-checklist-v2.md (consolidated version)
- [ ] Verify no contradictions with pre-desktop-app-architecture.md (shell)
- [ ] Verify no contradictions with pre-firebase-rules.md (security)
- [ ] Verify no contradictions with pre-crash-recovery.md (recovery)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All MCP server requirements are specified
2. [ ] All surface requirements are described
3. [ ] All error handling requirements are covered
4. [ ] All Firebase requirements are described
5. [ ] All IPC requirements are specified
6. [ ] All UI requirements (HelpPalette, shortcuts, toasts, banners, dark mode) are described
7. [ ] All accessibility requirements are covered
8. [ ] All offline and crash recovery requirements are described
9. [ ] No contradictions with other plans
