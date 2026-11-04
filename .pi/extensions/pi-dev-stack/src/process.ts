/** Process management for the supervised dev stack: detached spawn with
 *  combined logging, deterministic teardown (group kill + port eviction),
 *  log rotation and tailing. */

import { existsSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DevStackConfig } from "./config.js";

export function logPathFor(c: DevStackConfig): string {
  return c.logFile || join(tmpdir(), `${c.project.replace(/[^\w.-]/g, "_")}-dev-stack.log`);
}

function pidFileFor(c: DevStackConfig): string {
  return join(tmpdir(), `${c.project.replace(/[^\w.-]/g, "_")}-dev-stack.pid`);
}

export function readPid(c: DevStackConfig): number | null {
  try {
    const p = parseInt(readFileSync(pidFileFor(c), "utf8").trim(), 10);
    if (!Number.isFinite(p) || p <= 1) return null;
    process.kill(p, 0); // liveness probe (EPERM counts as alive)
    return p;
  } catch {
    return null;
  }
}

function ownPgid(): number {
  try {
    return parseInt(execSync(`ps -o pgid= -p ${process.pid}`, { timeout: 2_000 }).toString().trim(), 10);
  } catch {
    return -1;
  }
}

function killTree(pid: number): void {
  // Non-group-leader: never negative-kill a group we don't own — walk the
  // child tree (pgrep -P) and signal only our own descendants' lineage.
  let kids: number[] = [];
  try {
    kids = execSync(`pgrep -P ${pid}`, { timeout: 2_000 }).toString().split("\n").map((x) => parseInt(x.trim(), 10)).filter((n) => Number.isFinite(n) && n > 1);
  } catch { /* no children */ }
  for (const k of kids) killTree(k);
  try { process.kill(pid, "SIGTERM"); } catch { /* gone */ }
  const t = setTimeout(() => { try { process.kill(pid, "SIGKILL"); } catch { /* gone */ } }, 5_000);
  t.unref?.();
}

/** Verify the pidfile actually belongs to our stack before killing. */
function pidLooksOurs(pid: number, project: string): boolean {
  try {
    const cmd = execSync(`ps -o command= -p ${pid}`, { timeout: 2_000 }).toString();
    return /pnpm|concurrently|pnpm run dev/.test(cmd) && (cmd.includes(project) || /pnpm run dev|concurrently/.test(cmd));
  } catch {
    return false;
  }
}

function killGroup(pid: number, project: string): void {
  if (!pidLooksOurs(pid, project)) return; // stale/hijacked pidfile — never kill blindly
  let pgid = NaN;
  try {
    pgid = parseInt(execSync(`ps -o pgid= -p ${pid}`, { timeout: 2_000 }).toString().trim(), 10);
  } catch { /* gone */ }
  const mine = ownPgid();
  if (Number.isFinite(pgid) && pgid > 1 && pgid === mine) {
    // Safety: the stack must never share pi's own process group.
    return;
  }
  if (Number.isFinite(pgid) && pgid === pid) {
    // Proper group leader (spawned detached): clean group kill.
    try { process.kill(-pid, "SIGTERM"); } catch { /* gone */ }
    const t = setTimeout(() => { try { process.kill(-pid, "SIGKILL"); } catch { /* gone */ } }, 5_000);
    t.unref?.();
    return;
  }
  // Not a group leader (e.g. legacy nohup launch): kill the descendant
  // tree only — negative-killing someone else's group can hit the
  // terminal's foreground job.
  killTree(pid);
}

/** Deterministic teardown: kill whatever still holds the stack's ports —
 *  group-kill misses survivors (firestore java child, stale emulator
 *  hubs) which then block the next launch with "port taken". */
export function forceKillPorts(ports: number[]): void {
  for (const p of ports) {
    try {
      const out = execSync(`lsof -ti :${p}`, { timeout: 2_000 }).toString();
      for (const pid of out.split("\n").map((x) => parseInt(x.trim(), 10))) {
        if (Number.isFinite(pid) && pid > 1) {
          try {
            process.kill(pid, "SIGKILL");
          } catch {
            /* gone */
          }
        }
      }
    } catch {
      /* port already free */
    }
  }
}

/** Stop our managed stack (whole process group), if any. */
export function stopManaged(c: DevStackConfig): boolean {
  const pid = readPid(c);
  let stopped = false;
  if (pid) {
    killGroup(pid, c.project);
    stopped = true;
  }
  try {
    unlinkSync(pidFileFor(c));
  } catch {
    /* ok */
  }
  return stopped;
}

/** Spawn the stack detached with combined stdout/stderr into logFile. */
export function startManaged(c: DevStackConfig): { pid: number; logPath: string } | null {
  const logPath = logPathFor(c);
  try {
    mkdirSync(c.repo, { recursive: true });
  } catch {
    /* exists */
  }
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

/** Keep one previous generation so each session starts a clean log. */
export function rotateLog(path: string): void {
  try {
    if (existsSync(path) && readFileSync(path).length > 0) {
      renameSync(path, `${path}.1`);
    }
  } catch {
    /* best effort */
  }
}

export function tailLog(path: string, n: number): string {
  try {
    const lines = readFileSync(path, "utf8").split("\n");
    return lines.slice(-Math.max(1, n)).join("\n");
  } catch {
    return "(log not readable yet)";
  }
}
