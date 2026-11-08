/** Server manifest → native pi tools, with server-stamped agent identity.
 *
 * Every tool the desktop app advertises is registered under a snake_case
 * name. Identity args are stripped from the model-facing schema (see
 * schema.ts) and stamped by the connection on every call.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { HumanAssistConn } from "./conn.js";
import { snake, toTypeBox } from "./schema.js";

export interface ToolRegistry {
  /** Re-pull tools/list and register anything new. Returns tools advertised. */
  syncTools(): Promise<number>;
  readonly registered: Set<string>;
}

export function createToolRegistry(pi: ExtensionAPI, conn: HumanAssistConn): ToolRegistry {
  const registered = new Set<string>();

  async function syncTools(): Promise<number> {
    const tools = await conn.listTools();
    for (const t of tools) {
      if (!t?.name || registered.has(t.name)) continue;
      const name = snake(t.name);
      if (registered.has(name)) continue;
      registered.add(name);
      const schema = (t.inputSchema ?? { type: "object", properties: {} }) as Record<
        string,
        unknown
      >;
      const parameters = toTypeBox(schema);
      const original = t.name;
      pi.registerTool({
        name,
        label: t.name,
        description: t.description ?? `Human Assist desktop tool: ${t.name}`,
        parameters,
        async execute(_toolCallId, params, signal) {
          const abort = new Promise<never>((_, rej) => {
            signal?.addEventListener?.("abort", () =>
              rej(new Error(`human-assist ${original} aborted`)),
            );
          });
          const result = (await Promise.race([
            conn.callTool(original, (params ?? {}) as Record<string, unknown>),
            abort,
          ])) as {
            content?: Array<{ type: string; text?: string }>;
            isError?: boolean;
          };
          const text = (result?.content ?? [])
            .map((c) => (c.type === "text" ? (c.text ?? "") : `[${c.type}]`))
            .join("\n");
          return {
            content: [{ type: "text", text: text || "(empty result)" }],
            details: { tool: original, isError: !!result?.isError },
          };
        },
      });
    }
    return tools.length;
  }

  return { syncTools, registered };
}
