# pre-code-diff-interactions — Test Specification

## Purpose

Verify the CodeDiffSurface interaction plan correctly specifies every button, inline comment, approve, request changes flow.

## Unit Tests

### Header — File Changed Summary
- [ ] Verify "2 files changed · 14 additions · 3 deletions" is displayed
- [ ] Verify stats update when file is approved/expanded

### Header — Archive Button
- [ ] Verify Archive removes diff from active view
- [ ] Verify diff remains in session history
- [ ] Verify no confirmation needed
- [ ] Verify "Diff archived" toast (2s)

### Header — Approve & Merge Button
- [ ] Verify approves all files immediately
- [ ] Verify all file status badges turn green
- [ ] Verify "All changes approved" toast (3s)
- [ ] Verify footer button becomes same as header button
- [ ] Verify always available in header

### Footer — Notes Text Area
- [ ] Verify placeholder text is shown
- [ ] Verify auto-save every 2 seconds to IndexedDB
- [ ] Verify character limit: 5000 characters
- [ ] Verify auto-grow up to 150px max height

### Footer — Approve & Merge Button
- [ ] Verify validates feedback text is not empty before approve
- [ ] Verify empty text shows inline error: "Please enter your review feedback"
- [ ] Verify button shows "Sending..." with spinner
- [ ] Verify success shows "✓ Approved" (green), toast: "All changes approved" (3s)
- [ ] Verify all file badges turn green after approve
- [ ] Verify button reverts to "Approve & Merge" after 2 seconds
- [ ] Verify network error shows "Failed to send — queued locally" (6s)
- [ ] Verify 30s timeout disables button
- [ ] Verify sends { decision: "approved", comments: [...] } to Claude

### Footer — Request Changes Button
- [ ] Verify validates feedback text is not empty before request
- [ ] Verify empty text shows inline error: "Please describe what needs changing"
- [ ] Verify button shows "Sending..." with spinner
- [ ] Verify success shows "✓ Changes sent" (orange), toast: "Changes sent" (3s)
- [ ] Verify files with comments turn yellow after request
- [ ] Verify button reverts to "Request Changes" after 2 seconds
- [ ] Verify network error shows "Failed to send — queued locally" (6s)
- [ ] Verify 30s timeout disables button
- [ ] Verify sends { decision: "changes", comments: [...] } to Claude

### File List — Expand/Collapse
- [ ] Verify click expands/collapses file diff
- [ ] Verify ▸ indicates collapsed, ▾ indicates expanded
- [ ] Verify content shows "Collapsed diff content — click to expand" when collapsed
- [ ] Verify expanded content shows line-by-line diff with green/red highlighting

### Inline Annotate (Click on Line)
- [ ] Verify clicking a line opens comment input on that line
- [ ] Verify comment attached to line is sent to Claude
- [ ] Verify comment is included in approve/request changes
- [ ] Verify remove comment with "×" button
- [ ] Verify max 100 comments per file
- [ ] Verify empty comment shows inline error: "Comment cannot be empty"

### Inline Diff View
- [ ] Verify added lines are highlighted in green
- [ ] Verify removed lines are highlighted in red
- [ ] Verify unchanged lines are in gray
- [ ] Verify side-by-side view shows added on right, removed on left
- [ ] Verify unified view shows single view with green/red
- [ ] Verify toggle button in toolbar: [Side-by-side | Unified]
- [ ] Verify preference saved to localStorage
- [ ] Verify default is unified view

### File Status Badge
- [ ] Verify green 🟢 means all changes approved
- [ ] Verify yellow 🟡 means changes requested
- [ ] Verify white ⚪ means unreviewed
- [ ] Verify badge changes when file is approved
- [ ] Verify badge changes when file is requested for changes

### Surface Lifecycle
- [ ] Verify Active → Active: click to expand/collapse, add comments
- [ ] Verify Active → Responding: user clicks Approve or Request Changes
- [ ] Verify Responding → Complete: Claude processes, shows "✓ Sent"
- [ ] Verify Active → Minimized: new surface pushed
- [ ] Verify Active → Dismissed: close [✕] or 30min timeout
- [ ] Verify Active → Archived: user clicks Archive

### Keyboard Shortcuts
- [ ] Verify Enter submits approve (if feedback text present)
- [ ] Verify ⌘+Enter submits even if empty
- [ ] Verify Escape closes surface
- [ ] Verify ⌘+↑ scrolls to top of diff
- [ ] Verify ⌘+↓ scrolls to bottom of diff
- [ ] Verify ⌘+F finds in diff
- [ ] Verify ⌘+T toggles side-by-side/unified view

### Error States
- [ ] Verify diff fails to parse → "Failed to render diff" overlay with [Retry]
- [ ] Verify invalid diff format → "Malformed diff" error
- [ ] Verify file not found → "File not found" error
- [ ] Verify network error → "Failed to send — queued" toast

### Toast Messages
- [ ] Verify "All changes approved" (3s)
- [ ] Verify "Changes sent" (3s)
- [ ] Verify "Comment added" (1s)
- [ ] Verify "Diff archived" (2s)
- [ ] Verify "Surface closed" (2s)
- [ ] Verify "Failed to send — queued locally" (6s)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] Every chrome button has a behavior description
2. [ ] Every file control has a behavior description
3. [ ] Every footer button has a behavior description
4. [ ] All inline annotate behaviors are described
5. [ ] All keyboard shortcuts are listed
6. [ ] Surface lifecycle transitions are correct
7. [ ] Close [✕] sends { completed: false } to Claude
8. [ ] All error states are described
9. [ ] All toast messages are specified with duration
10. [ ] Inline annotate sends comments with approve/request
