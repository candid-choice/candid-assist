# 12 — ImageSurface

**Claude can analyze images programmatically, but the user provides contextual visual judgment.** This surface is for visual review where the user's eyes spot things Claude can't — visual bugs, alignment issues, design inconsistencies, or UI problems that don't show up in code.

## What it does

Displays an image (or image pair) with annotation tools. The user can zoom, pan, draw arrows/circles/text, and add notes. Claude receives both the original image and the annotated version.

## Chrome

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Image Review          ────   [─] [□] [✕]                            │
│  ←  →  ↻  [▣ Zoom]  [Annotate]  [Open]  [Send →]                      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  [Large image — user can scroll, pinch-to-zoom]                   │  │
│  │                                                                  │  │
│  │  (3 annotation marks on the image)                               │  │
│  │  ── red circle around the bug, arrow pointing to misaligned      │  │
│  │     element, text note saying "this button should be blue"       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Notes: "The header padding is wrong and the button color is off."     │
│  [Send →]  [Clear Annotations]                                          │
└────────────────────────────────────────────────────────────────────────┘
```

| Control | Behavior |
|---------|----------|
| Zoom / Pan | Pinch-to-zoom, scroll. Double-click to fit. |
| Annotate | Enables drawing mode: arrows, circles, text, highlighter, freehand. |
| Open | Opens image in default image viewer (macOS Preview). |
| Send | Sends annotated image + notes to Claude. |
| Clear Annotations | Removes all marks, keeps the original image. |
| Close [✕] | Sends `{ completed: false }`. |

## Use cases (tips)

| # | Tip | What the user does |
|---|---|---|
| 3 | "Here's the error screenshot from the crash log. Annotate where the stack trace fails." | View, circle the error, explain |
| 9 | "Here's the before/after UI comparison. Point out anything I missed." | Compare side-by-side, note differences |
| 22 | "Here's the user feedback from the support desk. Annotate the top 3 issues." | Read feedback, annotate relevant images |

## Key design principle

**This is the visual quality assurance surface.** Claude can detect code issues. The user spots visual and UX issues — spacing, alignment, color, font, behavior. This surface captures that visual feedback and sends it to Claude so Claude can fix it.

It's a **visual comparison** surface: Claude shows an image (before/after, design vs reality, screenshot vs spec), user annotates, Claude gets the annotated version and understands the gap.

## What this surface does NOT do

- **Does not replace ScreenCapture** — ScreenCapture is for capturing what the user sees on their desktop. ImageSurface is for reviewing images Claude provides. Different direction of flow.
- **Does not replace CanvasSurface** — ImageSurface is for **annotating existing content** (Claude's images, screenshots, designs). CanvasSurface is for **creating new content** from scratch (diagrams, architecture).
