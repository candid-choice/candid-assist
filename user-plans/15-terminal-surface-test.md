# 15-TerminalSurface — Test Specification

## Purpose

Verify every interactive element on the TerminalSurface has a behavior specification. This covers terminal output viewing and sending output back to Claude.

## Unit Tests

### Terminal Content Area
- [ ] Verify scrollable terminal stream with full scroll history
- [ ] Verify command output is rendered (parsed, text-based)
- [ ] Verify scrollable with full history of command output
- [ ] Verify search filters lines by text, highlights matches
- [ ] Verify send to Claude sends terminal output back to Claude as text
- [ ] Verify copy copies terminal output to clipboard
- [ ] Verify re-run restarts the last command
- [ ] Verify new output appears in same view after re-run
- [ ] Verify old output is cleared before re-run

### Terminal Output Area
- [ ] Verify command is displayed at top (e.g., "npm test")
- [ ] Verify separator line separates command from output
- [ ] Verify output lines are rendered with color (green=pass, red=fail)
- [ ] Verify output lines are selectable (click-drag to select text)
- [ ] Verify terminal content scrolls automatically when new output arrives
- [ ] Verify manual scroll pauses auto-scroll
- [ ] Verify line numbers are optional (controlled by settings)
- [ ] Verify ANSI color codes are preserved and rendered

### Search Behavior
- [ ] Verify ⌘+F opens search box at top-right of terminal
- [ ] Verify search filters visible lines, highlights matches
- [ ] Verify case-insensitive by default
- [ ] Verify Escape or × clears search
- [ ] Verify "N matches" shown in search box
- [ ] Verify ⌘+G goes to next match
- [ ] Verify ⌘+Shift+G goes to previous match
- [ ] Verify "No results found" message when no matches
- [ ] Verify search is cleared when terminal is cleared

### Footer — Notes Text Area
- [ ] Verify placeholder text is shown
- [ ] Verify auto-save every 2 seconds to IndexedDB
- [ ] Verify character limit (5000 chars)
- [ ] Verify auto-grow up to 150px max height
- [ ] Verify X button clears text
- [ ] Verify empty text shows inline error on send

### Footer — Send to Claude → Button
- [ ] Verify sends terminal output to Claude
- [ ] Verify validates terminal has content before send
- [ ] Verify empty output shows inline error: "No output to send"
- [ ] Verify button shows "Sending..." with spinner
- [ ] Verify success shows "✓ Sent" (green) and "Sent to Claude" toast
- [ ] Verify button reverts to "Send to Claude →" after 2 seconds
- [ ] Verify network error shows "Failed to send — queued locally" toast
- [ ] Verify 30s timeout disables button

### Footer — Copy → Button
- [ ] Verify copies terminal output to clipboard
- [ ] Verify copies all terminal text output
- [ ] Verify "Copied to clipboard" toast appears
- [ ] Verify "Failed to copy" toast (rare failure)

### Footer — Re-run Test → Button
- [ ] Verify restarts the last command
- [ ] Verify re-executes the command that produced the output
- [ ] Verify new output appears in same terminal area
- [ ] Verify old output is cleared before re-run
- [ ] Verify terminal shows new output
- [ ] Verify scroll goes to bottom
- [ ] Verify "Failed to re-run" toast if command not available

### Footer — Close [✕] Button
- [ ] Verify closes the terminal surface
- [ ] Verify sends { completed: false } to Claude
- [ ] Verify no confirmation dialog
- [ ] Verify removes surface from active view
- [ ] Verify "Surface closed" toast appears

### Keyboard Shortcuts
- [ ] Verify Enter sends to Claude
- [ ] Verify ⌘+Enter sends even if empty
- [ ] Verify Escape closes surface
- [ ] Verify ⌘+F searches terminal
- [ ] Verify ⌘+G next match (in search)
- [ ] Verify ⌘+Shift+G previous match (in search)
- [ ] Verify ⌘+C copies selected text (or all if nothing selected)
- [ ] Verify ⌘+A selects all text
- [ ] Verify ⌘+R re-runs command
- [ ] Verify ⌘+↑ scrolls to top
- [ ] Verify ⌘+↓ scrolls to bottom
- [ ] Verify Home scrolls to top
- [ ] Verify End scrolls to bottom
- [ ] Verify Page Up scrolls up one page
- [ ] Verify Page Down scrolls down one page

### Error States
- [ ] Verify command not available → "Command not found" message
- [ ] Verify user re-runs or sends empty output as recovery
- [ ] Verify output too large → "Output truncated to 10000 chars" message
- [ ] Verify user can scroll to see more
- [ ] Verify network error → "Failed to send — queued" toast
- [ ] Verify auto-retry on reconnect

### Toast Messages
- [ ] Verify "Sent to Claude" (3s)
- [ ] Verify "Copied to clipboard" (2s)
- [ ] Verify "Failed to send — queued locally" (6s)
- [ ] Verify "Command not found" (6s)
- [ ] Verify "Output truncated" (4s)
- [ ] Verify "Surface closed" (2s)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All terminal content behaviors are described
2. [ ] All footer buttons have behavior descriptions
3. [ ] All keyboard shortcuts are listed
4. [ ] Search behavior is complete
5. [ ] Surface lifecycle is correct (Active → Responding → Complete)
6. [ ] Close [✕] sends { completed: false } to Claude
7. [ ] All error states are described
8. [ ] All toast messages are specified with duration
9. [ ] Output truncation is described
10. [ ] Re-run behavior is described
