/** Surface → session journal round-trip.

  The offline queue's `pushSurface` op must POST the embedded surface to the
  session and drop malformed entries. (Answering an agent's *question* used to
  live here as an "input surface"; that flow was removed — questions belong in
  the chat, where the harness already puts them.)
*/

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { executeSyncAction } from "@/views/services/sync/sync-service";
import { useStore } from "@/views/store";

function ok() {
  return { ok: true, status: 200, json: async () => ({}) } as Response;
}

function mockFetch(handler: (...args: unknown[]) => Promise<Response>) {
  const fn = vi.fn(handler);
  (globalThis as { fetch: unknown }).fetch = fn;
  return fn;
}

describe("executeSyncAction pushSurface", () => {
  beforeEach(() => {
    useStore.setState({ authToken: "t", sessions: [], activeSessionId: "sess-1" });
  });
  afterEach(() => vi.restoreAllMocks());

  it("POSTs the queued surface to the session", async () => {
    const fn = mockFetch(async () => ok());
    const embedded = {
      surfaceId: "surf_9",
      type: "canvas",
      url: null,
      prompt: "Review this diagram",
      createdAt: "2025-01-01T00:00:00Z",
      userResponse: { type: "approval" as const, text: "yes" },
      claudeResponse: null,
      closedAt: null,
    };

    await executeSyncAction({
      op: "pushSurface",
      data: { sessionId: "sess-1", surface: embedded },
    });

    const [url, init] = fn.mock.calls[0]!;
    expect(url).toBe("http://localhost:3601/sessions/sess-1/surfaces");
    expect(JSON.parse((init as RequestInit).body as string).surfaceId).toBe("surf_9");
  });

  it("drops pushSurface entries missing session/surface", async () => {
    const fn = mockFetch(async () => ok());
    await executeSyncAction({ op: "pushSurface", data: {} });
    expect(fn).not.toHaveBeenCalled();
  });
});
