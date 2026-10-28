# pre-settings-interactions-test — Test Specification

## Purpose

Verify the Settings Screen interactions document correctly specifies section navigation, account settings, workspace settings, appearance settings, notification settings, connection section, save & back behavior, and edge cases.

## Unit Tests

### Section Navigation (Left Sidebar)
- [ ] Verify click section name scrolls to section and highlights it
- [ ] Verify click chevron ▸/▾ collapses/expands section content
- [ ] Verify active section has bold text and accent color indicator
- [ ] Verify Cmd+1 through Cmd+5 navigates between sections
- [ ] Verify all 6 sections are accessible: Account, Workspace, Appearance, Notifications, Connection, Advanced

### Account Section
- [ ] Verify avatar: circular image (48px), clickable for file picker
- [ ] Verify avatar: drag-and-drop supported, auto-scaled to 200×200
- [ ] Verify avatar max size: 5MB, formats: PNG, JPG, WebP
- [ ] Verify avatar errors: "Image too large" toast, "Unsupported format" toast
- [ ] Verify email: read-only, grayed-out text
- [ ] Verify "Change email" opens email verification flow
- [ ] Verify email verification: Firebase sends → user clicks link → email updated
- [ ] Verify email change inline error: "Invalid email"
- [ ] Verify email change success: "Verification email sent" toast
- [ ] Verify Sign out: shows confirmation dialog
- [ ] Verify Sign out dialog: "Are you sure... all unsaved changes lost"
- [ ] Verify Sign out confirm: clears keychain, navigates to Welcome, "Signed out" toast
- [ ] Verify Sign out error: "Failed to sign out" toast

### Workspace Section
- [ ] Verify code path: text field with current path, [Edit] button
- [ ] Verify Edit opens macOS folder picker
- [ ] Verify code path validation: must be existing directory
- [ ] Verify code path inline error: "Directory not found"
- [ ] Verify code path success: "Workspace saved" toast
- [ ] Verify code path: direct typing supported
- [ ] Verify code path: drag-and-drop folder onto field supported
- [ ] Verify Git URL: text field, auto-detected, manually editable
- [ ] Verify Git URL validation: must be valid URL format
- [ ] Verify Git URL inline error: "Invalid URL format"
- [ ] Verify Git URL success: "Git URL updated" toast
- [ ] Verify Claude setup: dropdown with CLI Mode / MCP Mode / Manual
- [ ] Verify Claude setup auto-detected on launch

### Appearance Section
- [ ] Verify Theme: Light / Dark / System radio buttons
- [ ] Verify Theme live preview (changes take effect immediately)
- [ ] Verify Theme saved to localStorage and synced to Firestore
- [ ] Verify System follows macOS system theme automatically
- [ ] Verify Font size: [− 14px +] with 1px steps
- [ ] Verify Font size min: 12px (− disabled at 12px)
- [ ] Verify Font size max: 18px (+ disabled at 18px)
- [ ] Verify Font size live preview
- [ ] Verify Sidebar width: slider, min 180px (Narrow), max 320px (Wide), default 240px
- [ ] Verify Sidebar width: live preview (sidebar resizes immediately)
- [ ] Verify Sidebar width labels: Narrow, Medium, Wide

### Notifications Section
- [ ] Verify Desktop notifications: checkbox ☑/☐, default enabled
- [ ] Verify First time: prompts macOS notification permission
- [ ] Verify Permission denied: checkbox shows "⚠ Permission denied"
- [ ] Verify Enable: requests permission, "Notifications enabled" toast
- [ ] Verify Disable: stops macOS notifications, "Notifications disabled" toast
- [ ] Verify Play sounds: checkbox ☑/☐, default disabled
- [ ] Verify Enable: system alert sound on surface push
- [ ] Verify Banner for active surfaces: checkbox ☑/☐, default enabled
- [ ] Verify Quiet hours: checkbox enables start/end time selectors
- [ ] Verify Quiet hours end time must be after start time (inline error)
- [ ] Verify Quiet hours: no notifications between start and end

