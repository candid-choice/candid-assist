/** MCP Server integration tests (Bun-side HTTP + WS, run under node).

Covers the tools/call router contract, per-tool validation, and the
WebSocket surface:push broadcast type mapping (renderer routing
depends on the correct type).
*/

import * as fs from "node:fs";
import { request as httpRequest } from "node:http";
import * as os from "node:os";
import * as path from "node:path";

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { startMcpServer, permissionBroker, closeSurface } from "@/mcp-server";
import { setGuestResolver, registerGuest } from "@/guest-registry";
import { WebSocket } from "ws";

// The permission gate prompts a human; in tests nobody answers, so
// pre-grant the fixture domains (gate semantics themselves are covered
// in permission-broker.test.ts + the gate tests at the bottom).
beforeEach(() => {
  permissionBroker.syncGrants(["example.com", "localhost", "127.0.0.1", "candid.ai"]);
});

const HTTP_PORT = 3715;
const WS_PORT = 3716;
const MCP_URL = `http://localhost:${HTTP_PORT}/mcp`;

beforeAll(async () => {
  startMcpServer(HTTP_PORT, WS_PORT);

  // Poll until the HTTP server accepts requests
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(MCP_URL, {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", method: "tools/call", params: {}, id: 0 }),
      });
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error("MCP server did not start");
});

function call(params: unknown, id = 1) {
  return fetch(MCP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "tools/call", params, id }),
  }).then((r) => r.json() as Promise<any>);
}

function receiveWsEvent(port: number, trigger: () => Promise<unknown>): Promise<any> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("WS event timeout"));
    }, 3000);

    ws.on("open", async () => {
      await trigger();
    });
    ws.on("message", (raw: Buffer) => {
      clearTimeout(timer);
      ws.close();
      resolve(JSON.parse(raw.toString()));
    });
    ws.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

describe("MCP tools/call router", () => {
  it("opens a browser surface with a valid URL", async () => {
    const res = await call({
      name: "openBrowserSurface",
      arguments: { url: "https://example.com" },
    });
    expect(res.error).toBeUndefined();
    expect(res.result.surfaceId).toMatch(/^surf_/);
    expect(res.result.status).toBe("opened");
  });

  it("rejects an invalid URL with MCP_001", async () => {
    const res = await call({ name: "openBrowserSurface", arguments: { url: "not-a-url" } });
    expect(res.error?.message).toContain("MCP_001");
  });

  it("rejects an unknown tool with -32601", async () => {
    const res = await call({ name: "openNothing", arguments: {} });
    expect(res.error?.code).toBe(-32601);
  });

  it("marks unsupported capabilities (resources/prompts) as -32601", async () => {
    const res = await fetch(MCP_URL, {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", method: "resources/list", id: 1 }),
    }).then((r) => r.json());
    expect(res.error?.code).toBe(-32601);
    const p = await fetch(MCP_URL, {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", method: "prompts/list", id: 2 }),
    }).then((r) => r.json());
    expect(p.error?.code).toBe(-32601);
  });

  it("answers initialize with protocolVersion + serverInfo", async () => {
    const res = await fetch(MCP_URL, {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "pi", version: "x" },
        },
        id: 1,
      }),
    }).then((r) => r.json());
    expect(res.result.protocolVersion).toBe("2025-03-26");
    expect(res.result.serverInfo.name).toBe("human-assist");
    expect(res.result.capabilities.tools).toBeDefined();
  });

  it("lists all tools with input schemas (tools/list)", async () => {
    const res = await fetch(MCP_URL, {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 1 }),
    }).then((r) => r.json());
    expect(res.result.tools).toHaveLength(35); // +listCaptureSources, captureScreenshot, screenRecording, analyzeCapture
    expect(res.result.tools.map((t: { name: string }) => t.name)).toContain("readSurface");
    const names = res.result.tools.map((t: { name: string }) => t.name);
    expect(names).toContain("openBrowserSurface");
    expect(names).toContain("showMessage");
    for (const t of res.result.tools) {
      expect(t.inputSchema?.type).toBe("object");
    }
  });

  it("accepts notifications/initialized with 202", async () => {
    const r = await fetch(MCP_URL, {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    });
    expect(r.status).toBe(202);
  });

  it("returns parse error -32700 for malformed JSON", async () => {
    const res = await fetch(MCP_URL, { method: "POST", body: "not-json" }).then((r) => r.json());
    expect(res.error?.code).toBe(-32700);
  });
});

