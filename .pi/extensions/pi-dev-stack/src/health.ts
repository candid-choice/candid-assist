/** Port + deep-health probing. */

import { connect } from "node:net";
import type { DevStackConfig } from "./config.js";

export function portOpen(port: number, timeoutMs = 1_200): Promise<boolean> {
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

export async function deepHealth(cfg: DevStackConfig): Promise<boolean> {
  if (!cfg.healthUrl) return true;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3_000);
    const res = await fetch(cfg.healthUrl, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return false;
    const body = await res.text();
    return (cfg.healthContains ?? []).every((s) => body.includes(s));
  } catch {
    return false;
  }
}

export interface StackHealth {
  up: boolean;
  any: boolean;
  all: boolean[];
  emu: boolean;
}

export async function health(cfg: DevStackConfig): Promise<StackHealth> {
  const all = await Promise.all(cfg.ports.map((p) => portOpen(p)));
  let emu = false;
  if (cfg.emulatorPorts && cfg.emulatorPorts.length) {
    const e = await Promise.all(cfg.emulatorPorts.map((p) => portOpen(p, 600)));
    emu = e.every(Boolean);
  }
  const portsUp = all.every(Boolean);
  const deep = portsUp ? await deepHealth(cfg) : false;
  return { up: portsUp && deep, any: all.some(Boolean), all, emu };
}
