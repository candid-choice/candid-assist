/** pi-dev-stack — dev-stack keeper extension (thin adapter).
 *
 * Keeps a project's dev stack alive: supervised detached launch (no
 * external task-runner plugins), deep health (ports + HTTP probe),
 * debounced crash watchdog (group-kill + port eviction + respawn +
 * "read the log tail" injection), log-per-session resync on session
 * start, Playwright openUrls with ${VAR} login-bypass placeholders, and
 * an optional Slack bridge (run summaries out, prompts in, attachments
 * via the slack_send tool).
 *
 * Behaviour is 100% config-driven — see README.md in this package.
 * Resources start on session_start and stop on session_shutdown; the
 * extension factory registers surface only.
 *
 * Human Assist (browser surfaces/MCP) is a SEPARATE extension — this
 * package bundles only the dev-stack keeper. Status is shared via the
 * documented globalThis contract (__haStackStatus), no imports between
 * the two.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { loadConfig } from "./config.js";
import { logPathFor, readPid, tailLog } from "./process.js";
import { StackKeeper } from "./keeper.js";
import { SlackBridge } from "./slack.js";
import { getStackStatus } from "./status.js";

export { loadConfig, resolveSecret } from "./config.js";
export { getStackStatus, onStackStatus, setStackStatus } from "./status.js";

export default function (pi: ExtensionAPI) {
  // Reload safety: if pi re-runs this factory (/reload) without firing
  // session_shutdown for the previous instance, dispose the old keeper
  // (timers) and slack bridge so nothing runs doubled or orphaned.
  const g = globalThis as Record<string, unknown>;
  const prev = g.__piDevStackInstance as { keeper: StackKeeper; slack: SlackBridge } | undefined;
  if (prev) {
    try { prev.keeper.dispose(); } catch { /* ok */ }
    void prev.slack.stop().catch(() => { /* ok */ });
  }

  const keeper = new StackKeeper();
  const slack = new SlackBridge(pi);
  g.__piDevStackInstance = { keeper, slack };

  pi.on("session_start", async (_event, ctx) => {
    const cwd = (ctx as unknown as { cwd?: string }).cwd || process.cwd();
    const cfg = loadConfig(cwd);
    keeper.attach(pi, ctx, cfg);
    if (cfg) await slack.start(cfg, (m, k) => ctx.ui?.notify?.(m, k));
    await keeper.onSessionStart();
  });

  pi.on("agent_end", (event) => {
    void slack.onAgentEnd(event as unknown as Parameters<SlackBridge["onAgentEnd"]>[0]);
  });

  pi.on("session_shutdown", async () => {
    keeper.dispose();
    await slack.stop();
    if ((g.__piDevStackInstance as { keeper?: StackKeeper })?.keeper === keeper) {
      delete g.__piDevStackInstance;
    }
  });

  pi.registerTool({
    name: "slack_send",
    label: "Send to Slack",
    description:
      "Post a message to the configured Slack channel; optionally attach a file/image (absolute path, e.g. a screenshot captured during the task) as an attachment alongside the message.",
    parameters: Type.Object({
      text: Type.Optional(Type.String({ description: "Message text" })),
      file: Type.Optional(Type.String({ description: "Absolute path to an image/file to attach" })),
    }),
    async execute(_toolCallId, p) {
      const summary = await slack.send(p.text, p.file);
      return { content: [{ type: "text", text: summary }], details: {} };
    },
  });

  pi.registerCommand("dev-stack", {
    description: "Dev-stack keeper: status · 'logs [n]' to tail · 'restart' to cycle",
    handler: async (args, ctx) => {
      const cfg = keeper.cfg;
      const sub = String(args || "").trim().toLowerCase();
      if (!cfg) {
        ctx.ui?.notify?.("dev-stack: no config (checked <cwd>/.pi/dev-stack.json, ~/.pi/agent/dev-stack.json activeProject)", "warning");
        return;
      }
      const logPath = logPathFor(cfg);
      if (sub.startsWith("logs")) {
        const n = parseInt(sub.split(/\s+/)[1] || "40", 10) || 40;
        ctx.ui?.notify?.(`dev-stack log tail (${logPath}):\n${tailLog(logPath, n)}`, "info");
        return;
      }
      if (sub === "restart") {
        const spawned = await keeper.restartNow();
        ctx.ui?.notify?.(spawned ? `dev-stack: restarted (pid ${spawned.pid})` : "dev-stack: restart FAILED", spawned ? "info" : "error");
        return;
      }
      const s = getStackStatus();
      const pid = readPid(cfg);
      ctx.ui?.notify?.(
        [
          `dev-stack: ${s.alive ? "● up" : s.partial ? "◐ degraded" : "○ down"} · env ${s.env}` + (pid ? ` · managed pid ${pid}` : ""),
          `project "${cfg.project}" · repo ${cfg.repo} · command "${cfg.command || "pnpm run dev"}"`,
          `ports [${cfg.ports.join(", ")}]` + (cfg.emulatorPorts?.length ? ` · emulators [${cfg.emulatorPorts.join(", ")}]` : ""),
          `log: ${logPath}  (… /dev-stack logs)`,
          cfg.openUrls?.length ? `openUrls: ${cfg.openUrls.join(", ")}` : "",
          `slack: ${slack.active ? `connected → #${slack.channelName}` : "inactive"}`,
        ].filter(Boolean).join("\n"),
        "info",
      );
    },
  });
}
