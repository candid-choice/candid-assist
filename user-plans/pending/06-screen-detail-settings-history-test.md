# 06-Screen-Detail-Settings-History — Test Specification

## Purpose

Verify the session detail, settings, and history screens are complete and all interactions are specified.

## Unit Tests

### Session Detail View
- [ ] Verify header with back button, session title (editable), status badge, timestamps
- [ ] Verify timeline with Claude's actions and user responses
- [ ] Verify surface resume button behavior ("Resume Active Surface →")
- [ ] Verify stop Claude button behavior ("Stop Claude →")
- [ ] Verify stop Claude confirmation dialog
- [ ] Verify right-click context menu on session (duplicate, archive, delete, rename)
- [ ] Verify surface resume opens the surface in full view
- [ ] Verify stop Claude sends { completed: false } to Claude

### Settings View
- [ ] Verify Account section: avatar, email, sign-in method, change email, sign out
- [ ] Verify Workspace section: code path (folder picker), git URL, Claude setup dropdown
- [ ] Verify Appearance section: theme (Light/Dark/System), font size, sidebar width
- [ ] Verify Notifications section: desktop notifications, sounds, banners, quiet hours
- [ ] Verify Connection section: Claude status, MCP status, last seen, test connection, view logs
- [ ] Verify Save & Back button (top-right) behavior
- [ ] Verify Settings sidebar navigation (click section names)
- [ ] Verify all settings fields have save/validate/cancel behavior

### History View
- [ ] Verify session list grouped by time (Today, Yesterday, Last 7 days)
- [ ] Verify session status indicators (green for active, checkmark for done)
- [ ] Verify click on history session opens session detail (read-only)
- [ ] Verify search functionality (filters by title, description, surface content)
- [ ] Verify filter functionality (status, date range, tags)
- [ ] Verify right-click context menu on history entries (rename, duplicate, archive, delete)
- [ ] Verify "Clear completed" confirm dialog
- [ ] Verify virtualized list loads 20 at a time

### Notifications Panel
- [ ] Verify notification panel slides from right
- [ ] Verify each notification has Open/Dismiss buttons
- [ ] Verify notification types (surface push, surface complete, session complete)
- [ ] Verify "Clear All" confirm dialog
- [ ] Verify notification grouping by date (Today, Yesterday)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] Session detail has all described interactions
2. [ ] Settings has all described sections and behaviors
3. [ ] History has all described interactions
4. [ ] All buttons have behavior descriptions
5. [ ] Confirmation dialogs are described
6. [ ] Toast notifications are described for each action
7. [ ] All error states are described