### Connection Section
- [ ] Verify Claude status: green dot = connected, yellow = reconnecting, red = disconnected
- [ ] Verify Claude version shown if connected, "—" if not
- [ ] Verify MCP status: green dot = active, red dot = inactive (server not running)
- [ ] Verify MCP shows port number (3613)
- [ ] Verify Last seen: relative time format (minutes, hours, days)
- [ ] Verify Last seen offline: "never"
- [ ] Verify Test Connection: pings MCP server
- [ ] Verify Test Connection success: green checkmark, "Connection successful" toast
- [ ] Verify Test Connection failure: red X, "Connection failed" toast
- [ ] Verify Test Connection timeout: "Timed out after 5s"
- [ ] Verify Test Connection in-progress: "Testing..." spinner
- [ ] Verify View Logs: opens modal with last 100 log lines
- [ ] Verify View Logs: scrollable text area, copy button, close button

### Bottom Actions
- [ ] Verify Reset State: confirmation "Reset all local settings? This cannot be undone."
- [ ] Verify Reset State confirm: clears localStorage and IndexedDB, restarts app
- [ ] Verify Reset State error: "Failed to clear state" toast
- [ ] Verify Sign Out: confirmation "Sign out of Human Assist? All unsaved changes lost."
- [ ] Verify Sign Out confirm: signs out of Firebase, clears keychain, navigates to Welcome
- [ ] Verify Sign Out success: "Signed out" toast, Welcome screen shown
- [ ] Verify Sign Out error: "Failed to sign out" toast

### Save & Back Button
- [ ] Verify Save & Back saves all settings, navigates back to dashboard
- [ ] Verify Save saves to localStorage first, then syncs to Firestore
- [ ] Verify Cancel dismisses changes, navigates back without saving
- [ ] Verify Error: "Failed to save settings" toast
- [ ] Verify Loading: button shows spinner while saving
- [ ] Verify keyboard: Cmd+S to save, Escape to cancel

### Keyboard Shortcuts
- [ ] Verify Escape closes settings, goes back to dashboard
- [ ] Verify Cmd+S saves and closes
- [ ] Verify Cmd+W closes without saving
- [ ] Verify Tab moves between fields
- [ ] Verify Enter activates focused control

### Edge Cases
- [ ] Verify invalid workspace path: "Directory not found", "Edit" stays active
- [ ] Verify Git URL changes: "Git URL updated" toast, branch/combo auto-updated
- [ ] Verify network loss during save: "Failed to save — queued locally" toast
- [ ] Verify network restore: queued changes replay, "Settings saved" toast
- [ ] Verify concurrent edits: last write wins, "Settings updated" toast if remote changed
- [ ] Verify Firebase auth expires: redirect to sign-in, settings lost
- [ ] Verify workspace directory deleted: "Workspace deleted, please select a new one" dialog
- [ ] Verify settings too large: "Settings too large, please reduce" toast
- [ ] Verify invalid JSON in localStorage: reset to defaults, "Settings reset" toast
- [ ] Verify first-time user: some settings grayed out until onboarding completes

### Cross-Plan Consistency
- [ ] Verify no contradictions with pre-settings-system.md (settings schema)
- [ ] Verify no contradictions with pre-notification-system.md (notification behavior)
- [ ] Verify no contradictions with pre-state-management.md (settings persistence)
- [ ] Verify no contradictions with pre-onboarding-flow-detail.md (first-time user)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All section navigation behaviors specified
2. [ ] All account section controls described
3. [ ] All workspace section controls described
4. [ ] All appearance section controls described
5. [ ] All notification section controls described
6. [ ] All connection section controls described
7. [ ] All bottom actions specified with confirmation dialogs
8. [ ] All save & back behaviors described
9. [ ] All keyboard shortcuts described
10. [ ] All edge cases covered
11. [ ] No contradictions with other plans