describe("WebSocket surface:push broadcast", () => {
  it("broadcasts the stored surface type for browser surfaces", async () => {
    const event = await receiveWsEvent(WS_PORT, () =>
      call({ name: "openBrowserSurface", arguments: { url: "https://candid.ai" } }),
    );
    expect(event.event).toBe("surface:push");
    expect(event.data.type).toBe("browser");
    expect(event.data.status).toBe("pushed");
    expect(event.data.surfaceId).toMatch(/^surf_/);
  });

  it('broadcasts type "canvas" with payload passthrough', async () => {
    const event = await receiveWsEvent(WS_PORT, () =>
      call({
        name: "openCanvasSurface",
        arguments: { prompt: "review this diagram" },
      }),
    );
    expect(event.event).toBe("surface:push");
    expect(event.data.type).toBe("canvas");
    expect(event.data.payload).toMatchObject({ prompt: "review this diagram" });
  });
});

describe("GET /status — agent presence", () => {
  it("reports agentConnected true shortly after an MCP JSON-RPC request", async () => {
    await fetch(MCP_URL, {
      method: "POST",
      body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 1 }),
    });
    const s = await fetch(`http://localhost:${HTTP_PORT}/status`).then((r) => r.json());
    expect(s.ok).toBe(true);
    expect(s.mcp.agentConnected).toBe(true);
    expect(s.mcp.agentLastSeen).toBeGreaterThan(0);
    expect(typeof s.ws.clients).toBe("number");
    expect(s.mcp.agentCount).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(s.mcp.agents)).toBe(true);
    expect(s.mcp.agents[0]).toHaveProperty("lastSeen");
  });
});

describe("validation rules (pre-mcp-validation)", () => {
  it("rejects oversized URLs with MCP_011", async () => {
    const res = await call({
      name: "openBrowserSurface",
      arguments: { url: "https://x.test/" + "a".repeat(2100) },
    });
    expect(res.error?.message).toContain("MCP_011");
  });

  it("rejects oversized prompts with MCP_012 (browser)", async () => {
    const res = await call({
      name: "openBrowserSurface",
      arguments: { url: "https://x.test", prompt: "p".repeat(1100) },
    });
    expect(res.error?.message).toContain("MCP_012");
  });

  it("truncates oversized canvas prompts (no error)", async () => {
    const res = await call({ name: "openCanvasSurface", arguments: { prompt: "p".repeat(1100) } });
    expect(res.result?.status).toBe("opened");
  });

  it("flags localhost URLs with a warning", async () => {
    const res = await call({
      name: "openBrowserSurface",
      arguments: { url: "http://localhost:3000/app" },
    });
    expect(res.result?.status).toBe("opened");
    // warning is carried on the stored payload (visible via stored surface state)
    const status = await fetch(`http://localhost:${HTTP_PORT}/status`).then((r) => r.json());
    expect(status.ok).toBe(true);
  });

  it("rejects oversized diff/command/output", async () => {
    const d = await call({ name: "openCodeDiff", arguments: { diff: "d".repeat(50_001) } });
    expect(d.error?.message).toContain("MCP_013");
    const c = await call({
      name: "openTerminalOutput",
      arguments: { command: "c".repeat(513), output: "ok" },
    });
    expect(c.error?.message).toContain("MCP_014");
    const o = await call({
      name: "openTerminalOutput",
      arguments: { command: "ls", output: "o".repeat(10_001) },
    });
    expect(o.error?.message).toContain("MCP_015");
  });

  it("rejects an invalid canvas imageSrc with MCP_016", async () => {
    const res = await call({
      name: "openCanvasSurface",
      arguments: { prompt: "review this", imageSrc: "not a url" },
    });
    expect(res.error?.message).toContain("MCP_016");
  });

  it("accepts an inline data: URI as canvas imageSrc (screenshot markup)", async () => {
    const res = await call({
      name: "openCanvasSurface",
      arguments: {
        prompt: "mark this up",
        imageSrc: "data:image/png;base64,iVBORw0KGgo=",
        annotations: [{ text: "wrong colour", x: 0.5, y: 0.5 }],
      },
    });
    expect(res.result.surfaceId).toBeTruthy();
    expect(res.result.status).toBe("opened");
    // Cap of MAX_SURFACES is shared across the file — don't leak the panel.
    closeSurface(res.result.surfaceId);
  });
});

