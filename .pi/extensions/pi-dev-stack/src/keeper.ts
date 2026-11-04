/** The stack keeper: session-start (re)launch, port probing, crash
 *  watchdog (debounced + startup grace), openUrls on healthy. */

import { spawn } from "node:child_process";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { DevStackConfig } from "./config.js";
import { resolveSecret } from "./config.js";
import { health } from "./health.js";
import { forceKillPorts, logPathFor, readPid, rotateLog, startManaged, stopManaged } from "./process.js";
import { setStackStatus } from "./status.js";

const PROBE_MS = 20_000;
const CRASH_THROTTLE_MS = 90_000;
/** Consecutive failed probes required before a crash is acted on. */
const CRASH_CONFIRMATIONS = 2;
/** Grace after a spawn/relaunch: slow components (java firestore) bind
 *  last — never call a boot in progress a crash. */
const STARTUP_GRACE_MS = 90_000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class StackKeeper {
  private pi: ExtensionAPI | null = null;
  private ctx: ExtensionContext | null = null;
  cfg: DevStackConfig | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedSession = false;
  private wasHealthy = false;
  private crashStreak = 0;
  private startAttempts = 0;
  private lastActionAt = 0;
  private urlsOpenedForThisLaunch = false;

  attach(pi: ExtensionAPI, ctx: ExtensionContext, cfg: DevStackConfig | null): void {
    this.pi = pi;
    this.ctx = ctx;
    this.cfg = cfg;
  }

  notify(msg: string, level?: "info" | "warning" | "error"): void {
    this.ctx?.ui?.notify?.(msg, level);
  }

  private send(text: string): void {
    const pi = this.pi as unknown as { sendUserMessage?: (c: string, o?: { deliverAs?: "steer" | "followUp" }) => Promise<void> } | null;
    if (pi?.sendUserMessage) void pi.sendUserMessage(text, { deliverAs: "followUp" }).catch(() => { /* best effort */ });
  }

  async onSessionStart(): Promise<void> {
    if (this.startedSession) return;
    this.startedSession = true;
    const cfg = this.cfg;
    if (!cfg) {
      this.notify("dev-stack: no .pi/dev-stack.json (or global activeProject) — idle", "info");
      return;
    }
    setStackStatus({ logPath: logPathFor(cfg) });
    const h = await health(cfg);
    setStackStatus({ alive: h.up, env: h.emu ? "dev" : "prod", partial: !h.up && h.any });
    if (h.up) {
      // Session-start resync: kill whatever is running and relaunch, so
      // this session's keeper owns a fresh log it can tail and act on.
      this.wasHealthy = false;
      this.urlsOpenedForThisLaunch = false;
      setStackStatus({ alive: false, partial: false });
      const spawned = await this.teardownAndRelaunch(cfg);
      this.startAttempts = spawned ? 1 : 0;
      this.lastActionAt = Date.now();
      if (spawned) {
        this.notify(`dev-stack: restarted for session sync (pid ${spawned.pid}) → ${spawned.logPath} (previous log kept as .1)`, "info");
      } else {
        this.notify(`dev-stack: stack was up but RESTART FAILED to spawn — check ${logPathFor(cfg)}`, "error");
      }
    } else {
      const managed = readPid(cfg);
      if (managed) {
        this.notify(`dev-stack: managed pid ${managed} alive but ports down — watchdog will restart`, "warning");
        this.lastActionAt = Date.now();
      } else {
        const spawned = startManaged(cfg);
        if (spawned) {
          this.startAttempts = 1;
          this.lastActionAt = Date.now();
          this.notify(`dev-stack: spawned "${cfg.project}" stack (pid ${spawned.pid}) → ${spawned.logPath}`, "info");
        } else {
          this.notify(`dev-stack: FAILED to spawn "${cfg.project}" stack — check command/repo`, "error");
        }
      }
    }
    this.timer = setInterval(() => { void this.probe(); }, PROBE_MS);
    this.timer.unref?.();
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Tear the whole stack down and bring it back fresh (log rotated). */
  async teardownAndRelaunch(c: DevStackConfig): Promise<{ pid: number; logPath: string } | null> {
    const stopped = stopManaged(c);
    if (!stopped) {
      // Not ours (started by hand or an earlier keeper): scoped best-effort kill.
      try {
        const child = spawn("pkill", ["-f", `${c.project}.*concurrently`], { stdio: "ignore" });
        child.on("error", () => { /* not found */ });
      } catch {
        /* ignore */
      }
    }
    const deadline = Date.now() + 12_000;
    for (;;) {
      const h = await health(c);
      if (!h.any) break;
      if (Date.now() > deadline) break;
      await sleep(400);
    }
    // Evict stubborn survivors so the fresh launch can bind everything.
    forceKillPorts([...c.ports, ...(c.emulatorPorts ?? []), ...(c.teardownPorts ?? [])]);
    await sleep(500);
    rotateLog(logPathFor(c));
    return startManaged(c);
  }

  async restartNow(): Promise<{ pid: number; logPath: string } | null> {
    const c = this.cfg;
    if (!c) return null;
    stopManaged(c);
    const spawned = startManaged(c);
    this.urlsOpenedForThisLaunch = false;
    this.wasHealthy = false;
    this.crashStreak = 0;
    this.startAttempts = spawned ? 1 : 0;
    this.lastActionAt = Date.now();
    return spawned;
  }

  private openConfiguredUrls(c: DevStackConfig): void {
    if (!c.openUrls?.length || this.urlsOpenedForThisLaunch) return;
    this.urlsOpenedForThisLaunch = true;
    const list = c.openUrls.map((u) => `    - ${resolveSecret(u, c.repo)}`).join("\n");
    this.send(
      `[dev-stack] The "${c.project}" stack is up. Open these URLs in Playwright (each in its OWN new tab via ` +
      `browser_tabs action=new followed by browser_navigate — never reuse or replace existing tabs; skip any that ` +
      `are already open; do not wait for loads to finish):\n${list}\nConfirm the open tabs in one short line.`,
    );
  }

  private relaunch(c: DevStackConfig, why: string, missing: number[]): void {
    const now = Date.now();
    if (now - this.lastActionAt < CRASH_THROTTLE_MS) return;
    this.lastActionAt = now;
    this.startAttempts++;
    stopManaged(c);
    forceKillPorts([...c.ports, ...(c.emulatorPorts ?? []), ...(c.teardownPorts ?? [])]);
    const spawned = startManaged(c);
    this.urlsOpenedForThisLaunch = false;
    setStackStatus({ alive: false, partial: false });
    const logPath = logPathFor(c);
    this.send(
      `[dev-stack-watchdog] The "${c.project}" dev stack crashed (${why}; ports not answering: ` +
      `${missing.join(", ") || "all"}). I ${spawned ? `killed the managed process group, evicted held ports and respawned it (pid ${spawned.pid})` : "could NOT respawn it — check the log"}; ` +
      `log: ${logPath}. Read the LAST ~60 lines of that log now and act accordingly: report the root cause; ` +
      `if it is a code/config error, fix it (the watchdog brings the stack back on the next healthy probe); ` +
      `if the crash loop exceeds ${this.startAttempts} attempts, stop and ask me. Do not start another copy yourself.`,
    );
  }

  private async probe(): Promise<void> {
    const c = this.cfg;
    if (!c) return;
    try {
      const h = await health(c);
      setStackStatus({ alive: h.up, env: h.emu ? "dev" : "prod", partial: !h.up && h.any, logPath: logPathFor(c) });
      if (h.up) {
        this.crashStreak = 0;
        if (!this.wasHealthy) {
          this.startAttempts = 0;
          this.openConfiguredUrls(c);
        }
        this.wasHealthy = true;
        return;
      }
      if (this.wasHealthy) {
        if (Date.now() - this.lastActionAt < STARTUP_GRACE_MS) {
          setStackStatus({ partial: true }); // boot in progress, not a crash
          return;
        }
        this.crashStreak++;
        if (this.crashStreak < CRASH_CONFIRMATIONS) {
          setStackStatus({ partial: true });
          return; // not confirmed yet — sample again next probe
        }
        this.crashStreak = 0;
        this.relaunch(c, "watchdog: components lost", c.ports.filter((_, i) => !h.all[i]));
      } else if (this.startAttempts === 0) {
        const spawned = startManaged(c);
        if (spawned) {
          this.startAttempts = 1;
          this.lastActionAt = Date.now();
          this.send(
            `[dev-stack] "${c.project}" stack was not running — spawned it (pid ${spawned.pid}, log ${spawned.logPath}). ` +
            `Watch the log tail if it fails to become healthy within ~2 minutes; the keeper auto-restarts on crashes.`,
          );
        }
      }
    } catch {
      /* probe failures read as not-healthy; never throw */
    }
  }
}
