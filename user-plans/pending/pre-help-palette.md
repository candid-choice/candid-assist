# Help Palette & Keyboard Shortcuts Plan

## Overview

Defines the Help Palette (activated by ⌘+Shift+Space) and all keyboard shortcuts in the app. This complements the `07-interaction-patterns.md` reviewed plan.

## Help Palette

### Activation
| Shortcut | Action |
|----------|--------|
| ⌘+Shift+Space | Toggle Help Palette |
| Click "?" icon | Open Help Palette |
| Escape | Close Help Palette |

### Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│  ⌨  Keyboard Shortcuts                                    [Close ✕] │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                        │
│  ┌─ Task ────────────────────────────────────────────────────────────┐ │
│  │  ⌘+N          New Task                                  [Copy]  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌─ Navigation ───────────────────────────────────────────────────────┐ │
│  │  ⌘+W          Close surface                              [Copy]  │ │
│  │  ⌘+M          Minimize surface                          [Copy]  │ │
│  │  ⌘+1-9        Switch surface by number                  [Copy]  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌─ Help ──────────────────────────────────────────────────────────────┐ │
│  │  ⌘+?          This screen                             [Copy]  │ │
│  │  ⌘+/          Show all shortcuts                        [Copy]  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌─ About ─────────────────────────────────────────────────────────────┐ │
│  │  Human Assist v1.0.0                                             │ │
│  │  Built with Electron + React                                     │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

## Keyboard Shortcuts

### Global Shortcuts (always active)

| Shortcut | Action | Description |
|----------|--------|-------------|
| ⌘+N | New Task | Open Task Composer |
| ⌘+Shift+Space | Toggle Help | Open/Close Help Palette |
| Escape | Close overlay | Close Task Composer, Help Palette, etc. |

### Surface Shortcuts (active when surface is focused)

| Shortcut | Action | BrowserSurface | CanvasSurface | CodeDiffSurface | TerminalSurface |
|----------|--------|----------------|---------------|-----------------|-----------------|
| ⌘+Enter | Submit | Submit feedback | Send strokes | Approve changes | Send to Claude |
| ⌘+S | Screenshot | Take screenshot | — | — | Copy selection |
| ⌘+C | Copy | Copy URL | Copy strokes | Copy diff | Copy text |
| ⌘+Z | Undo | — | Undo strokes | — | — |
| ⌘+Shift+Z | Redo | — | Redo strokes | — | — |
| ⌘+R | Reload | Reload page | Clear canvas | — | Re-run command |
| ⌘+L | Focus URL | Focus URL bar | — | — | — |
| ⌘+↑/↓ | Scroll | Scroll surface | — | Scroll diff | Scroll output |
| ⌘+F | Search | Find in page | — | Find in diff | Search output |

### Navigation Shortcuts (active in sidebar)

| Shortcut | Action |
|----------|--------|
| ↑/↓ | Navigate session list |
| Enter | Open selected session |
| Del | Delete selected session |
| / | Focus search box |

### General Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| ⌘+, | Open Settings | Open Settings screen |
| ⌘+Q | Quit | Quit app |
| ⌘+H | Hide | Hide app window |
| ⌘+M | Minimize | Minimize to dock |
| ⌘+` | Toggle sidebar | Show/hide sidebar |
| ⌘+D | New session | Create new empty session |

## Shortcuts Customization

| Shortcut | Default | Customizable? |
|----------|---------|--------------|
| ⌘+N | New Task | Yes |
| ⌘+Shift+Space | Help Palette | Yes |
| Escape | Close overlay | No |
| ⌘+Enter | Submit surface | Yes |
| ⌘+S | Screenshot | Yes |
| ⌘+C | Copy | Yes |
| ⌘+Z | Undo | Yes |

### Customization UI
```
┌────────────────────────────────────────────────────────────────────────┐
│  Keyboard Shortcuts — Settings                                        │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                        │
│  ⌘+N  New Task            [Clear]  [Save]                           │
│  ⌘+⇧+Space  Help Palette    [Clear]  [Save]                           │
│  ⌘+Enter  Submit Surface    [Clear]  [Save]                           │
│  ⌘+S  Take Screenshot       [Clear]  [Save]                           │
│  ⌘+Z  Undo                  [Clear]  [Save]                           │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Tip: Press a new key combination to remap.                      │  │
│  │      Press Escape to cancel.                                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

## Edge Cases

1. **Shortcut conflict** → If a shortcut conflicts with macOS shortcut (e.g. ⌘+Q), show warning: "This shortcut conflicts with [System Shortcut]."
2. **Shortcut conflict 2** → If a shortcut conflicts with another Human Assist shortcut, show: "This shortcut is already used for [Action]."
3. **Multiple surfaces active** → Shortcuts apply to the frontmost surface only.
4. **Help Palette open** → ⌘+Space opens Spotlight, not Help Palette. ⌘+Shift+Space always opens Help Palette.
5. **Task Composer open** → Enter sends the task. Escape closes without sending.
6. **Surface focused** → When surface content is focused (e.g. text input), shortcuts like ⌘+N still work.
7. **Fullscreen mode** → Shortcuts work in fullscreen mode.
