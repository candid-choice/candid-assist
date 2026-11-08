import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Sidebar } from "@/views/components/Sidebar";
import type { SidebarSession } from "@/views/components/Sidebar";
import { toSidebarSession } from "@/views/components/AppSidebar";
import type { SessionDoc } from "@/views/services/sync/types";

const base: SessionDoc = {
  id: "s1",
  userId: "u",
  title: "pi · abc · 10:00",
  status: "active",
  createdAt: "x",
  updatedAt: "x",
  archivedAt: null,
  surfaces: [],
  agentSessionId: "pi-123",
  agentClient: "pi",
};

describe("agent presence graying", () => {
  it("toSidebarSession marks agent sessions offline when not live", () => {
    const live = new Set(["other-id"]);
    expect(toSidebarSession(base, live).connected).toBe(false);
    expect(toSidebarSession(base, new Set(["pi-123"])).connected).toBe(true);
    // unknown presence (undefined set) → no opinion
    expect(toSidebarSession(base).connected).toBeUndefined();
    // non-agent session → never grayed
    const { agentSessionId: _a, agentClient: _c, ...plain } = base;
    expect(toSidebarSession(plain as SessionDoc, live).connected).toBeUndefined();
  });

  it("Sidebar applies the offline class only for connected === false", () => {
    const sessions: SidebarSession[] = [
      {
        id: "on",
        title: "Online session",
        status: "active",
        updatedAt: "x",
        surfaceCount: 0,
        connected: true,
      },
      {
        id: "off",
        title: "Offline session",
        status: "active",
        updatedAt: "x",
        surfaceCount: 0,
        connected: false,
      },
    ];
    cleanup();
    render(
      <Sidebar
        open
        width={240}
        onToggle={() => {}}
        sessions={sessions}
        onSessionClick={() => {}}
      />,
    );
    const on = screen.getByText("Online session").closest(".ha-sidebar-item");
    const off = screen.getByText("Offline session").closest(".ha-sidebar-item");
    expect(on!.className).not.toContain("ha-sidebar-item--offline");
    expect(off!.className).toContain("ha-sidebar-item--offline");
  });
});