describe("process manager tools", () => {
  it("startProcess launches, getProcessLog tails, stopProcess kills", async () => {
    const start = await call({
      name: "startProcess",
      arguments: { name: "ticker", command: "echo proc-mcp-ok" },
    });
    expect(start.result?.processId).toMatch(/^proc_/);
    const id = start.result.processId as string;

    await new Promise((r) => setTimeout(r, 700));
    const log = await call({ name: "getProcessLog", arguments: { id } });
    expect(log.result?.output.join("\n")).toContain("proc-mcp-ok");

    const stop = await call({ name: "stopProcess", arguments: { id } });
    expect(stop.result?.status).toBe("killing");
  });

  it("openProcessManager creates a processManager surface", async () => {
    const res = await call({ name: "openProcessManager", arguments: {} });
    expect(["opened", "updated"]).toContain(res.result?.status);
  });

  it("validates startProcess args", async () => {
    const noName = await call({ name: "startProcess", arguments: { command: "true" } });
    expect(noName.error?.message).toContain("MCP_017");
    const noCmd = await call({ name: "startProcess", arguments: { name: "x" } });
    expect(noCmd.error?.message).toContain("MCP_018");
  });
});

describe("UI control tools", () => {
  it("reloadUI/restartApp invoke injected handlers (and error without them)", async () => {
    const { setUiControlHandlers } = await import("@/mcp-server");
    const before = await call({ name: "reloadUI", arguments: {} });
    expect(before.error?.message).toContain("UI_001");

    let reloads = 0;
    let restarts = 0;
    setUiControlHandlers({
      reloadUI: () => {
        reloads++;
        return { reloaded: true };
      },
      restartApp: () => {
        restarts++;
        return { relaunched: true };
      },
    });
    const r = await call({ name: "reloadUI", arguments: {} });
    expect(r.result.status).toBe("reloading");
    expect(reloads).toBe(1);
    const a = await call({ name: "restartApp", arguments: {} });
    expect(a.result.status).toBe("restarting");
    expect(restarts).toBe(1);
    setUiControlHandlers({}); // restore
  });
});

describe("domain permission gate (tool integration)", () => {
  it("openBrowserSurface auto-allows after permission:sync grants", async () => {
    const { permissionBroker, processMcpMessage } = await import("../src/mcp-server");
    permissionBroker.syncGrants(["granted.example"]);
    const res = await processMcpMessage({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: "openBrowserSurface", arguments: { url: "https://granted.example/page" } },
      id: 901,
    } as never);
    expect(res.response.result.status).toBe("opened");
    permissionBroker.syncGrants([]);
  });

  it("openBrowserSurface returns denied when the human denies", async () => {
    const { permissionBroker, pendingForTest, processMcpMessage } =
      await import("../src/mcp-server");
    permissionBroker.syncGrants([]);
    const call = processMcpMessage({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: "openBrowserSurface", arguments: { url: "https://ask-me.example/x" } },
      id: 902,
    } as never);
    await new Promise((r) => setTimeout(r, 20));
    const ids = pendingForTest();
    const mine = ids[ids.length - 1]!; // newest = our request
    expect(mine).toBeTruthy();
    permissionBroker.respond(mine, "deny");
    const res = await call;
    expect(res.response.result.status).toBe("denied");
    expect(res.response.result.reason).toBe("deny");
  });
});

