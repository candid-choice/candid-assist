---
description: User preferences and project context — persists across sessions. Use when starting work on this project.
argument-hint: "[what to work on]"
---

# User Instructions — ${1:-continuing work}

## Work Style

> "keep running until i stop you, each phase should be kept short no more than 1000 tokens and once you finish a phase, which you should not take longer than 10000 tokens to do, you are to move onto the next logical feature"

## Project Context

- **Web**: `apps/web/` — Next.js 16 frontend
- **Backend**: `apps/backend/` — NestJS 12 API
- **Desktop**: `apps/desktop/` — Electrobun runtime
- **Plans**: `user-plans/` — Feature plans (`pre-` = unreviewed)
- **Skills**: `.agents/skills/` — Pi skills
- **Rules**: `.agents/rules/` — Shared context

## Current State

Working on `user-flow-ideation` branch. Reviewing/creating plan files for Human Assist desktop app.

## Launching the app (always)

Always start the full stack — including the Electron desktop app — with
`pnpm run dev` at the repo root (web + backend + renderer + electron +
firebase emulator together). Never launch `electron-vite dev` or the
renderer manually; ad-hoc launches get orphaned and leave the desktop
app dead. Use a scoped `pkill -f candid-assist` before relaunching.
