# 13 — CodeDiffSurface

**Claude generates code changes, but the user needs to review and approve them.** This surface shows code diffs in a structured, readable format — side-by-side comparison with inline annotations, status badges, and inline comments.

## What it does

Displays a structured code diff viewer: changed files, inline line-by-line changes with added/removed highlighting, file-level status badges, and inline annotation capability. The user reviews, annotates, and approves or requests changes.

## Chrome

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Code Review         ────   [─] [□] [✕]                              │
│  2 files changed · 14 additions · 3 deletions · [Archive] [✓ Approve] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  🟢 src/middleware/auth.ts                                       │  │
│  │  +4  -0  Insert null-header guard                                │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  @ @ src/middleware/auth.ts @@                                   │  │
│  │      export const authMiddleware = async (req: Request) => {      │  │
│  │  -    const token = req.headers.authorization;                    │  │
│  │  +    const token = req.headers.authorization;                    │  │
│  │  +    if (!token) return next(new Error('Missing auth header')); │  │
│  │      return next();                                               │  │
│  │  }                                                                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  🟡 src/utils/handlers.ts                                        │  │
│  │  +10 -3  Added error handling, adjusted tests                    │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  [diff viewer content...]                                       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ───────────────────────────────────────────────────────────────────   │
│  "The auth change looks good. In handlers.ts, please also add a       │
│   test for the 503 case. Otherwise this is good to merge."             │
│  [✓ Approve & Merge]  [Request Changes →]                              │
└────────────────────────────────────────────────────────────────────────┘
```

| Control | Behavior |
|---------|----------|
| File list | Collapsible per-file view with status badge (🟢 green=approved, 🟡 yellow=changes requested, ⚪ white=unreviewed). |
| Inline diff | Side-by-side or unified view. Added lines in green, removed in red, unchanged in gray. |
| Annotate | Click any line to add an inline comment. Comments are sent to Claude. |
| Approve | Marks the diff as approved. Claude proceeds with merge/deploy. |
| Request changes | Sends annotated feedback to Claude. Claude sees which lines need fixing. |
| Archive | Removes the diff from active view, keeps in session history. |
| Toggle view | Switches between side-by-side and unified views. |

## Use cases (tips)

| # | Tip | What the user does |
|---|---|---|
| 7 | "I've generated the PR description. Preview it in Human Assist so I can edit it before you push." | Read PR description, edit, approve |
| 18 | "I've prepared a Markdown preview of the changelog. Show it in Human Assist so you can approve the wording." | Review changelog, approve |
| 24 | "Show me a yes/no confirm in Human Assist — if you're okay with it, I'll merge this PR." | View diff, approve or request changes |

## Key design principle

**This is the gatekeeper surface.** Before code ships, the user needs to review what Claude changed. It's not just a yes/no decision — the user needs to see the actual diff, annotate specific lines, and communicate their feedback to Claude.

This surface bridges the gap between "Claude wrote code" and "Claude shipped code." The user is the quality gate.

## What this surface does NOT do

- **Does not replace BrowserSurface** — a rendered PR description or Markdown preview is a web page view. CodeDiff is structured code changes.
- **Does not replace TerminalSurface** — git diff and log output is text-based terminal data. CodeDiff is a visual, interactive diff viewer with annotations.
- **Does not replace ImageSurface** — CodeDiff is for code. ImageSurface is for screenshots, UI designs, error images.
