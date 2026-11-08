/** Agent identity: stamped onto every desktop tool call, hidden from the model. */

import { basename, dirname } from "node:path";
import { existsSync } from "node:fs";

/** Properties the server accepts for agent identity; injected here. */
export const IDENTITY_PROPS = ["agentClient", "agentSessionId", "agentProject"] as const;

let harnessId = "";
let project: string | null = null;
let projectResolved = false;

export function setHarnessId(id: string): void {
  harnessId = id;
}

export function getHarnessId(): string {
  return harnessId;
}

/** Recompute the project per session (cwd may change between sessions). */
export function resetProject(): void {
  projectResolved = false;
  project = null;
}

/** Repo-root directory name — the per-project web-access bucket key. */
export function resolveProject(): string | null {
  if (projectResolved) return project;
  projectResolved = true;
  let dir = process.cwd();
  for (let i = 0; i < 12; i++) {
    if (existsSync(dir + "/.git")) {
      project = basename(dir);
      return project;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return project;
}

export function identityArgs(): Record<string, string> {
  const args: Record<string, string> = { agentClient: "pi" };
  if (harnessId) args.agentSessionId = harnessId;
  const p = resolveProject();
  if (p) args.agentProject = p;
  return args;
}
