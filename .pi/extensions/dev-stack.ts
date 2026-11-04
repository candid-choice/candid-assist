/** Dev-stack keeper — self-contained, shareable pi extension.
 *
 * Drop this ONE file into any project's .pi/extensions/ (or ~/.pi/agent/
 * extensions/) and it keeps that project's dev stack alive:
 *
 *  • Autostart: session_start with the stack down → one follow-up kickoff
 *    telling the model to start it via better-background-tasks
 *    (bg_task_spawn — supervised, logged, restartable).
 *  • Watchdog: probes every configured port every 20s. If the stack was
 *    healthy and ANY component dies (after concurrently's local
 *    restart-tries are exhausted), inject one action telling the model
 *    to STOP the supervised task (whole-stack teardown) and spawn a
 *    fresh one. 90s throttle; re-arms when all ports answer again.
 *  • Status: publishes { alive, env, changedAt } so other extensions
 *    (e.g. human-assist's footer: ⌁dev / ⌁prod / ⌁down) can display it.
 *
 * Config (first hit wins; repo defaults to the session cwd):
 *   1. <cwd>/.pi/dev-stack.json
 *   2. ~/.pi/agent/dev-stack.json — { "activeProject": "name",
 *      "projects": { "name": { project, repo, command, ports,
 *      emulatorPorts?, taskName?, openUrls? } } }  ← lets one session
 *      keep the CONFIGURED project's stack alive anywhere ("open this
 *      project").
 *   3. none → extension idles with a notify.
 *
 * ── Using this in another project ───────────────────────────────────────
 *   1. Copy dev-stack.ts into <project>/.pi/extensions/ (or put it in
 *      ~/.pi/agent/extensions/ once and share it globally).
 *   2. Create <project>/.pi/dev-stack.json:
 *        {
 *          "project": "my-app",
 *          "repo": "/absolute/path/to/my-app",
 *          "command": "pnpm run dev",        // any stack-start command
 *          "ports": [3000, 5432],            // EVERY port that must answer
 *          "emulatorPorts": [5432],          // optional: alive ⇒ env=Dev
 *          "taskName": "my-app dev",         // optional label
 *          "openUrls": [                     // optional: opened in
 *            "http://localhost:3000",        // Playwright tabs once the
 *            "http://localhost:3000/admin"   // stack is up
 *          ]
 *        }
 *      …or add it to the global file under projects{} and set
 *      activeProject to it.
 *   3. Install better-background-tasks (supervised spawns) and the
 *      Playwright MCP (browser_* tools) if you use openUrls.
 *   4. Run /dev-stack in pi for status + config help.
 *   The watchdog treats the loss of ANY port as a crash once the stack
 *   was healthy: the supervised task is stopped (whole-stack teardown)
 *   and respawned; openUrls are (re)opened in Playwright after every
 *   successful launch/restart (once per pi process per launch cycle).
 *
 * Status contract for other extensions (no file dependency — read via
 * globalThis): globalThis.__haStackStatus = { alive, env, changedAt };
 * globalThis.__haStackStatusListeners = Set<(s)=>void>.
 * This module also exports getStackStatus/onStackStatus/setStackStatus.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { connect } from "node:net";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// ── Config ────────────────────────────────────────────────────────────────

interface DevStackConfig {
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
  /** better-background-tasks task label (default "<project> dev"). */
  taskName?: string;
  /** URIs to open in Playwright browser tabs each time the stack reaches
   *  healthy (initial launch and every watchdog restart). */
  openUrls?: string[];
}

const STATUS_KEY = "__haStackStatus";
const LISTENERS_KEY = "__haStackStatusListeners";
const PROBE_MS = 20_000;
const CRASH_THROTTLE_MS = 90_000;
const PROBE_TIMEOUT_MS = 1_200;

