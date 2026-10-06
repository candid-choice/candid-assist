# 10 — BrowserSurface

**Claude Code can open a URL, but cannot interact with it.** The user navigates, clicks, types, and reports back. This is the most heavily-used surface because it covers the widest range of Claude-initiated interactions.

## What it does

Renders an embedded web view (WKWebView) with full interactivity. Claude pushes a URL, the user sees the page and can interact with it as a human would — filling forms, clicking buttons, verifying layouts, solving CAPTCHAs.

## Chrome

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✦ Browser             ────   [─] [□] [✕]                              │
│  🔍 https://staging.myapp.com/checkout          ↻  ←  →  [📷] [🔗]    │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [Embedded web content — full WKWebView, interactive]                   │
│                                                                        │
│  ──────────────────────────────────────────────────────────────────    │
│  "The checkout works, but the coupon code field is missing from the     │
│   payment form."                                                       │
│  [Submit →]  [Take Screenshot →]  [Open External →]                    │
└────────────────────────────────────────────────────────────────────────┘
```

| Control | Behavior |
|---------|----------|
| URL bar | Editable. Claude can pre-populate, user can navigate elsewhere. |
| Back / Forward | Standard browser navigation. |
| Reload ↻ | Refreshes the page. |
| Screenshot 📷 | Captures the visible area, sends to Claude as image. |
| Open external 🔗 | Opens in default browser. |
| Submit | Sends user's feedback to Claude. |
| Close [✕] | Sends `{ completed: false }`. |
| Minimize [─] | Minimizes to small badge. |
| Expand [□] | Toggles contained ↔ full-viewport. |

## Use cases (tips)

| # | Tip | Human does what Claude can't |
|---|---|---|
| 1 | "Open https://staging.myapp.com in Human Assist so I can test the checkout flow while you keep working." | Navigate, interact with forms, verify behavior |
| 6 | "I've generated the PR description. Preview it in Human Assist so I can edit it before you push." | Read rendered preview, edit, approve |
| 10 | "Open the demo sandbox in Human Assist and click through — tell me what's broken when you're done." | Click through the app, find bugs, report back |
| 13 | "Open the staging URL in Human Assist and take a screenshot of the signup flow." | Navigate, capture, send |
| 16 | "Open the bug report URL in Human Assist — I want you to reproduce the issue on your end." | Reproduce issue, verify, report |
| 18 | "I've prepared a Markdown preview of the changelog. Show it in Human Assist so you can approve the wording." | Read, review, approve/modify |
| 20 | "Open the Figma embed in Human Assist so I can see the design specs and build against them." | View design specs, cross-reference with implementation |
| 23 | "Open the monitoring dashboard in Human Assist and take a screenshot of the error rate spike." | Navigate, screenshot, report |
| 26 | "Open the internal docs URL in Human Assist and navigate to the API reference." | Navigate, find docs, read, report back |
| 29 | "Open the staging URL in Human Assist and fill out the form with test data." | Fill forms, verify validation, report |

## Key design principle

**This is the surface Claude uses most often.** Every web interaction Claude can't complete becomes a BrowserSurface. The surface is the bridge: Claude sees code and errors in the terminal, but the user sees the live web page. The user is the eyes between Claude and the real world.

## What this surface does NOT do

- **Code review / diffs** — that's CodeDiffSurface (structured, side-by-side). BrowserSurface is for rendered HTML pages.
- **Terminal output** — that's TerminalSurface.
- **Simple decisions** — confirmations, choices, text answers are handled in terminal chat.
