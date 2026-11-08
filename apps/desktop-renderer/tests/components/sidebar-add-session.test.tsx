import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AppSidebar } from "@/views/components/AppSidebar";
import { useStore } from "@/views/store";

vi.mock("@/views/services/sync/sync-service", () => ({
  createSession: vi.fn(() => Promise.reject(new Error("offline"))),
}));
vi.mock("@/views/errors/offline-queue", () => ({
  queueAction: vi.fn(() => Promise.resolve("q")),
}));

describe("sidebar + Add session", () => {
  beforeEach(() => useStore.setState({ sessions: [], activeSessionId: null }));
  afterEach(cleanup);

  it("creates a user-owned session and selects it", () => {
    render(<AppSidebar open width={240} />);
    fireEvent.click(screen.getByRole("button", { name: /add session/i }));
    const st = useStore.getState();
    expect(st.sessions).toHaveLength(1);
    expect(st.activeSessionId).toBe(st.sessions[0].id);
    expect(st.sessions[0].agentSessionId).toBeUndefined(); // chat-capable
  });

  it("background click clears the selection", () => {
    const id = "sess-a";
    useStore.setState({
      sessions: [
        {
          id,
          userId: "u",
          title: "A",
          status: "active",
          surfaces: [],
          createdAt: "x",
          updatedAt: "x",
          archivedAt: null,
        },
      ],
      activeSessionId: id,
    });
    render(<AppSidebar open width={240} />);
    fireEvent.click(document.querySelector(".ha-sidebar-list") as HTMLElement);
    expect(useStore.getState().activeSessionId).toBeNull();
  });
});