function readJson(path: string): Record<string, unknown> | null {
  try {
    if (!existsSync(path)) return null;
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function isConfig(v: unknown): v is DevStackConfig {
  const c = v as DevStackConfig;
  return !!c && typeof c.project === "string" && typeof c.repo === "string" && Array.isArray(c.ports) && c.ports.every((n) => typeof n === "number");
}

function loadConfig(cwd: string): DevStackConfig | null {
  const local = readJson(join(cwd, ".pi", "dev-stack.json"));
  if (isConfig(local)) return local;
  const global = readJson(join(homedir(), ".pi", "agent", "dev-stack.json"));
  if (global && typeof global.activeProject === "string" && global.projects && typeof global.projects === "object") {
    const entry = (global.projects as Record<string, unknown>)[global.activeProject];
    if (isConfig(entry)) return entry;
  }
  return null;
}

// ── Status singleton (globalThis — safe across extension loaders) ────────

export interface StackStatus {
  alive: boolean;
  env: "dev" | "prod";
  changedAt: number;
  /** some (but not all) ports answering — degraded, watchdog pending */
  partial?: boolean;
}

function state(): StackStatus {
  const g = globalThis as Record<string, unknown>;
  if (!g[STATUS_KEY]) g[STATUS_KEY] = { alive: false, env: "prod", changedAt: Date.now() };
  return g[STATUS_KEY] as StackStatus;
}

function listeners(): Set<(s: StackStatus) => void> {
  const g = globalThis as Record<string, unknown>;
  if (!g[LISTENERS_KEY]) g[LISTENERS_KEY] = new Set<(s: StackStatus) => void>();
  return g[LISTENERS_KEY] as Set<(s: StackStatus) => void>;
}

export function getStackStatus(): StackStatus {
  return state();
}

export function setStackStatus(next: Partial<StackStatus>): void {
  const cur = state();
  const changed = (next.alive !== undefined && next.alive !== cur.alive)
    || (next.env !== undefined && next.env !== cur.env)
    || (next.partial !== undefined && next.partial !== cur.partial);
  Object.assign(cur, next);
  if (changed) cur.changedAt = Date.now();
  for (const cb of listeners()) {
    try { cb(cur); } catch { /* listener must not break the probe loop */ }
  }
}

export function onStackStatus(cb: (s: StackStatus) => void): () => void {
  const set = listeners();
  set.add(cb);
  return () => set.delete(cb);
}

// ── Probing ───────────────────────────────────────────────────────────────

function portOpen(port: number, timeoutMs = PROBE_TIMEOUT_MS): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = connect({ host: "127.0.0.1", port });
    const done = (v: boolean) => {
      clearTimeout(timer);
      sock.destroy();
      resolve(v);
    };
    const timer = setTimeout(() => done(false), timeoutMs);
    sock.on("connect", () => done(true));
    sock.on("error", () => done(false));
  });
}

async function health(cfg: DevStackConfig) {
  const all = await Promise.all(cfg.ports.map((p) => portOpen(p)));
  let emu = false;
  if (cfg.emulatorPorts && cfg.emulatorPorts.length) {
    const e = await Promise.all(cfg.emulatorPorts.map((p) => portOpen(p, 600)));
    emu = e.every(Boolean);
  }
  return { up: all.every(Boolean), any: all.some(Boolean), all, emu };
}

// ── Extension ─────────────────────────────────────────────────────────────

