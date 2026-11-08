/** SidebarContextMenu — redesigned menu contract.

Rows: Copy session ID / Archive (or Restore) / Mark dead / — / Delete.
Dismisses on Esc and on any outside pointerdown. Header shows the title.
*/

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

import { SidebarContextMenu } from "@/views/components/SidebarContextMenu";

const session = {
  id: "sess-1",
  title: "Anesthesiology rotations",
  status: "active",
  updatedAt: "2025-01-01T00:00:00Z",
  surfaceCount: 2,
};

function open(overrides = {}) {
  const props = {
    session,
    x: 120,
    y: 200,
    onClose: vi.fn(),
    onCopyId: vi.fn(),
    onArchive: vi.fn(),
    onMarkDead: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  render(<SidebarContextMenu {...props} />);
  return props;
}

afterEach(cleanup);

describe("SidebarContextMenu", () => {
  it("renders the four actions with the session title as header", () => {
    open();
    expect(screen.getByText("Anesthesiology rotations")).toBeTruthy();
    expect(screen.getByText("Copy session ID")).toBeTruthy();
    expect(screen.getByText("Archive")).toBeTruthy();
    expect(screen.getByText("Mark dead")).toBeTruthy();
    expect(screen.getByText("Delete session")).toBeTruthy();
    // The old bug rendered "Delete" twice — exactly one delete row now.
    expect(screen.getAllByText(/delete/i)).toHaveLength(1);
  });

  it("shows Restore for archived sessions", () => {
    open({ session: { ...session, archived: true } });
    expect(screen.getByText("Restore")).toBeTruthy();
    expect(screen.queryByText("Archive")).toBeNull();
  });

  it("invokes the action with the session id, then closes", () => {
    const p = open();
    fireEvent.click(screen.getByText("Delete session"));
    expect(p.onDelete).toHaveBeenCalledWith("sess-1");
    expect(p.onClose).toHaveBeenCalled();

    cleanup();
    const p2 = open();
    fireEvent.click(screen.getByText("Mark dead"));
    expect(p2.onMarkDead).toHaveBeenCalledWith("sess-1");
  });

  it("dismisses on Escape and on outside pointerdown", () => {
    const p = open();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(p.onClose).toHaveBeenCalledTimes(1);

    const outside = document.createElement("div");
    document.body.appendChild(outside);
    fireEvent.pointerDown(outside);
    expect(p.onClose).toHaveBeenCalledTimes(2);
    outside.remove();
  });

  it("is positioned at the click point", () => {
    render(<SidebarContextMenu session={session} x={123} y={456} onClose={() => {}} />);
    const el = screen.getByRole("menu") as HTMLElement;
    expect(el.style.left).toBe("123px");
    expect(el.style.top).toBe("456px");
  });
});
