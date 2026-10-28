# 11 — ScreenCaptureSurface

**Claude Code can't see the user's screen.** This surface gives Claude access to a region, window, or the entire screen that the user captures. It's a macOS screen capture overlay that Claude triggers.

## What it does

Brings up a macOS screen capture overlay. The user selects a region, window, or full screen. The captured area is sent to Claude as an image so Claude can "see" what the user sees.

## Chrome

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Screen Capture          ────   [─] [□] [✕]                          │
│  Select a region to capture (click and drag)                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  [Dimmed overlay of entire desktop]                              │  │
│  │                                                                  │  │
│  │         ┌──────────────────────────────┐                        │  │
│  │         │ Selected region                │  ← drag to resize     │  │
│  │         │                              │  ─────────────          │  │
│  │         │  Terminal error output here    │                        │  │
│  │         │                              │                        │  │
│  │         └──────────────────────────────┘                        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  [Window] [Screen] [Region: 800×600]   [Capture] [✕]           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  [Send Screenshot →]  [Retake]                                        │
└────────────────────────────────────────────────────────────────────────┘
```

| Mode | Behavior |
|------|----------|
| Region | User drags to select a rectangle on screen. |
| Window | Click any window to capture its entire bounds. |
| Full Screen | Captures the entire visible screen area. |
| Capture | Locks in the selected region and returns to the confirmation view. |

## Use cases (tips)

| # | Tip | What Claude sees |
|---|---|---|
| 2 | "I'm getting a timeout error — capture your network tab and show me in Human Assist so I can debug it." | Chrome DevTools network tab showing HTTP errors |
| 12 | "Capture your terminal window in Human Assist so I can see the full error output." | Terminal with stack traces, error messages |
| 19 | "Capture your full screen in Human Assist — I need context from your entire desktop to understand the issue." | Full desktop state — IDE, terminal, browser, notes |

## Key design principle

**This is Claude's eyes on the user's environment.** Claude can't see error windows, terminal output, or anything outside the terminal window. This surface captures and sends images of the desktop so Claude can analyze what the user sees.

It's a **one-way** surface: capture → send → Claude processes the image. No interactive overlay, no annotations during capture (user can annotate in ImageSurface afterwards if needed).

## What this surface does NOT do

- **Does not include annotations** — after capturing, the user can annotate the image in ImageSurface. The capture itself is just the raw screenshot.
- **Does not stream** — it's a single capture, not a live stream. Claude gets one image per capture event.
- **Does not replace TerminalSurface** — if Claude needs structured command output (parsed, text-based), use TerminalSurface. ScreenCapture is for visual things Claude can't parse: screenshots of UI, error dialogs, etc.
