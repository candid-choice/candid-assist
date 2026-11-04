/** Dev-stack keeper — self-contained, shareable pi extension (no plugins).
 *
 * Drop this ONE file into any project's .pi/extensions/ (or ~/.pi/agent/
 * extensions/) and it OWNS the project's dev stack lifecycle:
 *
 *  • Launch: stack down at session_start → spawns `command` itself
 *    (detached, own process group) with stdout+stderr appended to a
 *    known log file. No better-background-tasks or other plugin needed.
 *  • Watchdog: probes every configured port every 20s. Loss of ANY
 *    component after the stack was healthy = crash → kills the whole
 *    process group and respawns, then injects one action telling the
 *    model to read the log tail and act (fix compile errors, etc.).
 *  • Status: publishes { alive, env, partial, logPath } on globalThis so
 *    other extensions render it (human-assist footer: Dev ● / ◐ / ○).
 *  • openUrls: opened in Playwright tabs (each in its own new tab) every
 *    time the stack reaches healthy — initial launch and every restart.
 *
 * Config (first hit wins):
 *   1. <cwd>/.pi/dev-stack.json
 *   2. ~/.pi/agent/dev-stack.json — { "activeProject": "name",
 *      "projects": { "name": DevStackConfig } }   ← one session anywhere
 *      can keep the CONFIGURED project's stack alive.
 *   3. none → idles with a notify.
 *
 * DevStackConfig:
 *   {
 *     "project": "my-app",                       // display name (required)
 *     "repo": "/abs/path/to/my-app",             // stack cwd (required)
 *     "command": "pnpm run dev",                 // any stack-start command
 *     "ports": [3000, 5432],                     // EVERY port = healthy
 *     "emulatorPorts": [5432],                   // alive ⇒ env "Dev"
 *     "taskName": "my-app dev",                  // label (optional)
 *     "logFile": "/tmp/my-app-dev.log",          // default below
 *     "openUrls": ["http://localhost:3000"]      // Playwright on healthy
 *   }
 *   Defaults: command "pnpm run dev"; logFile
 *   <os.tmpdir()>/<project>-dev-stack.log.
 *
 * Commands: /dev-stack (status) · /dev-stack logs [n] (tail log) ·
 * /dev-stack restart (manual teardown + respawn).
 *
 * Status contract for other extensions (no import needed):
 *   globalThis.__haStackStatus = { alive, env, partial, changedAt, logPath }
 *   globalThis.__haStackStatusListeners = Set<(s)=>void>
 * This module also exports getStackStatus/onStackStatus/setStackStatus.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { connect } from "node:net";
import { existsSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

// ── Config ────────────────────────────────────────────────────────────────

interface DevStackConfig {
  project: string;
  repo: string;
  command?: string;
  ports: number[];
  emulatorPorts?: number[];
  taskName?: string;
  logFile?: string;
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
  partial?: boolean;
  logPath?: string;
}

function state(): StackStatus {
  const g = globalThis as Record<string, unknown>;
  if (!g[STATUS_KEY]) g[STATUS_KEY] = { alive: false, env: "prod", changedAt: Date.now() } as StackStatus;
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
    || (next.partial !== undefined && next.partial !== cur.partial)
    || (next.logPath !== undefined && next.logPath !== cur.logPath);
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

// ── Managed process (detached, own group, logged) ─────────────────────────

function pidFileFor(c: DevStackConfig): string {
  return join(tmpdir(), `${c.project.replace(/[^\w.-]/g, "_")}-dev-stack.pid`);
}

function readPid(path: string): number | null {
  try {
    const p = parseInt(readFileSync(path, "utf8").trim(), 10);
    if (!Number.isFinite(p) || p <= 1) return null;
    process.kill(p, 0); // liveness probe (EPERM counts as alive)
    return p;
  } catch {
    return null;
  }
}

function killGroup(pid: number): void {
  try { process.kill(-pid, "SIGTERM"); } catch { /* group may be gone */ }
  const t = setTimeout(() => {
    try { process.kill(-pid, "SIGKILL"); } catch { /* gone */ }
  }, 5_000) as ReturnType<typeof setTimeout> & { unref?: () => void };
  t.unref?.();
}

/** Stop our managed stack (whole process group), if any. */
function stopManaged(c: DevStackConfig): boolean {
  const pf = pidFileFor(c);
  const pid = readPid(pf);
  let stopped = false;
  if (pid) {
    killGroup(pid);
    stopped = true;
  }
  try { unlinkSync(pf); } catch { /* ok */ }
  return stopped;
}

