/** Shared footer vocabulary for both modes (standalone paint / client segment).
 *  Types only, so the two implementations can live in separate files without
 *  importing each other. */

export interface FooterConn {
  readonly status: "connected" | "connecting" | "disconnected";
  onStatus(cb: () => void): () => void;
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
}

export interface BranchEntry {
  type: string;
  message?: { role?: string; usage?: { input: number; output: number; cost: { total: number } } };
}

export interface FooterHost {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ui?: any;
  sessionManager: { getBranch(): BranchEntry[] };
  model?: { id?: string } | null;
  getContextUsage?: () =>
    { tokens: number | null; contextWindow: number; percent: number | null } | undefined;
}

/** The host's published footer registry (structural copy — no cross-import).
 *  `contribute`/`register` return the unregister, so a plugin never has to
 *  track ids to clean up. */
export interface StackFooterApi {
  version: number;
  register(seg: {
    id: string;
    side?: "left" | "right";
    order?: number;
    render(
      theme: { fg(kind: string, text: string): string },
      ctx: { cwd?: string; model?: { id?: string } | null },
    ): string;
    onClick?: () => void;
    watch?: (requestRender: () => void) => () => void;
  }): () => void;
  onChange(cb: () => void): () => void;
}

export const HA_SEGMENT_ID = "human-assist";
