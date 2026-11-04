/** Config model, discovery, and secret resolution for pi-dev-stack. */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface SlackCfg {
  botToken?: string;
  appToken?: string;
  channel?: string;
  /** post the final assistant text of each completed run (default true) */
  postOnComplete?: boolean;
  /** forward inbound channel messages into the pi session (default true,
   *  requires appToken for socket mode) */
  inboundEnabled?: boolean;
  maxTextLen?: number;
}

export interface DevStackConfig {
  /** Display name; also the default task name component. */
  project: string;
  /** Absolute repo root whose stack we keep alive. */
  repo: string;
  /** Command that starts the whole stack (default "pnpm run dev"). */
  command?: string;
  /** Every port that must answer for the stack to be healthy. */
  ports: number[];
  /** Ports whose liveness marks the environment as "dev" (emulators). */
  emulatorPorts?: number[];
  /** Label kept for parity with supervised-task style configs. */
  taskName?: string;
  /** Combined stdout/stderr log (default <tmpdir>/<project>-dev-stack.log). */
  logFile?: string;
  /** URIs opened in Playwright tabs each time the stack reaches healthy. */
  openUrls?: string[];
  /** Optional deep health: HTTP(S) URL that must answer 2xx once every
   *  port is up; catches "ports bound but the app is a zombie". */
  healthUrl?: string;
  /** Substrings that must all appear in healthUrl's response body. */
  healthContains?: string[];
  /** Extra ports to evict (kill holders of) on teardown. */
  teardownPorts?: number[];
  /** Optional Slack bridge (tokens may be "env:VAR"/"${VAR}" placeholders). */
  slack?: SlackCfg;
}

const PROBE_TIMEOUT_MS = 1_200;

export function readJson(path: string): Record<string, unknown> | null {
  try {
    if (!existsSync(path)) return null;
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** Resolve secrets/placeholders: "env:VAR" or inline ${VAR} against
 *  process.env, falling back to <repo>/.env (never logged). */
export function resolveSecret(v: string | undefined, repo: string): string {
  if (!v) return "";
  let repoEnv: Record<string, string> | null = null;
  const fromRepoEnv = (name: string): string => {
    if (repoEnv === null) {
      repoEnv = {};
      try {
        for (const line of readFileSync(join(repo, ".env"), "utf8").split("\n")) {
          const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
          if (m) repoEnv[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
        }
      } catch {
        /* no .env */
      }
    }
    return repoEnv[name] ?? "";
  };
  const lookup = (name: string) => process.env[name] || fromRepoEnv(name) || "";
  if (v.startsWith("env:")) return lookup(v.slice(4));
  return v.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_m, name: string) => lookup(name));
}

function isConfig(v: unknown): v is DevStackConfig {
  const c = v as DevStackConfig;
  return !!c && typeof c.project === "string" && typeof c.repo === "string" && Array.isArray(c.ports) && c.ports.every((n) => typeof n === "number");
}

/** Config discovery: <cwd>/.pi/dev-stack.json → global
 *  ~/.pi/agent/dev-stack.json activeProject entry → null. */
export function loadConfig(cwd: string): DevStackConfig | null {
  const local = readJson(join(cwd, ".pi", "dev-stack.json"));
  if (isConfig(local)) return local;
  const global = readJson(join(homedir(), ".pi", "agent", "dev-stack.json"));
  if (global && typeof global.activeProject === "string" && global.projects && typeof global.projects === "object") {
    const entry = (global.projects as Record<string, unknown>)[global.activeProject];
    if (isConfig(entry)) return entry;
  }
  return null;
}

export const HEALTH_PROBE_TIMEOUT_MS = PROBE_TIMEOUT_MS;