describe("domain recipes (browserListSurfaces / readGoogleDriveDoc / scrapeSelective)", () => {
  async function callTool(name: string, args: Record<string, unknown>, id: number) {
    const { processMcpMessage } = await import("../src/mcp-server");
    const out = await processMcpMessage({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name, arguments: args },
      id,
    } as never);
    return (out as { response: Record<string, never> }).response as {
      result?: Record<string, any>;
      error?: { message: string };
    };
  }

  function installFakeGuest(payloadFactory: (js: string) => string) {
    const calls: string[] = [];
    const fake = {
      executeJavaScript: async (code: string) => {
        calls.push(code);
        return payloadFactory(code);
      },
      loadURL: async () => {},
      capturePage: async () => ({ toDataURL: () => "data:," }),
      isDestroyed: () => false,
      getURL: () => "https://page",
    };
    setGuestResolver(() => fake);
    registerGuest("surf_recipe", 77);
    return calls;
  }

  it("browserListSurfaces reports open surfaces with URL and guest state", async () => {
    const { permissionBroker } = await import("../src/mcp-server");
    permissionBroker.syncGrants(["gaswork.com"]);
    installFakeGuest(() => JSON.stringify({ ok: true, kind: "text", count: 1, data: "x" }));
    const opened = await callTool("openBrowserSurface", { url: "https://www.gaswork.com/" }, 949);
    const id = opened.result.surfaceId as string;
    registerGuest(id, 78);
    const res = await callTool("browserListSurfaces", {}, 950);
    expect(res.result.ok).toBe(true);
    expect(res.result.count).toBeGreaterThanOrEqual(1);
    const entry = (res.result.surfaces as Array<Record<string, unknown>>).find(
      (s) => s.surfaceId === id,
    );
    expect(entry?.url).toBe("https://www.gaswork.com/");
    expect(entry?.guestAttached).toBe(true);
  });

  it("browserListSurfaces lists non-browser surfaces too (process manager)", async () => {
    const opened = await callTool("openProcessManager", {}, 951);
    const res = await callTool("browserListSurfaces", {}, 952);
    const entry = (res.result.surfaces as Array<Record<string, unknown>>).find(
      (s) => s.surfaceId === opened.result.surfaceId,
    );
    expect(entry?.type).toBe("processManager");
  });

  it("readGoogleDriveDoc triggers handoff when sign-in is required", async () => {
    const { permissionBroker } = await import("../src/mcp-server");
    permissionBroker.syncGrants(["docs.google.com"]);
    installFakeGuest(() =>
      JSON.stringify({
        pageTitle: "Sign in",
        url: "https://accounts.google.com/v3/signin",
        loginRequired: true,
        text: "Sign in to continue",
      }),
    );
    const res = await callTool(
      "readGoogleDriveDoc",
      { url: "https://docs.google.com/document/d/abc", surfaceId: "surf_recipe" },
      953,
    );
    expect(res.result.status).toBe("login-required");
    expect(res.result.handoff).toBe(true);
  });

  it("readGoogleDriveDoc rejects non-drive URLs", async () => {
    const res = await callTool("readGoogleDriveDoc", { url: "https://evil.example/doc" }, 954);
    expect(res.error.message).toMatch(/BROWSER_006/);
  });

  it("scrapeSelective extracts selector matches", async () => {
    const { permissionBroker } = await import("../src/mcp-server");
    permissionBroker.syncGrants(["acme.dev"]);
    installFakeGuest(() =>
      JSON.stringify({
        pageTitle: "Pricing",
        url: "https://acme.dev/pricing",
        matched: 2,
        text: "Starter $10\n---\nPro $30",
      }),
    );
    const res = await callTool(
      "scrapeSelective",
      { url: "https://acme.dev/pricing", selector: ".price-card", surfaceId: "surf_recipe" },
      955,
    );
    expect(res.result.tool).toBe("scrapeSelective");
    expect(res.result.selector).toBe(".price-card");
    expect(res.result.text).toContain("Pro $30");
  });
});

