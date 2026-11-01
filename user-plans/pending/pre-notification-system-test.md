# pre-notification-system — Test Specification

## Purpose

Verify the notification system document correctly defines 3 notification types (macOS native, toast, banner), hierarchy (P0-P4), macOS notification payload and actions and permission flow, toast types/behavior/content/scenarios, banner types/behavior/scenarios, notification queuing, notification preferences, and edge cases.

## Unit Tests

### macOS Native Notifications
- [ ] Verify macOS notification request flow: request permission → grant → send
- [ ] Verify macOS notification permission denied: falls back to toast
- [ ] Verify macOS notification payload: title, body, subtitle, category actions
- [ ] Verify macOS notification actions: click, reply, buttons
- [ ] Verify macOS notification dismissal on click
- [ ] Verify macOS notification grouping (by app, by category)

### Toast Notifications
- [ ] Verify all toast types are described: info, success, warning, error, persistent
- [ ] Verify toast behavior: position (bottom-center), stacking (upward), max 4
- [ ] Verify toast content: message, action button (optional), duration
- [ ] Verify toast scenarios: task sent, surface pushed, process started, connection lost
- [ ] Verify toast auto-dismiss after duration (3s default, 6s errors)
- [ ] Verify toast action button opens related view (surface, session, settings)
- [ ] Verify toast undo: allows reversing a just-performed action (delete, archive)
- [ ] Verify toast retry: re-attempts a failed action (send, resume)

### Banner Notifications
- [ ] Verify all banner types are described: error, warning, info, connection
- [ ] Verify banner behavior: position (top of content area), dismissible, persistent
- [ ] Verify banner content: message, close button, action button (optional)
- [ ] Verify banner scenarios: surface push, connection lost, error state, maintenance
- [ ] Verify banner dismissal: click X dismisses, auto-dismiss for info banners
- [ ] Verify banner stacking: max 2 banners visible at once

### Notification Hierarchy (P0-P4)
- [ ] Verify P0 (Critical): connection loss, server error — all 3 notification types
- [ ] Verify P1 (Important): surface push, session update — macOS + toast
- [ ] Verify P2 (Normal): process update, surface complete — toast only
- [ ] Verify P3 (Low): minor UI update — toast only, non-blocking
- [ ] Verify P4 (Silent): analytics, debug — no notification

### Notification Queuing
- [ ] Verify notifications are queued when app is in background
- [ ] Verify notifications are queued when too many notifications are visible
- [ ] Verify queue overflow: oldest notification is dropped
- [ ] Verify notification throttling: same message within 5s is deduplicated

### Notification Preferences
- [ ] Verify per-type preference: enable/disable macOS, toast, banner
- [ ] Verify quiet hours: suppress all non-P0 notifications during quiet hours
- [ ] Verify quiet hours schedule: start time, end time
- [ ] Verify preference changes apply immediately (no restart needed)
- [ ] Verify preferences are synced to Firebase (cross-device)

### Error States
- [ ] Verify notification service unavailable: queue and retry
- [ ] Verify notification service timeout: fall back to toast
- [ ] Verify notification permission denied: log and use toast fallback
- [ ] Verify notification payload too large: truncate message

### Edge Cases
- [ ] Verify rapid notifications: throttled and deduplicated
- [ ] Verify notification during onboarding: restricted to onboarding-only
- [ ] Verify notification with no user session: no macOS notification, toast only
- [ ] Verify notification while surface is active: suppressed to avoid distraction
- [ ] Verify notification sync across devices: same preference, different display

### Cross-Plan Consistency
- [ ] Verify notification types match pre-settings-system.md (notification settings)
- [ ] Verify notification scenarios match pre-surface-lifecycle-states.md (surface events)
- [ ] Verify notification scenarios match pre-session-detail-interactions.md (session events)
- [ ] Verify notification scenarios match pre-help-palette-interactions.md (HelpPalette)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All 3 notification types (macOS, toast, banner) are correctly defined
2. [ ] All P0-P4 hierarchy levels are specified with notification channels
3. [ ] macOS notification payload and actions are described
4. [ ] Toast types, behavior, content, and scenarios are complete
5. [ ] Banner types, behavior, and scenarios are described
6. [ ] Notification queuing and throttling are described
7. [ ] Notification preferences and quiet hours are specified
8. [ ] No contradictions with other plans
