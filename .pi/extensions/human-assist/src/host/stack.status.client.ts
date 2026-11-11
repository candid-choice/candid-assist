/** Reading the dev-stack's readiness as a plugin.
 *
 *  Two transports, in order: the host's shared event bus (push, with the
 *  current value replayed to a late subscriber), then the pre-bus
 *  `__haStackStatus*` slots that older hosts still publish. Either way the
 *  plugin never imports the host — and with no host at all, `get()` returns a
 *  truthful "down" so a footer renders instead of throwing. */

import { HostClient } from "./host.client.js";
import type { StackActions, StackStatus } from "../status.js";

export class StackStatusClient {
  static get(): StackStatus {
    const g = globalThis as Record<string, unknown>;
    return (g.__haStackStatus as StackStatus) || { alive: false, env: "prod", changedAt: 0 };
  }

  /** Subscribe to readiness changes. Returns the unsubscribe. */
  static on(cb: (s: StackStatus) => void): () => void {
    const bus = new HostClient().events();
    if (bus) {
      // The bus only carries CHANGE events; a footer that has never painted
      // needs the current value too, so seed it when nothing has fired yet.
      const seeded = bus.peek("stack.status") !== undefined;
      const off = bus.on("stack.status", (p) => cb((p as StackStatus) ?? StackStatusClient.get()));
      if (!seeded) cb(StackStatusClient.get());
      return off;
    }
    const g = globalThis as Record<string, unknown>;
    if (!g.__haStackStatusListeners)
      g.__haStackStatusListeners = new Set<(s: StackStatus) => void>();
    const set = g.__haStackStatusListeners as Set<(s: StackStatus) => void>;
    set.add(cb);
    return () => set.delete(cb);
  }

  /** The host's supervised-output accessor, when a keeper is present. */
  static actions(): StackActions | undefined {
    return (globalThis as Record<string, unknown>).__haStackActions as StackActions | undefined;
  }
}