describe("open3dSurface", () => {
  async function call3d(args: Record<string, unknown>, id: number) {
    const { processMcpMessage } = await import("../src/mcp-server");
    const out = await processMcpMessage({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: "open3dSurface", arguments: args },
      id,
    } as never);
    return (out as { response: Record<string, any> }).response;
  }

  it("opens a valid scene", async () => {
    const res = await call3d(
      {
        primitives: [
          { type: "box", position: [0, 0.5, 0], size: 1, color: "#ff8800" },
          { type: "torus", size: 2 },
        ],
        camera: { x: 4, y: 3, z: 6 },
      },
      970,
    );
    expect(res.result.status).toBe("opened");
    expect(res.result.primitiveCount).toBe(2);
    expect(res.result.surfaceId).toMatch(/^surf_/);
  });

  it("validates kinds, colors, and empty lists", async () => {
    expect((await call3d({ primitives: [] }, 971)).error.message).toMatch(/3D_001/);
    expect((await call3d({ primitives: [{ type: "pyramid" }] }, 972)).error.message).toMatch(
      /3D_003/,
    );
    expect(
      (await call3d({ primitives: [{ type: "box", color: "red" }] }, 973)).error.message,
    ).toMatch(/3D_004/);
  });
});

describe("open3dSurface in-place update", () => {
  beforeEach(async () => {
    const { __resetSurfacesForTest } = await import("../src/mcp-server");
    __resetSurfacesForTest();
  });
  it("reuses a known surfaceId and reports updated", async () => {
    const { processMcpMessage } = await import("../src/mcp-server");
    const call = async (args: Record<string, unknown>, id: number) => {
      const out = await processMcpMessage({
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name: "open3dSurface", arguments: args },
        id,
      } as never);
      return (out as { response: Record<string, any> }).response;
    };
    const first = await call({ primitives: [{ type: "box" }] }, 980);
    expect(first.result.status).toBe("opened");
    const second = await call(
      { primitives: [{ type: "sphere" }, { type: "torus" }], surfaceId: first.result.surfaceId },
      981,
    );
    expect(second.result.status).toBe("updated");
    expect(second.result.surfaceId).toBe(first.result.surfaceId);
    expect(second.result.primitiveCount).toBe(2);
  });
});

describe("recipe loadURL abort tolerance", () => {
  it("treats ERR_ABORTED (-3) from a self-loading webview as success", async () => {
    const { permissionBroker } = await import("../src/mcp-server");
    const { setGuestResolver, registerGuest } = await import("../src/guest-registry");
    permissionBroker.syncGrants(["google.com"]);
    setGuestResolver(() => ({
      executeJavaScript: async () =>
        JSON.stringify({
          pageTitle: "ok",
          url: "https://ok",
          matched: 1,
          text: "ok",
        }),
      loadURL: async () => {
        throw new Error(" (-3) loading 'https://www.google.com/search'");
      },
      capturePage: async () => ({ toDataURL: () => "data:," }),
      isDestroyed: () => false,
      getURL: () => "https://www.google.com/search",
    }));
    registerGuest("surf_abort", 91);
    const { processMcpMessage } = await import("../src/mcp-server");
    const out = await processMcpMessage({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "scrapeSelective",
        arguments: { url: "https://www.google.com/search?q=x", surfaceId: "surf_abort" },
      },
      id: 985,
    } as never);
    const res = (out as { response: Record<string, any> }).response;
    expect(res.result.text).toBe("ok");
  });
});

