import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

import { PermissionGate } from "@/views/components/PermissionGate";
import { useStore } from "@/views/store";
import { wsService } from "@/views/services/ws-service";

function setPending(p: Record<string, string> | null) {
  act(() => {
    useStore.setState({ pendingPermission: p } as never);
  });
}

describe("PermissionGate", () => {
  afterEach(() => {
    cleanup();
    act(() => {
      useStore.setState({
        pendingPermission: null,
        browserGrants: [],
        grantsByProject: {},
        consentLog: [],
      } as never);
    });
    vi.restoreAllMocks();
  });

  it("renders nothing without a pending request", () => {
    render(<PermissionGate />);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("responds once/always/deny over ws and persists always-grants", () => {
    const send = vi.spyOn(wsService, "send").mockReturnValue(true);
    render(<PermissionGate />);

    setPending({
      id: "p1",
      host: "docs.google.com",
      url: "https://docs.google.com/drive",
      tool: "openBrowserSurface",
    });
    expect(screen.getByRole("alertdialog").textContent).toContain("docs.google.com");
    fireEvent.click(screen.getByText("Deny"));
    expect(send).toHaveBeenLastCalledWith({
      type: "permission:respond",
      id: "p1",
      decision: "deny",
    });

    setPending({
      id: "p2",
      host: "chatgpt.com",
      url: "https://chatgpt.com",
      tool: "browserNavigate",
    });
    fireEvent.click(screen.getByText("Always allow"));
    expect(send).toHaveBeenLastCalledWith({
      type: "permission:respond",
      id: "p2",
      decision: "always",
    });
    expect(useStore.getState().browserGrants).toContain("chatgpt.com");

    setPending({ id: "p3", host: "a.dev", url: "https://a.dev", tool: "x" });
    fireEvent.click(screen.getByText("Allow once"));
    expect(send).toHaveBeenLastCalledWith({
      type: "permission:respond",
      id: "p3",
      decision: "once",
    });
    expect(useStore.getState().browserGrants).not.toContain("a.dev");
  });

  it("grants persist across store instances (partialize includes browserGrants)", () => {
    act(() => {
      useStore.getState().addBrowserGrant("WWW.Docs.Google.com");
    });
    expect(useStore.getState().browserGrants).toEqual(["docs.google.com"]);
    // idempotent
    act(() => {
      useStore.getState().addBrowserGrant("docs.google.com");
    });
    expect(useStore.getState().browserGrants).toHaveLength(1);
  });
});
