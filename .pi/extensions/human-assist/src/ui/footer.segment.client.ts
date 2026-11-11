/** The footer as a CLIENT of the host: contribute one " ha ●" segment and let
 *  pi-dev-stack lay out and paint the row.
 *
 *  pi's `ctx.ui.setFooter()` is a single slot, so if two extensions paint it the
 *  winner is decided by load order. pi-dev-stack therefore owns the row and
 *  publishes a `footer` capability (falling back to its pre-registry
 *  `__piDevStackFooter` alias); we contribute and it renders. The dependency
 *  points one way — plugin → host — and `StandaloneFooter` runs only when
 *  nothing published a footer at all. */

import { HostClient } from "../host/host.client.js";
import { FooterText } from "./footer.text.js";
import { HA_SEGMENT_ID, type FooterConn, type StackFooterApi } from "./footer.types.js";

export class FooterSegmentClient {
  static readonly SEGMENT_ID = HA_SEGMENT_ID;

  private static shared: FooterSegmentClient | undefined;

  /** One instance per process: the row carries a single HA segment, and a
   *  second instance registering a second copy is the bug this prevents. */
  static instance(): FooterSegmentClient {
    if (!FooterSegmentClient.shared) FooterSegmentClient.shared = new FooterSegmentClient();
    return FooterSegmentClient.shared;
  }

  private unregister: (() => void) | null = null;
  private registeredFor: FooterConn | null = null;

  /** The host's footer registry, or undefined when there is no host — the
   *  caller's cue to fall back to painting its own row. */
  api(): StackFooterApi | undefined {
    // Preferred path: the host's versioned capability. We contribute; the
    // registry lays out the row.
    const capability = new HostClient().footer();
    if (capability) {
      return {
        version: 1,
        register: (seg) => capability.contribute(seg),
        onChange: (cb) => capability.onChange(cb),
      };
    }
    // Older host: the pre-registry alias still works.
    const legacy = (globalThis as Record<string, unknown>).__piDevStackFooter as
      StackFooterApi | undefined;
    return legacy &&
      typeof legacy.register === "function" &&
      typeof legacy.version === "number" &&
      legacy.version >= 1
      ? legacy
      : undefined;
  }

  /** Register our segment. Idempotent per connection; returns true when the
   *  host owns the row (the caller then must NOT paint its own footer).
   *
   *  Call again after `/reload` or `/human-assist refresh`: the host withdraws
   *  on session_shutdown, and our session_start runs BEFORE the host's
   *  (alphabetical load order), so a first attempt may legitimately find
   *  nothing. */
  register(conn: FooterConn, onActivate: () => void): boolean {
    const api = this.api();
    if (!api) return false;
    if (this.registeredFor === conn) return true;
    try {
      this.unregister?.();
    } catch {
      /* the previous registration may already be gone */
    }
    try {
      this.unregister = api.register({
        id: HA_SEGMENT_ID,
        side: "left",
        order: 10, // first client segment, right after the host's own " dev ●"
        render: (theme) => {
          const dot = FooterText.dot(conn.status);
          return theme.fg(FooterText.dotColor(conn.status), ` ha ${dot}`);
        },
        // Click → inspect the desktop traffic (what we sent, what came back).
        onClick: () => {
          try {
            onActivate();
          } catch {
            /* a click must never break the row */
          }
        },
        watch: (requestRender) => conn.onStatus(requestRender),
      });
      this.registeredFor = conn;
      return true;
    } catch {
      return false;
    }
  }

  /** True when our segment is live in the host's row. */
  isRegistered(conn: FooterConn): boolean {
    return this.registeredFor === conn && !!this.unregister;
  }
}