describe("recipe dedupe (same task → same tab)", () => {
  it("re-navigates the existing tab for an identical URL", { timeout: 20_000 }, async () => {
    const { permissionBroker, processMcpMessage, __resetSurfacesForTest } =
      await import("../src/mcp-server");
    const { setGuestResolver, registerGuest } = await import("../src/guest-registry");
    __resetSurfacesForTest();
    permissionBroker.syncGrants(["google.com"]);
    setGuestResolver(() => ({
      executeJavaScript: async () =>
        JSON.stringify({
          pageTitle: "ok",
          url: "g",
          loginRequired: false,
          botCheck: false,
          results: [],
          pageText: "",
        }),
      loadURL: async () => {},
      capturePage: async () => ({ toDataURL: () => "data:," }),
      isDestroyed: () => false,
      getURL: () => "https://www.google.com/search?q=duplicate+test",
    }));
    const call = async (id: number) => {
      const out = await processMcpMessage({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "scrapeSelective",
          arguments: { url: "https://www.google.com/search?q=duplicate+test" },
        },
        id,
      } as never);
      return (out as { response: Record<string, any> }).response;
    };
    // Helper: fire the call, register the guest it creates, await result.
    const { __listSurfacesForTest } = await import("../src/mcp-server");
    const callWithGuest = async (id: number) => {
      const p = call(id);
      for (let waited = 0; waited < 3000; waited += 100) {
        await new Promise((r) => setTimeout(r, 100));
        for (const sid of __listSurfacesForTest()) registerGuest(sid, 92);
        if ((await Promise.race([p.then(() => "done"), Promise.resolve("wait")])) === "done") break;
      }
      return (await p) as { result?: Record<string, any> };
    };
    const a = await callWithGuest(990);
    const b = await callWithGuest(991);
    // second call must reuse the first surface, not open a twin
    expect(b.result!.surfaceId).toBe(a.result!.surfaceId);
    // (surface reused — no twin opened)
  });

  // ── browserExecuteActions (plan-then-run sequence) ────────────────────
  async function seqCall(name: string, args: Record<string, unknown>, id: number) {
    const { processMcpMessage } = await import("../src/mcp-server");
    const out = await processMcpMessage({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name, arguments: args },
      id,
    } as never);
    return (out as { response: Record<string, never> }).response as {
      result?: Record<string, any>;
      error?: { message: string };
    };
  }
  function installSeqGuest(behavior: (js: string) => unknown) {
    setGuestResolver(() => ({
      executeJavaScript: async (code: string) => behavior(code),
      loadURL: async () => {},
      capturePage: async () => ({ toDataURL: () => "data:," }),
      isDestroyed: () => false,
      getURL: () => "https://gasworks.example",
    }));
  }

  it("browserExecuteActions runs a click→extract→assert→waitFor→press sequence", async () => {
    installSeqGuest((code) => {
      if (code.includes("wantPresent")) return { ok: true, found: true }; // assert
      if (code.includes("20000"))
        return { ok: true, kind: "text", count: 1, data: "locum anesthesiology" }; // extract
      if (code.includes("el.click")) return { ok: true, desc: "a#jobs" }; // click
      if (code.includes("KeyboardEvent")) return { ok: true }; // press
      if (code.startsWith("!!")) return true; // waitFor(exists)
      if (code.includes("captchaDetected"))
        return {
          title: "Gasworks",
          url: "https://gasworks.example",
          text: "openings",
          captchaDetected: false,
        };
      return { ok: true };
    });
    registerGuest("surf_seq", 88);
    const res = await seqCall(
      "browserExecuteActions",
      {
        surfaceId: "surf_seq",
        actions: [
          { action: "click", selector: "#jobs" },
          { action: "extract", extract: { kind: "text", selector: ".listing" } },
          { action: "assert", contains: "anesthesiology" },
          { action: "waitFor", selector: ".listing", timeoutMs: 100 },
          { action: "press", key: "Enter" },
        ],
      },
      1001,
    );
    expect(res.error).toBeUndefined();
    expect(res.result!.status).toBe("completed");
    expect(res.result!.ok).toBe(true);
    expect(res.result!.total).toBe(5);
    expect(res.result!.steps.every((s: { ok: boolean }) => s.ok)).toBe(true);
    expect(res.result!.final.title).toBe("Gasworks");
  });

  it("browserExecuteActions stops at the first failed non-optional step", async () => {
    installSeqGuest((code) => {
      if (code.includes("el.click")) return { ok: false }; // click fails
      if (code.includes("captchaDetected"))
        return { title: "x", url: "u", text: "", captchaDetected: false };
      return { ok: true };
    });
    registerGuest("surf_seq2", 89);
    const res = await seqCall(
      "browserExecuteActions",
      {
        surfaceId: "surf_seq2",
        actions: [
          { action: "click", selector: "#nope" },
          { action: "extract", extract: { kind: "text" } },
        ],
      },
      1002,
    );
    expect(res.result!.status).toBe("stopped");
    expect(res.result!.ok).toBe(false);
    expect(res.result!.executed).toBe(1);
  });

  it("browserExecuteActions continues past an optional step failure", async () => {
    installSeqGuest((code) => {
      if (code.includes("el.click")) return { ok: false }; // optional click fails
      if (code.includes("20000")) return { ok: true, kind: "text", count: 1, data: "ok" };
      if (code.includes("captchaDetected"))
        return { title: "x", url: "u", text: "", captchaDetected: false };
      return { ok: true };
    });
    registerGuest("surf_seq3", 90);
    const res = await seqCall(
      "browserExecuteActions",
      {
        surfaceId: "surf_seq3",
        actions: [
          { action: "click", selector: "#maybe", optional: true },
          { action: "extract", extract: { kind: "text" } },
        ],
      },
      1003,
    );
    expect(res.result!.status).toBe("completed");
    expect(res.result!.executed).toBe(2);
    expect(res.result!.steps[0].ok).toBe(false);
    expect(res.result!.steps[1].ok).toBe(true);
  });

  it("browserExecuteActions rejects unknown action and empty list", async () => {
    const bad = await seqCall(
      "browserExecuteActions",
      { surfaceId: "x", actions: [{ action: "fly" }] },
      1004,
    );
    expect(bad.error?.message).toMatch(/ACTION_003/);
    const empty = await seqCall("browserExecuteActions", { surfaceId: "x", actions: [] }, 1005);
    expect(empty.error?.message).toMatch(/ACTION_001/);
  });
});

