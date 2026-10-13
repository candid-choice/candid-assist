# CanvasSurface

Freeform drawing and diagramming space. Both Claude and the user can draw — Claude produces the initial content, the user annotates, corrects, or extends.

## When it appears

Claude Code wants the user to see or annotate a diagram, flowchart, or freeform sketch. The user draws; Claude reads the drawing and understands it.

## Use cases (from tips)

| # | Tip |
|---|---|
| 5 | "Let me sketch how this feature should work — review the diagram and add your ideas on the canvas in Human Assist." |
| 14 | "Show me a blank canvas in Human Assist so I can draw the architecture and you can trace over it with corrections." |
| 21 | "Draw a quick flowchart on the canvas in Human Assist — I'm trying to decide between two approaches." |
| 28 | "Draw the data flow on the canvas in Human Assist — I want you to trace where the data is getting lost." |

## Chrome

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Canvas              ────   [─] [□] [✕]                              │
│  ──────────────────────────────────────────────────────────────────    │
│  Pen  Eraser  Highlight  Text  Undo  Redo  [Zoom 100%]  [Clear]       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │    [Drawing area — dot grid background for alignment]              │  │
│  │                                                                  │  │
│  │    User draws a quick architecture diagram:                        │  │
│  │                                                                  │  │
│  │         ┌──────────┐     ┌──────────┐     ┌──────────┐          │  │
│  │         │  Front   │────▶│   CG     │────▶│   DB     │          │  │
│  │         │  End     │     │  Layer   │     │          │          │  │
│  │         └──────────┘     └──────────┘     └──────────┘          │  │
│  │                                                                  │  │
│  │    (Traces over Claude's drawing with corrections in green)      │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ───────────────────────────────────────────────────────────────────   │
│  Notes: "This is the flow I was thinking of. Does it work?"            │
│  [Send →]  [Clear Canvas]                                                │
└────────────────────────────────────────────────────────────────────────┘
```

| Control | Behavior |
|---------|----------|
| Pen | Freeform drawing. Click to start, drag to draw. Stroke width matches selected size. |
| Eraser | Removes strokes on contact. Same size as pen. |
| Highlighter | Semi-transparent, thick strokes for emphasis. |
| Text | Types text directly on the canvas at the click location. |
| Undo / Redo | Standard history. Up to 50 steps. |
| Zoom | +/− buttons. Pinch-to-zoom on trackpad. |
| Clear | Clears all strokes. Confirms before clearing. |
| Send | Sends all strokes + notes to Claude as a combined image + text. |

## How it interacts with the user

1. **Claude initiates**: Claude pushes a pre-drawn sketch, diagram, or blank canvas with a prompt.
2. **User annotates**: The user draws over Claude's work — adds corrections, highlights areas, traces connections.
3. **User responds**: A text field below the canvas for additional notes. Submit sends everything to Claude.
4. **Feedback loop**: Claude sees the annotated drawing and responds with updated content or continuation.

## Key design decisions

- **Both sides draw**: Claude draws first (proactive), the user annotates (reactive). This is the core loop — Claude proposes, the user corrects.
- **Shared space**: It's not a canvas where the user draws and sends. Both Claude and the user contribute strokes to the same shared drawing. Claude can see what the user drew and respond with updated content.
- **Dot grid background**: Subtle grid helps with alignment. Users can toggle it on/off.
- **Text tool**: For quick labels that are harder to draw as diagrams.
- **Send as combined payload**: Strokes are rendered as an image. The text field is sent alongside. Claude receives both and can reference specific parts of the drawing.

## What it does NOT do

- **Does not replace ImageSurface**: You can screenshot a canvas and share it, but a CanvasSurface is an interactive drawing space, not a static image review.
- **Does not replace BrowserSurface**: A rendered web page is not a sketch. CanvasSurface is for diagrams and freeform ideas, not structured web content.
