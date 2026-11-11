/** Human → agent round-trips over the surface WebSocket.

Both of these exist so a human decision reaches the agent that asked for it:
  - canvas markup: {type:"canvas:respond"} → openCanvasSurface(waitForMarkup)
  - canvas surface: {type:"canvas:respond"} → openCanvasSurface(waitForMarkup)
A fake renderer on the surface WS plays the human.
*/

import { describe, it, expect, beforeAll } from "vitest";
import { WebSocket } from "ws";

import { startMcpServer } from "@/mcp-server";

const HTTP_PORT = 3755;
const WS_PORT = 3756;
const MCP_URL = `http://localhost:${HTTP_PORT}/mcp`;

// Without a session key the server warns (and later would reject) every call.
process.env.HA_SESSION_KEY = "test-session-key";

let nextId = 1;

async function call(name: string, args: Record<string, unknown> = {}): Promise<any> {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: nextId++,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  const body = (await res.json()) as any;
  if (body.error) throw new Error(body.error.message);
  return JSON.parse(body.result.content[0].text);
}

/** A stand-in for the desktop renderer: receives pushes, replies as the human. */
function openFakeRenderer(): {
  ws: WebSocket;
  waitForPush: (pred: (d: any) => boolean, ms?: number) => Promise<any>;
  respond: (surfaceId: string, answer: string) => void;
  sendMarkup: (surfaceId: string, markup: string, note?: string) => void;
  close: () => void;
} {
  const ws = new WebSocket(`ws://127.0.0.1:${WS_PORT}`);
  const seen: any[] = [];
  const waiters: { pred: (d: any) => boolean; resolve: (d: any) => void }[] = [];
  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.event !== "surface:push") return;
      const data = msg.data;
      seen.push(data);
      const i = waiters.findIndex((w) => w.pred(data));
      if (i >= 0) {
        waiters[i].resolve(data);
        waiters.splice(i, 1);
      }
    } catch {
      /* ignore malformed */
    }
  });
  return {
    ws,
    waitForPush: (pred, ms = 4000) =>
      new Promise((resolve, reject) => {
        const hit = seen.find(pred);
        if (hit) return resolve(hit);
        const timer = setTimeout(() => reject(new Error("no surface:push in time")), ms);
        waiters.push({
          pred,
          resolve: (d) => {
            clearTimeout(timer);
            resolve(d);
          },
        });
      }),
    sendMarkup: (surfaceId, markup, note) =>
      ws.send(JSON.stringify({ type: "canvas:respond", surfaceId, markup, note })),
    close: () => ws.close(),
  };
}

async function openRenderer() {
  const r = openFakeRenderer();
  await new Promise((res) => r.ws.once("open", res));
  return r;
}

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";

beforeAll(async () => {
  startMcpServer(HTTP_PORT, WS_PORT);
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(MCP_URL, {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", method: "tools/call", params: {}, id: 0 }),
      });
      if (r.ok) break;
    } catch {
      /* not yet */
    }
    await new Promise((r) => setTimeout(r, 25));
  }
});

describe("canvas surface: the human's markup reaches the agent", () => {
  it("delivers the flattened PNG and reports it through readSurface", async () => {
    const renderer = await openRenderer();

    const pending = call("openCanvasSurface", {
      prompt: "Mark up anything that looks wrong",
      imageSrc: PNG,
      annotations: [{ text: "this column is truncated", x: 0.7, y: 0.2 }],
      waitForMarkup: true,
      timeoutMs: 6000,
    });

    const push = await renderer.waitForPush((d) => d?.type === "canvas");
    expect(push.payload.imageSrc).toBe(PNG);
    expect(push.payload.annotations).toHaveLength(1);
    expect(push.payload.markedUp).toBe(false);

    renderer.sendMarkup(push.surfaceId, PNG, "boxed the two broken cells");
    const out = await pending;
    expect(out.markedUp).toBe(true);
    expect(out.status).toBe("marked-up");
    expect(out.note).toBe("boxed the two broken cells");

    // Digest by default; pixels only when explicitly asked for.
    const digest = await call("readSurface", { surfaceId: push.surfaceId });
    expect(digest.type).toBe("canvas");
    expect(digest.summary.markedUp).toBe(true);
    expect(digest.summary.hasMarkup).toBe(true);
    expect(digest.summary.markupNote).toBe("boxed the two broken cells");
    expect(digest.summary.annotations).toBe(1);
    expect(digest.markup).toBeUndefined();

    const pixels = await call("readSurface", { surfaceId: push.surfaceId, what: "markup" });
    expect(pixels.markup).toBe(PNG);
    renderer.close();
  });

  it("rejects markup that is not an image data URL", async () => {
    const renderer = await openRenderer();
    const opened = await call("openCanvasSurface", { prompt: "sketch me" });
    renderer.sendMarkup(opened.surfaceId, "<script>alert(1)</script>");
    await new Promise((r) => setTimeout(r, 60));
    const read = await call("readSurface", { surfaceId: opened.surfaceId });
    expect(read.summary.markedUp).toBeFalsy();
    expect(read.summary.hasMarkup).toBeUndefined();
    renderer.close();
  });

  it("times out instead of hanging when nobody sends", async () => {
    const renderer = await openRenderer();
    const out = await call("openCanvasSurface", {
      prompt: "draw the layout",
      waitForMarkup: true,
      timeoutMs: 1000,
    });
    expect(out.markedUp).toBe(false);
    expect(out.status).toBe("timeout");
    expect(out.markup).toBeNull();
    renderer.close();
  });
});