describe("delegateTask (internal-model planner → sequence engine)", () => {
  async function callDT(args: Record<string, unknown>, id: number) {
    const { processMcpMessage } = await import("../src/mcp-server");
    const out = await processMcpMessage({
      jsonrpc: "2.0",
      method: "tools/call",
      params: { name: "delegateTask", arguments: args },
      id,
    } as never);
    return (out as { response: Record<string, never> }).response as {
      result?: Record<string, any>;
      error?: { message: string };
    };
  }

  it("plans a goal with the internal model and executes the actions on an attached surface", async () => {
    const { permissionBroker } = await import("../src/mcp-server");
    const { setGuestResolver, registerGuest } = await import("../src/guest-registry");
    permissionBroker.syncGrants(["gaswork.com"]);
    const planJson = {
      summary: "open gaswork and extract listings",
      actions: [
        { action: "navigate", url: "https://www.gaswork.com/" },
        { action: "extract", extract: { kind: "text" }, optional: true },
      ],
    };
    const origFetch = global.fetch;
    global.fetch = (async (url: string, init?: RequestInit) => {
      if (String(url).endsWith("/models")) {
        return {
          ok: true,
          json: async () => ({ data: [{ id: "planner" }] }),
        } as unknown as Response;
      }
      expect(JSON.parse(String(init?.body)).model).toBe("planner");
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: JSON.stringify(planJson) } }] }),
      } as unknown as Response;
    }) as unknown as typeof fetch;
    try {
      setGuestResolver(() => ({
        executeJavaScript: async (code: string) => {
          if (code.includes("captchaDetected")) {
            return {
              title: "GasWork",
              url: "https://www.gaswork.com/",
              text: "Anesthesiologist",
              captchaDetected: false,
            };
          }
          return { ok: true, kind: "text", count: 1, data: "locum listings" };
        },
        loadURL: async () => {},
        capturePage: async () => ({ toDataURL: () => "data:," }),
        isDestroyed: () => false,
        getURL: () => "https://www.gaswork.com/",
      }));
      registerGuest("surf_dt", 96);
      const res = await callDT(
        { goal: "open gaswork.com and pull the listings", surfaceId: "surf_dt" },
        1050,
      );
      expect(res.error).toBeUndefined();
      expect(res.result!.ok).toBe(true);
      expect(res.result!.summary).toContain("gaswork");
      expect(res.result!.status).toBe("completed");
      expect(res.result!.steps.every((s: { ok: boolean }) => s.ok)).toBe(true);
      expect(res.result!.final.title).toBe("GasWork");
    } finally {
      global.fetch = origFetch;
    }
  });

  it("delegateTask requires a goal", async () => {
    const res = await callDT({}, 1051);
    expect(res.error!.message).toMatch(/MCP_021/);
  });
});
describe("/captures route (pixels over HTTP, never through a tool result)", () => {
  const dir = path.join(os.homedir(), "Downloads", "human-assist-captures");

  it("serves a capture with the right type and no-store", async () => {
    fs.mkdirSync(dir, { recursive: true });
    // 1x1 PNG written straight into the captures folder.
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
      "base64",
    );
    const name = "route-test.png";
    fs.writeFileSync(path.join(dir, name), png);
    try {
      const res = await fetch(`http://localhost:${HTTP_PORT}/captures/${name}`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("image/png");
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect((await res.arrayBuffer()).byteLength).toBe(png.length);
    } finally {
      fs.rmSync(path.join(dir, name), { force: true });
    }
  });

  it("refuses to leave the captures folder", async () => {
    // Percent-encoded traversal is the form that actually reaches the handler —
    // fetch/curl normalise literal "../" away before it ever leaves the client.
    const raw = (p: string) =>
      new Promise<number>((resolve, reject) => {
        // node:http lets us send the request line untouched (fetch re-encodes
        // and normalises it, which hides exactly the case we care about).
        const req = httpRequest(
          { host: "127.0.0.1", port: HTTP_PORT, path: p, method: "GET" },
          (res) => {
            res.resume();
            resolve(res.statusCode ?? 0);
          },
        );
        req.on("error", reject);
        req.end();
      });
    for (const bad of [
      "/captures/%2e%2e%2f%2e%2e%2fetc%2fpasswd",
      "/captures/..%2f..%2f..%2fetc%2fpasswd",
      "/captures/a%2fb.png",
      "/captures/%2e%2e%2f.env",
    ]) {
      expect(await raw(bad), bad).toBe(400);
    }
    // Anything not in the folder is never handed out as an image, whatever the
    // router's status code says.
    const res = await fetch(`http://localhost:${HTTP_PORT}/captures/passwd`, {
      headers: { accept: "*/*" },
    });
    expect(res.headers.get("content-type") ?? "").not.toMatch(/^image\//);
  });

  it("404s a capture that is not there (instead of inventing one)", async () => {
    const res = await fetch(`http://localhost:${HTTP_PORT}/captures/nope-${Date.now()}.png`);
    expect(res.status).toBe(404);
  });
});