/** Spawn the stack detached with combined stdout/stderr into logFile. */
function startManaged(c: DevStackConfig): { pid: number; logPath: string } | null {
  const logPath = c.logFile || join(tmpdir(), `${c.project.replace(/[^\w.-]/g, "_")}-dev-stack.log`);
  try { mkdirSync(c.repo, { recursive: true }); } catch { /* exists */ }
  const fd = openSync(logPath, "a");
  const cmd = c.command || "pnpm run dev";
  const [bin, ...rest] = cmd.split(/\s+/);
  try {
    const child = spawn(bin, rest, {
      cwd: c.repo,
      detached: true,
      stdio: ["ignore", fd, fd],
      env: { ...process.env },
    });
    if (!child.pid) return null;
    child.unref();
    writeFileSync(pidFileFor(c), String(child.pid), "utf8");
    writeFileSync(fd, `\n===== dev-stack keeper spawned pid ${child.pid} (${cmd}) ${new Date().toISOString()} =====\n`, "utf8");
    return { pid: child.pid, logPath };
  } catch {
    return null;
  }
}

function tailLog(path: string, n: number): string {
  try {
    const lines = readFileSync(path, "utf8").split("\n");
    return lines.slice(-Math.max(1, n)).join("\n");
  } catch {
    return "(log not readable yet)";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function logPathFor(c: DevStackConfig): string {
  return c.logFile || join(tmpdir(), `${c.project.replace(/[^\w.-]/g, "_")}-dev-stack.log`);
}

/** Keep one previous generation so each session starts a clean log. */
function rotateLog(path: string): void {
  try {
    if (existsSync(path) && readFileSync(path).length > 0) {
      renameSync(path, `${path}.1`);
    }
  } catch { /* best effort */ }
}

// ── Extension ─────────────────────────────────────────────────────────────

export default function devStack(pi: ExtensionAPI) {
  let started = false;
  let wasHealthy = false;
  let lastActionAt = 0;
  let urlsOpenedForThisLaunch = false;
  let startAttempts = 0;
  let cfg: DevStackConfig | null = null;

  const send = (text: string) => {
    const fn = (pi as unknown as { sendUserMessage?: (c: string, o?: { deliverAs?: "steer" | "followUp" }) => Promise<void> }).sendUserMessage;
    if (fn) void fn.call(pi, text, { deliverAs: "followUp" }).catch(() => { /* best effort */ });
  };

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

  /** Tear the whole stack down and bring it back exactly once. */
  const relaunch = (c: DevStackConfig, why: string, missing: number[]) => {
    const now = Date.now();
    if (now - lastActionAt < CRASH_THROTTLE_MS) return;
    lastActionAt = now;
    startAttempts++;
    const stopped = stopManaged(c);
    const spawned = startManaged(c);
    urlsOpenedForThisLaunch = false; // re-open on the next healthy
    setStackStatus({ alive: false, partial: false });
    const logPath = c.logFile || join(tmpdir(), `${c.project.replace(/[^\w.-]/g, "_")}-dev-stack.log`);
    send(
      `[dev-stack-watchdog] The "${c.project}" dev stack crashed (${why}; ports not answering: ` +
      `${missing.join(", ") || "all"}). I ${stopped ? "killed the managed process group and " : ""}` +
      `${spawned ? `respawned it (pid ${spawned.pid})` : "could NOT respawn it — check the log"}; log: ${logPath}. ` +
      `Read the LAST ~60 lines of that log now and act accordingly: report the root cause; if it is a code/config ` +
      `error, fix it (the watchdog will bring the stack back on its next healthy probe); if the crash loop exceeds ` +
      `${startAttempts} attempts, stop and ask me. Do not start another copy of the stack yourself.`,
    );
  };

  /** Kill the whole stack (managed group, or pattern fallback), wait for
   *  ports to release, rotate the log, and bring it back fresh. Used on
   *  session start so each pi session owns a synchronized log window. */
  const teardownAndRelaunch = async (c: DevStackConfig): Promise<{ pid: number; logPath: string } | null> => {
    const stopped = stopManaged(c);
    if (!stopped) {
      // Not ours (started by hand or an earlier process): best-effort
      // pattern kill — scoped to this project's concurrently tree.
      try {
        const child = spawn("pkill", ["-f", `${c.project}.*concurrently`], { stdio: "ignore" });
        child.on("error", () => { /* not found */ });
      } catch { /* ignore */ }
    }
    const deadline = Date.now() + 12_000;
    for (;;) {
      const h = await health(c);
      if (!h.any) break;
      if (Date.now() > deadline) break;
      await sleep(400);
    }
    rotateLog(logPathFor(c));
    return startManaged(c);
  };

  const probe = () => {
    if (!cfg) return;
    const c = cfg;
    void (async () => {
      try {
        const h = await health(c);
        const logPath = c.logFile || join(tmpdir(), `${c.project.replace(/[^\w.-]/g, "_")}-dev-stack.log`);
        setStackStatus({ alive: h.up, env: h.emu ? "dev" : "prod", partial: !h.up && h.any, logPath });
        if (h.up) {
          if (!wasHealthy) {
            startAttempts = 0;
            openConfiguredUrls(c);
          }
          wasHealthy = true;
          return;
        }
        if (wasHealthy) {
          relaunch(c, "watchdog: components lost", c.ports.filter((_, i) => !h.all[i]));
        } else if (startAttempts === 0) {
          // Never up since session start and nothing managed → launch once.
          const spawned = startManaged(c);
          if (spawned) {
            startAttempts = 1;
            lastActionAt = Date.now();
            send(
              `[dev-stack] "${c.project}" stack was not running — spawned it (pid ${spawned.pid}, ` +
              `log ${spawned.logPath}). Watch the log tail if it fails to become healthy within ~2 minutes; ` +
              `the keeper auto-restarts on crashes and will notify you.`,
            );
          }
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
      const logPath = cfg.logFile || join(tmpdir(), `${cfg.project.replace(/[^\w.-]/g, "_")}-dev-stack.log`);
      setStackStatus({ logPath });
      const h = await health(cfg);
      setStackStatus({ alive: h.up, env: h.emu ? "dev" : "prod", partial: !h.up && h.any });
      if (h.up) {
        // Session-start resync: kill whatever is running and relaunch, so
        // this session's keeper owns a fresh log it can tail and act on.
        wasHealthy = false;
        urlsOpenedForThisLaunch = false;
        setStackStatus({ alive: false, partial: false });
        const spawned = await teardownAndRelaunch(cfg);
        startAttempts = spawned ? 1 : 0;
        lastActionAt = Date.now();
        if (spawned) {
          ctx.ui?.notify?.(`dev-stack: restarted for session sync (pid ${spawned.pid}) → ${spawned.logPath} (previous log kept as .1)`, "info");
        } else {
          ctx.ui?.notify?.(`dev-stack: stack was up but RESTART FAILED to spawn — check ${logPath}`, "error");
        }
      } else {
        // Start it ourselves — no external supervisor required.
        const managed = readPid(pidFileFor(cfg));
        if (managed) {
          ctx.ui?.notify?.(`dev-stack: managed pid ${managed} alive but ports down — watchdog will restart`, "warning");
          lastActionAt = Date.now();
        } else {
          const spawned = startManaged(cfg);
          if (spawned) {
            startAttempts = 1;
            lastActionAt = Date.now();
            ctx.ui?.notify?.(`dev-stack: spawned "${cfg.project}" stack (pid ${spawned.pid}) → ${spawned.logPath}`, "info");
          } else {
            ctx.ui?.notify?.(`dev-stack: FAILED to spawn "${cfg.project}" stack — check command/repo`, "error");
          }
        }
      }
      const timer = setInterval(probe, PROBE_MS) as ReturnType<typeof setInterval> & { unref?: () => void };
      timer.unref?.();
    } catch {
      // Never block session start on this.
    }
  });

  pi.registerCommand("dev-stack", {
    description: "Dev-stack keeper: status · 'logs [n]' to tail · 'restart' to cycle",
    handler: async (args, ctx) => {
      const s = getStackStatus();
      const sub = String(args || "").trim().toLowerCase();
      if (!cfg) {
        ctx.ui?.notify?.("dev-stack: no config (checked <cwd>/.pi/dev-stack.json, ~/.pi/agent/dev-stack.json activeProject)", "warning");
        return;
      }
      const logPath = cfg.logFile || join(tmpdir(), `${cfg.project.replace(/[^\w.-]/g, "_")}-dev-stack.log`);
      if (sub.startsWith("logs")) {
        const n = parseInt(sub.split(/\s+/)[1] || "40", 10) || 40;
        ctx.ui?.notify?.(`dev-stack log tail (${logPath}):\n${tailLog(logPath, n)}`, "info");
        return;
      }
      if (sub === "restart") {
        stopManaged(cfg);
        const spawned = startManaged(cfg);
        urlsOpenedForThisLaunch = false;
        wasHealthy = false;
        startAttempts = spawned ? 1 : 0;
        ctx.ui?.notify?.(spawned ? `dev-stack: restarted (pid ${spawned.pid})` : "dev-stack: restart FAILED", spawned ? "info" : "error");
        return;
      }
      const pid = readPid(pidFileFor(cfg));
      ctx.ui?.notify?.(
        [
          `dev-stack: ${s.alive ? "● up" : s.partial ? "◐ degraded" : "○ down"} · env ${s.env}` +
            (pid ? ` · managed pid ${pid}` : ""),
          `project "${cfg.project}" · repo ${cfg.repo} · command "${cfg.command || "pnpm run dev"}"`,
          `ports [${cfg.ports.join(", ")}]` + (cfg.emulatorPorts?.length ? ` · emulators [${cfg.emulatorPorts.join(", ")}]` : ""),
          `log: ${logPath}  (… /dev-stack logs)`,
          cfg.openUrls?.length ? `openUrls: ${cfg.openUrls.join(", ")}` : "",
        ].filter(Boolean).join("\n"),
        "info",
      );
    },
  });
}
