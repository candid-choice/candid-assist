/** .pi/human-assist.json — read at session_start (trusted projects only). */

import { CONFIG_DIR_NAME } from "@earendil-works/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface HaConfig {
  wsUrl?: string;
  maxRetries?: number;
  footer?: boolean;
}

let cfg: HaConfig = {};

/** Precedence: HARNESS_MCP_WS_URL env > wsUrl in the file > default. */
export function loadConfig(cwd: string, trusted: boolean): void {
  cfg = {};
  if (!trusted) return;
  const path = join(cwd, CONFIG_DIR_NAME, "human-assist.json");
  if (!existsSync(path)) return;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    if (typeof raw.wsUrl === "string") cfg.wsUrl = raw.wsUrl;
    if (typeof raw.maxRetries === "number" && raw.maxRetries > 0)
      cfg.maxRetries = Math.floor(raw.maxRetries);
    if (typeof raw.footer === "boolean") cfg.footer = raw.footer;
  } catch (e) {
    // Malformed config must not break the session — fall back to defaults.
    console.warn(`[human-assist] ignoring invalid ${path}:`, e instanceof Error ? e.message : e);
  }
}

export function getConfig(): HaConfig {
  return cfg;
}
