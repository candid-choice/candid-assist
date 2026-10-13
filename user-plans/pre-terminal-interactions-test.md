# pre-terminal-interactions-test — Test Specification

## Purpose

Verify the Terminal Surface interactions document correctly specifies the full surface layout, content area behavior, search behavior, footer controls, close button, keyboard shortcuts, lifecycle, and error states.

## Unit Tests

### Full Surface Layout
- [ ] Verify Terminal surface shows: title bar with "Terminal", minimize/maximize/close buttons
- [ ] Verify Terminal surface shows: command line display (e.g., "npm test")
- [ ] Verify Terminal surface shows: command output area (scrollable)
- [ ] Verify Terminal surface shows: footer with action buttons

### Terminal Content Area
- [ ] Verify scroll: full scroll history of command output
- [ ] Verify search: filter lines by text, highlights matching lines
- [ ] Verify live updates: new lines appear as command progresses
- [ ] Verify auto-scroll: scrolls to bottom when new output arrives
- [ ] Verify manual scroll: user can scroll up (auto-scroll pauses)
- [ ] Verify copy all: select all text → Cmd+C copies to clipboard
- [ ] Verify select text: standard text selection for copying individual lines
- [ ] Verify line numbers: optional, shown if enabled in settings
- [ ] Verify color output: preserves ANSI color codes (green=pass, red=fail)

### Search Behavior
- [ ] Verify trigger: press Cmd+F
- [ ] Verify search box appears at top-right of terminal
- [ ] Verify search filters visible lines, highlights matches
- [ ] Verify case-sensitive: default case-insensitive
- [ ] Verify clear: press Escape or click X to clear
- [ ] Verify results count: shows "N matches" in search box
- [ ] Verify navigate: Cmd+G goes to next match, Cmd+Shift+G goes to previous
- [ ] Verify no match: shows "No results found" message

### Footer Controls — Send to Claude
- [ ] Verify "Send to Claude →" sends terminal output to Claude
- [ ] Verify before submit: validates terminal has content
- [ ] Verify empty output: inline error "No output to send"
- [ ]Verify after submit: button shows "Sending..." with spinner
- [ ] Verify success: button changes to "✓ Sent" (green), toast "Sent to Claude"
- [ ] Verify payload: sends terminal text content to Claude
- [ ] Verify timeout: button disabled after 30s
- [ ] Verify error: "Failed to send — queued locally" toast

### Footer Controls — Copy
- [ ] Verify "Copy →" copies terminal output to clipboard
- [ ] Verify copies all terminal text output
- [ ] Verify after copy: shows "Copied to clipboard" toast
- [ ] Verify error: "Failed to copy" toast (rare)

### Footer Controls — Re-run
- [ ] Verify "Re-run Test →" restarts the last command
- [ ] Verify re-executes command that produced the output
- [ ] Verify new output appears in same terminal area
- [ ] Verify old output cleared before re-run
- [ ] Verify after re-run: terminal shows new output, scroll goes to bottom
- [ ] Verify error: "Failed to re-run" toast if command not available

### Close Button
- [ ] Verify close [X] closes the terminal surface
- [ ] Verify close sends { completed: false } to Claude
- [ ] Verify close: no confirmation dialog
- [ ] Verify close: surface removed from active view
- [ ] Verify close toast: "Surface closed"

### Keyboard Shortcuts
- [ ] Verify Enter: send to Claude
- [ ] Verify Cmd+Enter: send even if empty
- [ ] Verify Escape: close surface
- [ ] Verify Cmd+F: search terminal
- [ ] Verify Cmd+G: next match (in search)
- [ ] Verify Cmd+Shift+G: previous match (in search)
- [ ] Verify Cmd+C: copy selected text (or all if nothing selected)
- [ ] Verify Cmd+A: select all text
- [ ] Verify Cmd+R: re-run command
- [ ] Verify Cmd+Up: scroll to top
- [ ] Verify Cmd+Down: scroll to bottom
- [ ] Verify Home: scroll to top
- [ ] Verify End: scroll to bottom
- [ ] Verify Page Up: scroll up one page
- [ ] Verify Page Down: scroll down one page

### Surface Lifecycle
- [ ] Verify Active → Active: scroll, search, copy text
- [ ] Verify Active → Responding: user clicks "Send to Claude"
- [ ] Verify Responding → Complete: Claude processes response
- [ ] Verify Active → Complete: processManager-like behavior (actions are immediate)
- [ ] Verify Active → Minimized: new surface pushed
- [ ] Verify Active → Dismissed: user clicks close [X]
- [ ] Verify Active → Dismissed: 30min timeout

### Error States
- [ ] Verify command not available: "Command not found" message
- [ ] Verify error recovery: user re-runs or sends empty output
- [ ] Verify network error: "Failed to send — queued" toast
- [ ] Verify error recovery: auto-retry on reconnect
- [ ] Verify output too large: "Output truncated to 10000 chars" message
- [ ] Verify error recovery: user can scroll to see more

### Cross-Plan Consistency
- [ ] Verify search behavior matches pre-settings-system.md (search shortcuts)
- [ ] Verify footer controls match pre-surface-components.md (footer specs)
- [ ] Verify lifecycle matches pre-surface-lifecycle-states.md (lifecycle states)
- [ ] Verify error states match pre-notification-system.md (toast messages)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All content area behaviors specified (scroll, search, live updates, copy)
2. [ ] All search behaviors described (trigger, filter, navigate, clear)
3. [ ] All footer controls specified with exact behaviors
4. [ ] Close button behavior described ({ completed: false }, no confirm)
5. [ ] All 15 keyboard shortcuts listed
6. [ ] All lifecycle transitions accurate
7. [ ] All error states with recovery actions
8. [ ] No contradictions with other plans
