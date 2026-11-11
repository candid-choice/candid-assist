/** How this plugin finds pi-dev-stack — and how it survives not finding it.
 *
 *  pi-dev-stack is an optional submodule and pi loads each extension as its
 *  own module graph, so there is no import between the two packages: the host
 *  announces capabilities on `globalThis`, and we read them here, in ONE place.
 *  Every other file asks `HostClient` and gets either a capability or
 *  `undefined`, which is the plugin's cue to run its standalone fallback.
 *
 *  Lookup order, newest contract first: the versioned capability registry, then
 *  the pre-registry `__piDevStack*` aliases (so a newer plugin still works
 *  against an older host), then nothing. */

export interface FooterCapability {
  contribute(segment: unknown): () => void;
  onChange(cb: () => void): () => void;
}

export interface EventsCapability {
  on(topic: string, handler: (payload: unknown) => void, replay?: boolean): () => void;
  emit(topic: string, payload?: unknown): number;
  peek(topic: string): unknown;
}

export interface HostApi {
  readonly version: number;
  readonly publishedAt: number;
  registerPlugin(manifest: unknown): { ok: boolean; detail: string };
  capability<T = unknown>(name: string, minVersion?: number): T | undefined;
  readonly events: EventsCapability;
  readonly footer: FooterCapability;
}

const CAPABILITY_STORE = "__piDevStackCapabilities";
const HOST_KEY = "__piDevStack";

export class HostClient {
  static create(): HostClient {
    return new HostClient();
  }

  /** A capability from the registry, refusing anything older than v`min`. */
  capability<T>(name: string, min = 1): T | undefined {
    const store = (globalThis as Record<string, unknown>)[CAPABILITY_STORE] as
      Map<string, { name: string; version: number; api: unknown }> | undefined;
    const found = store?.get(name);
    return found && found.version >= min ? (found.api as T) : undefined;
  }

  footer(): FooterCapability | undefined {
    const direct = this.capability<FooterCapability>("footer");
    if (direct && typeof direct.contribute === "function") return direct;
    const host = this.api();
    return host && typeof host.footer?.contribute === "function" ? host.footer : undefined;
  }

  events(): EventsCapability | undefined {
    const direct = this.capability<EventsCapability>("events");
    if (direct && typeof direct.on === "function") return direct;
    const host = this.api();
    return host && typeof host.events?.on === "function" ? host.events : undefined;
  }

  /** True when a host is publishing the footer row — the caller's signal to
   *  contribute a segment instead of painting its own. */
  hasFooterHost(): boolean {
    return this.footer() !== undefined;
  }

  /** The host's public API object, if any. */
  api(): HostApi | undefined {
    const host = (globalThis as Record<string, unknown>)[HOST_KEY] as HostApi | undefined;
    return host && typeof host.registerPlugin === "function" ? host : undefined;
  }

  /** For `/human-assist`: which contract we are actually running on. The
   *  fallback is a supported mode, but it should be VISIBLE, not a silent
   *  degradation that looks like a bug report. */
  describe(): string {
    const host = this.api();
    if (!host) return "standalone (no pi-dev-stack host detected)";
    return `pi-dev-stack host v${host.version} (published ${host.publishedAt})`;
  }
}
