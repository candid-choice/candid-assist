# pre-task-composer-detail-test — Test Specification

## Purpose

Verify the Task Composer Detail document correctly specifies all components, attachment behaviors, keyboard shortcuts, submission flow, error handling, and edge cases.

## Unit Tests

### UI Layout
- [ ] Verify Task Composer appears at bottom-center of window
- [ ] Verify trigger: ⌘+N or "New Task" in HelpPalette
- [ ] Verify title: "Compose a Task for Claude Code"
- [ ] Verify subtitle: "Tell Claude Code to use Human Assist."
- [ ] Verify text area for task description is prominent and large
- [ ] Verify [Send to Claude →] button at bottom right
- [ ] Verify [Cancel] button at bottom right

### Components
- [ ] Verify Task prompt: large text area, auto-saves draft
- [ ] Verify File attachment: "Add file" button, drag-and-drop, file list
- [ ] Verify Link attachment: "Add link" button, paste URL, link list
- [ ] Verify Screenshot attachment: "Screenshot" button, macOS overlay, screenshot list
- [ ] Verify Send button: sends task, creates session
- [ ] Verify Cancel button: closes Task Composer, keeps draft

### File Attachment
- [ ] Verify click "Add file" shows file picker
- [ ] Verify User selects file(s) → shown in attached files list
- [ ] Verify drag-and-drop file(s) from desktop onto text area → adds to list
- [ ] Verify remove file: click "X" next to file → removed from list
- [ ] Verify clear all: click "Clear All" → removes all attached files
- [ ] Verify file validation: supported formats, max size

### Link Attachment
- [ ] Verify click "Add link" shows link input
- [ ] Verify user types URL → shown in attached links list
- [ ] Verify paste URL into text area → auto-detects URL, adds to list
- [ ] Verify remove link: click "X" next to link → removed from list
- [ ] Verify clear all: click "Clear All" → removes all attached links

### Screenshot Attachment
- [ ] Verify click "Screenshot" opens macOS screen capture overlay
- [ ] Verify user selects region/window/fullscreen
- [ ] Verify screenshot shown in attached screenshots list
- [ ] Verify remove screenshot: click "X" next to screenshot → removed from list
- [ ] Verify clear all: click "Clear All" → removes all attached screenshots

### Keyboard Shortcuts
- [ ] Verify ⌘+N opens Task Composer
- [ ] Verify Escape closes Task Composer, keeps draft
- [ ] Verify Enter sends task if text exists
- [ ] Verify ⌘+Enter always sends (even if empty)
- [ ] Verify ⌘+S takes screenshot
- [ ] Verify ⌘+Click link → opens link in browser
- [ ] Verify ⌘+Click file → opens file in editor

### Submission Flow
- [ ] Verify Step 1: user types task description
- [ ] Verify Step 2: user attaches files, links, or screenshots (optional)
- [ ] Verify Step 3: user clicks "Send to Claude" or presses Enter
- [ ] Verify Step 4: app creates session in Firestore
- [ ] Verify Step 5: app sends task description + attachments to Claude via HTTP POST
- [ ] Verify Step 6: Claude Code receives prompt and processes
- [ ] Verify Step 7: Claude Code may push surfaces via MCP
- [ ] Verify Step 8: app shows surfaces in main content area
- [ ] Verify Step 9: user interacts with surfaces, submits responses
- [ ] Verify Step 10: Claude Code continues execution
- [ ] Verify Step 11: Claude finishes → "Task complete" toast
- [ ] Verify Step 12: user navigates to Session List to view completed task

### Error Handling
- [ ] Verify task send fails → toast "Failed to send task"
- [ ] Verify network loss during send → toast "Network lost — queued locally"
- [ ] Verify Firebase timeout → toast "Firebase timeout — retrying..."
- [ ] Verify backend error → toast "Backend error — try again"
- [ ] Verify too many sessions → toast "Too many sessions open"
- [ ] Verify max surfaces (10) → toast "Maximum 10 surfaces open at once"
- [ ] Verify all errors: task saved as draft for retry

### Edge Cases
- [ ] Verify offline onboarding: Task Composer disabled, shows "Check connection"
- [ ] Verify multiple windows: single-window behavior (future: one per session)
- [ ] Verify concurrent Claude instances: toast "Another Claude instance is active"
- [ ] Verify surface ordering: 5 rapid pushes → last 4 queue as background surfaces
- [ ] Verify user closes app during send: task saved as draft, shown on reopen
- [ ] Verify sign in on different machine: workspace syncs, previous state preserved
- [ ] Verify large session history: virtualized list, loads 20 at a time, searchable
- [ ] Verify macOS dark mode: all UI adapts
- [ ] Verify Retina/4K displays: UI is resolution-independent
- [ ] Verify multiple monitors: surfaces span across monitors
- [ ] Verify low storage: toast "Low storage — queued actions may not save"
- [ ] Verify accessibility: alt text on buttons, keyboard navigable, VoiceOver compatible

### Cross-Plan Consistency
- [ ] Verify keyboard shortcuts match pre-sidebar-interactions.md (⌘+N shortcut)
- [ ] Verify attachment behavior matches pre-settings-system.md (file handling)
- [ ] Verify submission flow matches pre-mcp-protocol.md (tool call creation)
- [ ] Verify error handling matches pre-notification-system.md (toast messages)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All Task Composer components are correctly specified
2. [ ] All attachment behaviors (file, link, screenshot) described
3. [ ] All keyboard shortcuts listed and non-conflicting
4. [ ] All 12 steps of submission flow are accurate
5. [ ] All error handling cases covered
6. [ ] All edge cases listed with correct handling
7. [ ] No contradictions with other plans
