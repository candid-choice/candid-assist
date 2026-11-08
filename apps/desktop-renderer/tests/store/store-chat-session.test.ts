import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "@/views/store";

describe("chat is session-owned (store lifecycle)", () => {
  beforeEach(() => {
    useStore.setState({
      sessions: [],
      chatIds: {},
      chatBySession: {},
      chatBusy: {},
      agentSessions: {},
      views: [],
      activeSessionId: null,
    });
  });

  const session = (id: string) =>
    ({
      id,
      userId: "u",
      title: id,
      status: "active",
      surfaces: [],
      createdAt: "t",
      updatedAt: "t",
      archivedAt: null,
    }) as never;

  it("removeSession deletes the session’s chat binding, transcript, and busy flag", () => {
    useStore.setState({
      sessions: [session("s1"), session("s2")],
      chatIds: { s1: "chat-1", s2: "chat-2" },
      chatBySession: {
        "chat-1": [{ id: "m", role: "user", text: "hi", ts: "t" }],
        "chat-2": [{ id: "m", role: "user", text: "other", ts: "t" }],
      },
      chatBusy: { "chat-1": true },
    });
    useStore.getState().removeSession("s1");
    const st = useStore.getState();
    expect(st.chatIds.s1).toBeUndefined();
    expect(st.chatBySession["chat-1"]).toBeUndefined();
    expect(st.chatBusy["chat-1"]).toBeUndefined();
    // the other session's chat is untouched
    expect(st.chatIds.s2).toBe("chat-2");
    expect(st.chatBySession["chat-2"]).toHaveLength(1);
  });

  it("deleteAllSessions wipes all chat state", () => {
    useStore.setState({
      sessions: [session("s1")],
      chatIds: { s1: "chat-1" },
      chatBySession: { "chat-1": [{ id: "m", role: "user", text: "hi", ts: "t" }] },
      chatBusy: { "chat-1": true },
    });
    useStore.getState().deleteAllSessions();
    const st = useStore.getState();
    expect(st.chatIds).toEqual({});
    expect(st.chatBySession).toEqual({});
    expect(st.chatBusy).toEqual({});
  });

  it("migrateChatId re-keys the binding (optimistic → backend id)", () => {
    useStore.setState({ chatIds: { "local-user-1": "chat-x" } });
    useStore.getState().migrateChatId("local-user-1", "doc-9");
    const st = useStore.getState();
    expect(st.chatIds["local-user-1"]).toBeUndefined();
    expect(st.chatIds["doc-9"]).toBe("chat-x");
    // transcript keyed by chat id is unaffected by the re-key
    expect(st.chatBySession).toEqual({});
  });
});
