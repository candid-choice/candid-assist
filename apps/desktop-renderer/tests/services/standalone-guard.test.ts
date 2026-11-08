import { describe, it, expect, afterEach } from "vitest";
import { shouldStartLiveServices, isViewPortal } from "@/views/services/standalone-guard";
import { wsService } from "@/views/services/ws-service";

describe("standalone guard", () => {
  afterEach(() => {
    delete (window as unknown as { desktop?: unknown }).desktop;
  });

  it("plain browser tab starts no live services", () => {
    delete (window as unknown as { desktop?: unknown }).desktop;
    expect(shouldStartLiveServices()).toBe(false);
  });

  it("Electron window (bridge present) starts live services", () => {
    (window as unknown as { desktop: unknown }).desktop = { runtime: "electron" };
    expect(shouldStartLiveServices()).toBe(true);
  });

  it("non-electron runtime marker does not count", () => {
    (window as unknown as { desktop: unknown }).desktop = { runtime: "something-else" };
    expect(shouldStartLiveServices()).toBe(false);
  });
});

describe("view portal", () => {
  it("isViewPortal detects the flag", () => {
    expect(isViewPortal()).toBe(false);
  });
  const orig = window.location.search;
  function setParam(on: boolean) {
    // jsdom: rewrite search via history
    const url = new URL(window.location.href);
    if (on) url.searchParams.set("viewPortal", "1");
    else url.searchParams.delete("viewPortal");
    window.history.replaceState({}, "", url.toString());
  }

  afterEach(() => setParam(false));

  it("?viewPortal=1 starts live services (observation) without a bridge", () => {
    delete (window as unknown as { desktop?: unknown }).desktop;
    setParam(true);
    expect(shouldStartLiveServices()).toBe(true);
  });

  it("view portal send() refuses state-changing messages", () => {
    setParam(true);
    expect(wsService.send({ type: "permission:respond", id: "x", decision: "once" })).toBe(false);
    expect(wsService.send({ type: "process:control", id: "p", action: "kill" })).toBe(false);
    expect(wsService.send({ type: "handoff:complete", surfaceId: "s" })).toBe(false);
  });
});
