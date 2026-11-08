/** Human-initiated surface creation (tab-bar “+”, main side). */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  __manualSurfaceCreate,
  __listSurfacesForTest,
  __resetSurfacesForTest,
  permissionBroker,
} from "@/mcp-server";

describe("__manualSurfaceCreate (human-initiated)", () => {
  let ensureSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    __resetSurfacesForTest();
    ensureSpy = vi.spyOn(permissionBroker, "ensure");
  });
  afterEach(() => {
    __resetSurfacesForTest();
    vi.restoreAllMocks();
  });

  it("opens a browser surface WITHOUT touching the consent gate", async () => {
    const res = (await __manualSurfaceCreate({
      surfaceType: "browser",
      url: "https://manual.example.com/x",
      sessionId: "sess-manual",
    })) as { surfaceId: string; status: string };
    expect(res.status).toBe("opened");
    expect(__listSurfacesForTest()).toContain(res.surfaceId);
    // A human typed the URL — consent gates AGENT navigations only.
    expect(ensureSpy).not.toHaveBeenCalled();
  });

  it("rejects non-http(s) browser urls", async () => {
    await expect(
      __manualSurfaceCreate({ surfaceType: "browser", url: "file:///etc/passwd" }),
    ).rejects.toThrow(/http\(s\)/);
  });

  it("rejects unknown surface types", async () => {
    await expect(__manualSurfaceCreate({ surfaceType: "bogus" })).rejects.toThrow(/Unsupported/);
  });

  it("opens the non-URL surfaces directly", async () => {
    for (const surfaceType of ["process", "canvas", "threed", "screen"]) {
      const res = (await __manualSurfaceCreate({ surfaceType })) as {
        surfaceId: string;
      };
      expect(res.surfaceId).toBeTruthy();
      expect(__listSurfacesForTest()).toContain(res.surfaceId);
    }
  });

  it("image requires a url", async () => {
    await expect(__manualSurfaceCreate({ surfaceType: "image" })).rejects.toThrow();
    const res = (await __manualSurfaceCreate({
      surfaceType: "image",
      url: "https://pics.example.com/a.png",
    })) as { surfaceId: string };
    expect(__listSurfacesForTest()).toContain(res.surfaceId);
  });
});
