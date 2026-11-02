# Instructions

This folder stores **how-to knowledge for setting things up** — the steps an
agent (or human) should follow to configure external systems, so the same
ground doesn't have to be rediscovered.

Write one markdown file per setup topic. Include: the exact commands used,
prerequisites (logins, tools, versions), what the automated parts do vs what
still needs the web console, and any gotchas hit along the way.

## Index

| File | Topic |
|---|---|
| [firebase-cli-auth.md](firebase-cli-auth.md) | Enable Firebase Auth providers (Google, email/password) entirely via the Firebase CLI — `firebase.json` as code, `deploy --only auth`, retrieving the web app config, and what the CLI can't do |

## Adding an instruction

1. Name the file after the system being configured (e.g. `firebase-cli-auth.md`).
2. Record commands verbatim and their observed output where useful.
3. Note credentials *locations* (which env file, which key name) — never secret values.
4. Add a row to the Index table above.
