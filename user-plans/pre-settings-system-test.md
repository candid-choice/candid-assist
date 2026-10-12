# pre-settings-system-test — Test Specification

## Purpose

Verify the Settings System document correctly defines settings groups, all setting schemas, save behavior, validation rules, migration rules, and edge cases.

## Unit Tests

### Settings Groups
- [ ] Verify 6 settings groups: Profile, Workspace, Appearance, Surfaces, Notifications, Advanced
- [ ] Verify each group has location (Settings → Group)
- [ ] Verify each group has access method (click sidebar Settings)

### Profile Settings
- [ ] Verify Name: string type, default from Firebase profile
- [ ] Verify Email: string type, default from Firebase profile, read-only
- [ ] Verify Photo URL: string type, default from Firebase profile
- [ ] Verify Timezone: string type, default system default, for timestamps

### Workspace Settings
- [ ] Verify Workspace path: string, default detected
- [ ] Verify Git URL: string, default auto-detected
- [ ] Verify Git branch: string, default current branch
- [ ] Verify MCP port: number, default 3613
- [ ] Verify Surface timeout: number, default 30 (minutes)
- [ ] Verify Max surfaces: number, default 10

### Appearance Settings
- [ ] Verify Theme: dark/light/system, default system
- [ ] Verify Color scheme: blue/green/purple, default blue
- [ ] Verify Font size: 12/14/16, default 14
- [ ] Verify Compact mode: boolean, default false
- [ ] Verify Minimize to tray: boolean, default true

### Surface Settings
- [ ] Verify Auto minimize: boolean, default true
- [ ] Verify Show surface count: boolean, default true
- [ ] Verify Surface animations: boolean, default true
- [ ] Verify Auto close complete: boolean, default false
- [ ] Verify Default surface width: number, default 800px

### Notification Settings
- [ ] Verify Surface notifications: boolean, default true
- [ ] Verify Session notifications: boolean, default false
- [ ] Verify Sound: boolean, default false
- [ ] Verify Quiet hours: off, default off

### Advanced Settings
- [ ] Verify Enable crash reporting: boolean, default true
- [ ] Verify Enable analytics: boolean, default false
- [ ] Verify Reset state: button type
- [ ] Verify Sign out: button type
- [ ] Verify Delete workspace cache: button type

### Settings Save Behavior
- [ ] Verify Profile: saved to localStorage, synced to Firestore (profile)
- [ ] Verify Workspace: saved to localStorage, synced to Firestore (workspace)
- [ ] Verify Appearance: saved to localStorage only, not synced
- [ ] Verify Surfaces: saved to localStorage only, not synced
- [ ] Verify Notifications: saved to localStorage, synced to Firestore (notifications)
- [ ] Verify Advanced: saved to localStorage only, not synced

### Settings Validation
- [ ] Verify Workspace path: must exist, must be directory, error "Invalid workspace path"
- [ ] Verify MCP port: must be 3613-3662, not in use, error "Port already in use"
- [ ] Verify Surface timeout: must be 5-180 minutes, error "Invalid timeout value"
- [ ] Verify Max surfaces: must be 1-20, error "Invalid max surfaces"
- [ ] Verify Default width: must be 400-1920, error "Invalid width"

### Settings Migration
- [ ] Verify 0.x → 1.0: migrate old settings to new schema
- [ ] Verify 1.0 → 1.1: add new settings with defaults
- [ ] Verify Any → Any: preserve user's settings on update

### Settings Screen Layout
- [ ] Verify left sidebar with all 6 sections
- [ ] Verify each section has its own content area
- [ ] Verify all controls match schema definitions
- [ ] Verify save/reset/sign-out buttons at bottom

### Edge Cases
- [ ] Verify invalid workspace: show error, prompt to select new workspace
- [ ] Verify port conflict: auto-find next available port
- [ ] Verify settings sync conflict: last write wins, toast "Settings updated"
- [ ] Verify sign out: clear all local settings, sign out of Firebase
- [ ] Verify reset state: clear all local state, restart app
- [ ] Verify delete workspace cache: clear cached workspace data, keep settings

### Cross-Plan Consistency
- [ ] Verify no contradictions with pre-settings-interactions.md (interactions)
- [ ] Verify no contradictions with pre-state-management.md (persistence)
- [ ] Verify no contradictions with pre-workspace-config.md (workspace settings)
- [ ] Verify no contradictions with pre-launch-checklist-v2.md (settings on launch)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All 6 settings groups are defined with correct schemas
2. [ ] All save behaviors (localStorage + Firestore) are described
3. [ ] All validation rules are accurate
4. [ ] All migration rules are described
5. [ ] All edge cases covered
6. [ ] Settings screen layout matches schema
7. [ ] No contradictions with other plans
