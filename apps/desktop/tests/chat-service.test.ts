import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  setChatRuntimeFactory,
  setChatEventListener,
  sendChat,
  abortChat,
  closeChat,
  isChatBusy,
  isChatConfigured,
  type ChatEvent,
  type ChatRuntime,
} from "../src/chat-service";

function makeRuntime(
  script: (text: string, emit: (e: ChatEvent) => void) => Promise<void> | void,
): ChatRuntime & { calls: string[]; aborted: number; disposed: number } {
  const rt = {
    calls: [] as string[],
    aborted: 0,
    disposed: 0,
    async prompt(text: string, emit: (e: ChatEvent) => void) {
      rt.calls.push(text);
      await script(text, emit);
    },
    abort() {
      rt.aborted++;
    },
    dispose() {
      rt.disposed++;
    },
  };
  return rt;
}

describe("chat-service", () => {
  let events: Array<[string, ChatEvent]>;
  beforeEach(() => {
    events = [];
    setChatEventListener((id, e) => {
      events.push([id, e]);
    });
  });

  it("reports unconfigured runtime honestly", async () => {
    setChatRuntimeFactory(null);
    expect(isChatConfigured()).toBe(false);
    await sendChat("c1", "hi");
    expect(events[0][1].kind).toBe("error");
    expect(events[0][1].text).toContain("CHAT_001");
  });

  it("streams deltas then done, reusing one runtime per chat session", async () => {
    const rt = makeRuntime(async (t, emit) => {
      emit({ kind: "delta", text: "Hel" });
      emit({ kind: "delta", text: "lo" });
      void t;
    });
    const factory = vi.fn(async () => rt);
    setChatRuntimeFactory(factory);
    await sendChat("c1", "hi");
    await sendChat("c1", "again");
    expect(events.filter(([, e]) => e.kind === "delta").map(([, e]) => e.text)).toEqual([
      "Hel",
      "lo",
      "Hel",
      "lo",
    ]);
    expect(events.filter(([, e]) => e.kind === "done")).toHaveLength(2);
    expect(factory).toHaveBeenCalledTimes(1); // one agent session per chat id
    expect(rt.calls).toEqual(["hi", "again"]);
  });

  it("rejects concurrent sends on the same session (CHAT_002)", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const rt = makeRuntime(async (_t, emit) => {
      emit({ kind: "delta", text: "thinking" });
      await gate;
    });
    setChatRuntimeFactory(async () => rt);
    const p1 = sendChat("c2", "first");
    while (!isChatBusy("c2")) await Promise.resolve();
    const p2 = sendChat("c2", "second");
    await p2; // returns immediately with error event
    expect(events.some(([, e]) => e.kind === "error" && e.text.includes("CHAT_002"))).toBe(true);
    release();
    await p1;
  });

  it("aborts in-flight runs and reports empty-message input (CHAT_003)", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const rt = makeRuntime(async (_t, emit) => {
      emit({ kind: "delta", text: "x" });
      await gate;
    });
    setChatRuntimeFactory(async () => rt);
    const p = sendChat("c3", "long task");
    while (!isChatBusy("c3")) await Promise.resolve();
    abortChat("c3");
    await new Promise((r) => setTimeout(r, 0)); // let runtime creation settle
    expect(rt.aborted).toBe(1);
    release();
    await p;
    await sendChat("c3", "   ");
    expect(events.some(([, e]) => e.kind === "error" && e.text.includes("CHAT_003"))).toBe(true);
  });

  it("closeChat disposes the runtime so next send creates a fresh one", async () => {
    const r1 = makeRuntime(async () => {});
    const r2 = makeRuntime(async () => {});
    let first = true;
    setChatRuntimeFactory(async () => {
      const r = first ? r1 : r2;
      first = false;
      return r;
    });
    await sendChat("c4", "a");
    closeChat("c4");
    expect(r1.disposed).toBe(1);
    await sendChat("c4", "b");
    expect(r2.calls).toEqual(["b"]);
  });

  it("wraps factory/prompt throws as CHAT_004 error events", async () => {
    setChatRuntimeFactory(async () => {
      throw new Error("model down");
    });
    await sendChat("c5", "hi");
    expect(
      events.some(
        ([, e]) =>
          e.kind === "error" && e.text.includes("CHAT_004") && e.text.includes("model down"),
      ),
    ).toBe(true);
  });
});

it("passes endpoint/model/chatSessionId options through to the runtime factory", async () => {
  const seen: unknown[] = [];
  setChatRuntimeFactory(async (opts) => {
    seen.push(opts);
    return {
      async prompt(_t: string, emit: (e: { kind: string; text: string }) => void) {
        emit({ kind: "done", text: "" });
      },
      abort() {},
      dispose() {},
    };
  });
  await sendChat("chat-42", "hi", {
    cwd: "/repo",
    baseUrl: "http://100.83.1.126:1234/v1",
    modelId: "qwen3-8b",
  });
  expect(seen[0]).toEqual({
    cwd: "/repo",
    baseUrl: "http://100.83.1.126:1234/v1",
    modelId: "qwen3-8b",
    chatSessionId: "chat-42",
  });
  setChatRuntimeFactory(null);
});
