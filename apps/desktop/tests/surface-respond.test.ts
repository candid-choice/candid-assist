/** Human → agent round-trips over the surface WebSocket.

Both of these exist so a human decision reaches the agent that asked for it:
  - input surface: {type:"input:respond"} → openInputSurface(waitForAnswer)
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
    respond: (surfaceId, answer) =>
      ws.send(JSON.stringify({ type: "input:respond", surfaceId, answer })),
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

describe("input surface: the human's answer reaches the agent", () => {
  it("opens immediately (push precedes the wait) so the human can answer", async () => {
    const renderer = await openRenderer();

    const pending = call("openInputSurface", {
      question: "Which account should I sign in as?",
      kind: "choices",
      options: ["personal", "work"],
      waitForAnswer: true,
      timeoutMs: 6000,
    });

    // The push must arrive BEFORE the answer, otherwise the panel is invisible
    // and the waiting call can only ever time out.
    const push = await renderer.waitForPush((d) => d?.type === "input");
    expect(push.payload.question).toBe("Which account should I sign in as?");
    expect(push.payload.answered).toBe(false);

    renderer.respond(push.surfaceId, "work");
    const out = await pending;
    expect(out.answered).toBe(true);
    expect(out.answer).toBe("work");
    expect(out.status).toBe("answered");
    expect(out.question).toBe("Which account should I sign in as?");

    // And it stays readable afterwards (session handover / re-read).
    const read = await call("readSurface", { surfaceId: push.surfaceId });
    expect(read.type).toBe("input");
    expect(read.summary.answered).toBe(true);
    expect(read.summary.answer).toBe("work");
    renderer.close();
  });

  it("times out instead of hanging when nobody answers", async () => {
    const renderer = await openRenderer();
    const out = await call("openInputSurface", {
      question: "Spend $49 to unlock this dataset?",
      kind: "confirm",
      waitForAnswer: true,
      timeoutMs: 1000,
    });
    expect(out.answered).toBe(false);
    expect(out.status).toBe("timeout");
    renderer.close();
  });

  it("ignores an answer for an unknown surface instead of crashing", async () => {
    const renderer = await openRenderer();
    renderer.respond("surface_does_not_exist", "whatever");
    await new Promise((r) => setTimeout(r, 60));
    const out = await call("readSurface");
    expect(Array.isArray(out.surfaces)).toBe(true);
    renderer.close();
  });
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
