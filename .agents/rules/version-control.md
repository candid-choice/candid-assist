# Version Control Rules

## No automatic commits
- Never run `git commit` unless the user explicitly asked to commit
  (a blanket "commit when I say" means: wait for the instruction).

## No pushes without explicit instruction
- Never `git push` to any remote unless the user explicitly asked
  (creating/updating a PR counts as authorization for that push).

## No pull requests without explicit instruction
- Never run `gh pr create` / `gh pr merge` unless explicitly asked.

## No remote merges
- Merging into `main` (locally or remotely) requires explicit user
  instruction. Always leave merges to the user unless they said
  "merge it".

## Leave the tree reviewable
- Before reporting work as done: `git status` should show only files
  the user expects. Do not commit unrelated local config (e.g. model
  preferences in `.pi/settings.json`), artifacts (`.playwright-mcp/`),
  or scratch files unless asked.
- Prefer one logical change per commit; reference the plan file when a
  commit implements a plan item.
