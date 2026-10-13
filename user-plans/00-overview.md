# Human Assist — User Interaction Flow Plan

## Context

Human Assist is a macOS desktop app (Electrobun) that creates a shared workspace
between the human user and Claude Code. Claude pushes interactive **surfaces** to the
user — webviews, canvas, forms, images — and the user responds so Claude can continue.

The web app (Next.js) is currently a landing page with a "Download for macOS" CTA.
The desktop app (Electrobun) has a WindowShell with a tabbed AddressBar, SurfaceHost
for rendering Claude's surfaces, and a HelpPalette for user-initiated shortcuts.

## What this plan covers

We map the complete user journey from **after they download and open the app** —
through login, onboarding, the main dashboard, and every screen Claude's surfaces
will present. The nav lives on the **left side** (vertical sidebar), not tabs on top.

## Structure

| File | Contents |
|------|----------|
| `01-user-interaction-flow.md` | Mermaid interaction sequence diagram — every user action, Claude action, system response |
| `02-page-navigation-flow.md` | Mermaid page navigation state machine — all screens, transitions, and conditional branches |
| `03-screen-sequence-login.md` | Detailed screen-by-screen spec: pre-auth, login, onboarding, first-launch |
| `04-screen-sequence-dashboard.md` | Detailed screen-by-screen spec: dashboard shell, sidebar, active sessions |
| `05-screen-sequence-surfaces.md` | Detailed screen-by-screen spec: every surface type, task history, settings |
| `06-interaction-patterns.md` | Keyboard shortcuts, right-click menus, drag-and-drop, notifications |
