# pre-sidebar-interactions-test — Test Specification

## Purpose

Verify the Sidebar & Session List interactions document correctly specifies every button, interaction, section behavior, context menu, sort order, and edge cases.

## Unit Tests

### "New" Button
- [ ] Verify New button position: top of sidebar, 16px from top
- [ ] Verify New button size: 32px × 32px square
- [ ] Verify New button behavior: opens Task Composer (same as ⌘+N)
- [ ] Verify New button tooltip: "New task (⌘+N)"
- [ ] Verify New button accessible via ⌘+Tab
- [ ] Verify New button disabled when app is not authenticated

### Section Headers (Sessions / History)
- [ ] Verify click section header toggles collapsed/expanded
- [ ] Verify arrow indicator: ▸ when collapsed, ▾ when expanded
- [ ] Verify count shows number of sessions in section (e.g., "Active (3)")
- [ ] Verify expand/collapse animation: 200ms slide animation

### Session Item States
- [ ] Verify left-click navigates to Session Detail
- [ ] Verify right-click opens context menu
- [ ] Verify hover shows right-click ghost hints + pin/unpin icon
- [ ] Verify active state: bold title, green dot, subtle highlight background
- [ ] Verify hover state: darker background (#2A2D35 on dark, #F0F0F0 on light)
- [ ] Verify selected state: highlight with accent color border (left, 3px)
- [ ] Verify disabled state: grayed out when session is loading

### Search Box
- [ ] Verify search box position: top right of sidebar, below New button
- [ ] Verify search box placeholder: "Search sessions..."
- [ ] Verify search icon: 🔍 left-aligned, inside input
- [ ] Verify clear button "×" appears when text is entered
- [ ] Verify search filters session list by title, description, surface content
- [ ] Verify search debounce: 200ms after no typing
- [ ] Verify ⌘+F focuses search, Escape clears it
- [ ] Verify matching text highlighted in search results
- [ ] Verify empty state: "No results found" when nothing matches

### Context Menu on Session Item
- [ ] Verify context menu options: Open, Duplicate, Rename, Archive, Delete, Copy URL, Pin Session, Hide Session
- [ ] Verify Open in Full View: navigates to session detail, no confirmation
- [ ] Verify Duplicate: creates new session with same title and surfaces, no confirmation
- [ ] Verify Rename: inline rename prompt, Enter saves, Escape cancels
- [ ] Verify Archive: moves session to History section, no confirmation
- [ ] Verify Delete: confirmation dialog "Delete permanently? This cannot be undone."
- [ ] Verify Copy Session URL: copies deep link, shows "Copied" toast
- [ ] Verify Pin Session: pins to top of active list, no confirmation
- [ ] Verify Hide Session: archives and hides from list, no confirmation

### Context Menu — Rename Flow
- [ ] Verify rename: title becomes inline text input
- [ ] Verify rename: input auto-resizes to text width
- [ ] Verify rename: Enter saves, shows "Session renamed" toast
- [ ] Verify rename: Escape reverts to original name, no save
- [ ] Verify rename: click outside saves
- [ ] Verify rename error: empty name → "Name cannot be empty"
- [ ] Verify rename error: >50 chars → "Name is too long"

### Context Menu — Delete Flow
- [ ] Verify delete: confirmation dialog appears
- [ ] Verify delete confirm: session deleted, "Session deleted" toast with "Undo" link
- [ ] Verify delete cancel: dialog dismisses, nothing changes
- [ ] Verify delete Firestore error: "Failed to delete session" toast
- [ ] Verify delete network offline: queued in IndexedDB, shown when online

### Context Menu Rendering
- [ ] Verify context menu matches the ASCII layout in the plan (separator lines between items)

### Active vs History Sections
- [ ] Verify Active section: sessions with status active/waiting/error (not archived)
- [ ] Verify Active section default: expanded
- [ ] Verify Active section sort: most recently updated, then pinned, then by creation
- [ ] Verify Active section: max 20 items shown (scrollable, loads more on scroll)
- [ ] Verify History section: sessions that are archived/done/hidden
- [ ] Verify History section default: collapsed
- [ ] Verify History section sort: most recently archived, then by creation
- [ ] Verify History section: shows "N archived" indicator when collapsed

### Session List Update Behavior
- [ ] Verify new surface pushed: session title gets update, timestamp refreshes, moves to top of list
- [ ] Verify session archived: moves from Active to History section
- [ ] Verify session renamed: title updates in real-time
- [ ] Verify session deleted: removed from both sections, toast shown
- [ ] Verify session duplicated: new session appears at top of Active with copied title
- [ ] Verify session pinned: moves to top of Active section
- [ ] Verify session unpinned: returns to normal sort position
- [ ] Verify network disconnect: list freezes, shows "Offline" badge in sidebar
- [ ] Verify network reconnect: list refreshes from Firestore, offline changes replayed

### Edge Cases
- [ ] Verify empty session list: "No sessions yet" with "Tell Claude to help you" prompt
- [ ] Verify session title too long: truncates with "..." in sidebar, full title in session detail
- [ ] Verify session with no surfaces: "(no surfaces)" next to title
- [ ] Verify session with many surfaces: "N surfaces" badge shown next to title
- [ ] Verify multiple sessions with same name: appends number (e.g., "Fix login bug (2)")
- [ ] Verify session name with special characters: displayed as-is, no truncation
- [ ] Verify session with emoji: emoji rendered in sidebar (e.g., "🟢 Fix the login bug")
- [ ] Verify sidebar collapse: all sessions hidden, only collapsed header visible; content area expands

### Cross-Plan Consistency
- [ ] Verify no contradictions with pre-session-detail-interactions.md (session detail nav)
- [ ] Verify no contradictions with pre-task-composer-detail.md (Task Composer integration)
- [ ] Verify no contradictions with pre-notification-system.md (toast notifications)
- [ ] Verify no contradictions with pre-state-management.md (session list persistence)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All sidebar button interactions are specified
2. [ ] All section header behaviors are described
3. [ ] All session item states and transitions are covered
4. [ ] All search box behaviors are described
5. [ ] All context menu options and flows are specified
6. [ ] All rename and delete flows are complete
7. [ ] All section behaviors (Active/History) are described
8. [ ] All session list update behaviors are covered
9. [ ] All edge cases are listed
10. [ ] No contradictions with other plans