export default function devStack(pi: ExtensionAPI) {
  let started = false;
  let wasHealthy = false;
  let lastActionAt = 0;
  let cfg: DevStackConfig | null = null;

  const send = (text: string) => {
    const fn = (pi as unknown as { sendUserMessage?: (c: string, o?: { deliverAs?: "steer" | "followUp" }) => Promise<void> }).sendUserMessage;
    if (fn) void fn.call(pi, text, { deliverAs: "followUp" }).catch(() => { /* best effort */ });
  };

  const taskLabel = (c: DevStackConfig) => c.taskName || `${c.project} dev`;

  const kickoff = (c: DevStackConfig) => {
    send(
      `[dev-stack] The "${c.project}" dev stack is not running. Start it exactly once as a supervised background ` +
      `task: call the better-background-tasks bg_task_spawn tool (find it via searchTools if needed) with name ` +
      `"${taskLabel(c)}", command "${c.command || "pnpm run dev"}", cwd "${c.repo}". Do NOT wait, poll, or check ` +
      `logs — just spawn, then confirm the task id in one short line.`,
    );
  };

  const restartAction = (c: DevStackConfig, missing: number[]) => {
    const now = Date.now();
    if (now - lastActionAt < CRASH_THROTTLE_MS) return;
    lastActionAt = now;
    send(
      `[dev-stack-watchdog] The "${c.project}" dev stack crashed (ports not answering: ${missing.join(", ")}). ` +
      `Tear the WHOLE stack down and bring it back exactly once: use better-background-tasks to stop the ` +
      `"${taskLabel(c)}" task (bg_task_stop / bg_status to find its id if needed — if no managed task exists, ` +
      `pkill -f "${c.project}.*concurrently" once), then bg_task_spawn a fresh one: name "${taskLabel(c)}", ` +
      `command "${c.command || "pnpm run dev"}", cwd "${c.repo}". Do not wait or poll; confirm the new task id ` +
      `in one short line.`,
    );
  };

  // Open configured URLs in Playwright tabs after a (re)launch reaches
  // healthy. Latched per launch cycle so a steady stack never re-opens;
  // cleared whenever the watchdog sees a crash, armed again on recovery.
  let urlsOpenedForThisLaunch = false;
  const openConfiguredUrls = (c: DevStackConfig) => {
    if (!c.openUrls?.length || urlsOpenedForThisLaunch) return;
    urlsOpenedForThisLaunch = true;
    const list = c.openUrls.map((u) => `    - ${u}`).join("\n");
    send(
      `[dev-stack] The "${c.project}" stack is up. Open these URLs in Playwright (each in its OWN new tab via ` +
      `browser_tabs action=new followed by browser_navigate — never reuse or replace existing tabs; skip any that ` +
      `are already open; do not wait for loads to finish):\n${list}\nConfirm the open tabs in one short line.`,
    );
  };

  const probe = () => {
    if (!cfg) return;
    const c = cfg;
    void (async () => {
      try {
        const h = await health(c);
        setStackStatus({ alive: h.up, env: h.emu ? "dev" : "prod", partial: !h.up && h.any });
        if (h.up) {
          if (!wasHealthy) openConfiguredUrls(c); // fresh launch or post-crash recovery
          wasHealthy = true;
          return;
        }
        if (wasHealthy) {
          urlsOpenedForThisLaunch = false; // next successful launch re-opens URLs
          restartAction(c, c.ports.filter((_, i) => !h.all[i]));
        }
      } catch {
        /* probe failures read as not-healthy; never throw */
      }
    })();
  };

  pi.on("session_start", async (_event, ctx) => {
    if (started) return;
    started = true;
    try {
      const cwd = (ctx as unknown as { cwd?: string }).cwd || process.cwd();
      cfg = loadConfig(cwd);
      if (!cfg) {
        ctx.ui?.notify?.("dev-stack: no .pi/dev-stack.json (or global activeProject) — idle", "info");
        return;
      }
      const h = await health(cfg);
      setStackStatus({ alive: h.up, env: h.emu ? "dev" : "prod", partial: !h.up && h.any });
      if (h.up) {
        wasHealthy = true;
        ctx.ui?.notify?.(`dev-stack: "${cfg.project}" stack already running`, "info");
        // Already up at session start → open URLs once per pi process
        // (latch intentionally NOT cleared on later recoveries here).
        if (cfg.openUrls?.length) {
          urlsOpenedForThisLaunch = true;
          const list = cfg.openUrls.map((u) => `    - ${u}`).join("\n");
          send(
            `[dev-stack] The "${cfg.project}" stack is already running. Open these URLs in Playwright (each in its ` +
            `OWN new tab via browser_tabs action=new followed by browser_navigate — never reuse or replace existing ` +
            `tabs; skip any that are already open; do not wait for loads):\n${list}\nConfirm the open tabs in one ` +
            `short line.`,
          );
        }
      } else if (ctx.isInteractive !== false) {
        lastActionAt = Date.now(); // don't let the watchdog double-fire right after kickoff
        kickoff(cfg);
      }
      const timer = setInterval(probe, PROBE_MS) as ReturnType<typeof setInterval> & { unref?: () => void };
      timer.unref?.();
    } catch {
      // Never block session start on this.
    }
  });

  pi.registerCommand("dev-stack", {
    description: "Dev-stack keeper status: health, env, config source, openUrls",
    handler: async (_args, ctx) => {
      const s = getStackStatus();
      const lines = [
        `dev-stack: ${s.alive ? "● up" : s.partial ? "◐ degraded" : "○ down"} · env ${s.env}` +
          (s.alive ? "" : s.partial ? " (watchdog preparing teardown+respawn)" : ""),
        cfg
          ? `project "${cfg.project}" · repo ${cfg.repo} · command "${cfg.command || "pnpm run dev"}"`
          : "no config (checked <cwd>/.pi/dev-stack.json, then ~/.pi/agent/dev-stack.json activeProject)",
      ];
      if (cfg) {
        lines.push(`ports [${cfg.ports.join(", ")}]` + (cfg.emulatorPorts?.length ? ` · emulators [${cfg.emulatorPorts.join(", ")}]` : ""));
        if (cfg.openUrls?.length) lines.push(`openUrls: ${cfg.openUrls.join(", ")} (opened in Playwright on each successful launch)`);
        lines.push(
          "setup for other projects: copy dev-stack.ts into <project>/.pi/extensions/ and add " +
          ".pi/dev-stack.json { project, repo, command, ports, emulatorPorts?, taskName?, openUrls? } " +
          "— or register it in ~/.pi/agent/dev-stack.json projects{} + activeProject.",
        );
      }
      ctx.ui?.notify?.(lines.join("\n"), "info");
    },
  });
}
