/** Capture policy tests (screenshots + recordings) against a FAKE bridge.

 The Electron side (desktopCapturer / capturePage / MediaRecorder) can only run
 in the app; everything that decides *what the agent sees* lives in
 src/capture.ts and is testable here: files on disk instead of base64, the
 unchanged-target dedupe, the pacing bucket, and the recording guards.
*/

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  CAPTURES_DIR,
  captureStill,
  listRecordings,
  setCaptureBridge,
  startRecording,
  stopRecording,
  estimateRecordingBytes,
  type CaptureBridge,
  type RecordingHandle,
  type StillRequest,
} from "@/capture";

/** 1x1 PNG. */
const PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";

let calls: { still: StillRequest[]; start: number; stop: string[] } = {
  still: [],
  start: 0,
  stop: [],
};
let lastHandle: RecordingHandle | null = null;

const fakeBridge: CaptureBridge = {
  async listSources() {
    return [
      { id: "screen:0:0", name: "Display 1", kind: "screen", displayId: "0" },
      { id: "window:42:0", name: "Gaswork — Chrome", kind: "window" },
    ];
  },
  async grabStill(req) {
    calls.still.push(req);
    return { dataUrl: `data:image/png;base64,${PNG_B64}`, width: 1600, height: 1000 };
  },
  async startRecording(req) {
    calls.start++;
    lastHandle = {
      recordingId: `rec_test_${calls.start}`,
      file: req.outFile,
      startedAt: Date.now(),
      maxSeconds: req.maxSeconds,
      fps: req.fps,
    };
    // Write something so stop() has a real file to report.
    fs.writeFileSync(req.outFile, Buffer.alloc(2048, 7));
    return lastHandle;
  },
  async stopRecording(id, reason = "manual") {
    calls.stop.push(id);
    const file = lastHandle?.file ?? "";
    return {
      file,
      bytes: fs.existsSync(file) ? fs.statSync(file).size : 0,
      seconds: 3,
      fps: 15,
      reason,
    };
  },
  activeRecordings() {
    return [];
  },
};

function capturedFiles(): string[] {
  if (!fs.existsSync(CAPTURES_DIR)) return [];
  return fs
    .readdirSync(CAPTURES_DIR)
    .filter((f) => f.startsWith("shot-test") || f.startsWith("rec-test"));
}

beforeEach(() => {
  setCaptureBridge(fakeBridge);
  calls = { still: [], start: 0, stop: [] };
  lastHandle = null;
});

afterEach(async () => {
  // Drain any recording a test left running: the active set is module state
  // and would otherwise leak the cap (max 2) into the next test.
  for (let i = 0; i < 4 && listRecordings().length; i++) {
    try {
      await stopRecording(listRecordings()[0].recordingId);
    } catch {
      break;
    }
  }
  setCaptureBridge(null);
  for (const f of capturedFiles()) {
    try {
      fs.unlinkSync(path.join(CAPTURES_DIR, f));
    } catch {
      /* best effort */
    }
  }
});

describe("captureStill", () => {
  it("writes a file and returns paths, not pixels", async () => {
    const res = await captureStill({
      sourceId: "screen:0:0",
      out: "shot-test-basic.png",
      force: true,
    });
    expect(res.status).toBe("captured");
    expect(res.file).toContain("shot-test-basic");
    expect(fs.existsSync(res.file)).toBe(true);
    expect(res.bytes).toBeGreaterThan(50);
    expect(res.width).toBe(1600);
    expect(res.thumbHash).toMatch(/^[0-9a-f]{16}$/);
    // No base64 anywhere in the result — that is the whole point.
    expect(JSON.stringify(res)).not.toContain("base64");
  });

  it("routes panes by webContentsId and displays by sourceId", async () => {
    await captureStill({ webContentsId: 7, out: "shot-test-pane.png", force: true });
    await captureStill({ sourceId: "screen:0:0", out: "shot-test-disp.png", force: true });
    expect(calls.still[0].webContentsId).toBe(7);
    expect(calls.still[1].sourceId).toBe("screen:0:0");
  });

  it("passes clip / format / quality through to the bridge", async () => {
    await captureStill({
      sourceId: "screen:0:0",
      clip: { x: 10, y: 20, w: 300, h: 200 },
      format: "jpeg",
      quality: 0.5,
      out: "shot-test-clip.png",
      force: true,
    });
    const req = calls.still[0];
    expect(req.clip).toEqual({ x: 10, y: 20, w: 300, h: 200 });
    expect(req.format).toBe("jpeg");
    expect(req.quality).toBe(0.5);
  });

  it("reports unchanged instead of re-writing an identical shot", async () => {
    const a = await captureStill({
      sourceId: "screen:0:0",
      out: "shot-test-dedupe.png",
      force: true,
    });
    const b = await captureStill({ sourceId: "screen:0:0", out: "shot-test-dedupe2.png" });
    expect(b.status).toBe("unchanged");
    expect(b.sameAs).toBe(a.file);
    // force:true beats the dedupe (the agent knows better than our heuristic)
    const c = await captureStill({
      sourceId: "screen:0:0",
      out: "shot-test-dedupe3.png",
      force: true,
    });
    expect(c.status).toBe("captured");
  });

  it("keeps names inside the captures folder", async () => {
    const res = await captureStill({
      sourceId: "screen:0:0",
      out: "../../../etc/evil.png",
      force: true,
    });
    // Containment is what matters: the name gets sanitised (so it may keep a
    // word from the requested name) but it can never leave the captures dir.
    // (path.dirname is the real assertion; a sanitised name may still contain
    // dots, which is harmless as long as it cannot escape the folder.)
    expect(path.dirname(res.file)).toBe(CAPTURES_DIR);
  });

  it("refuses to pretend when there is no Electron bridge", async () => {
    setCaptureBridge(null);
    await expect(captureStill({ sourceId: "screen:0:0" })).rejects.toThrow(/CAP_001/);
  });
});

describe("recordings", () => {
  it("starts, lists and stops exactly once", async () => {
    const h = await startRecording({
      sourceId: "screen:0:0",
      maxSeconds: 5,
      out: "rec-test-a.webm",
    });
    expect(h.recordingId).toMatch(/^rec_/);
    expect(listRecordings()).toHaveLength(1);
    const res = await stopRecording();
    expect(res.bytes).toBeGreaterThan(0);
    expect(res.reason).toBe("manual");
    expect(calls.stop).toEqual([h.recordingId]);
    expect(listRecordings()).toHaveLength(0);
  });

  it("clamps runaway settings instead of honouring them", async () => {
    const h = await startRecording({
      sourceId: "screen:0:0",
      maxSeconds: 99_999,
      fps: 900,
      bitrateKbps: 500_000,
      out: "rec-test-clamp.webm",
    });
    expect(h.maxSeconds).toBe(300); // hard policy ceiling
    expect(h.fps).toBe(60);
  });

  it("refuses a third concurrent recording and a stop with none running", async () => {
    await startRecording({ sourceId: "screen:0:0", out: "rec-test-1.webm" });
    await startRecording({ sourceId: "screen:0:0", out: "rec-test-2.webm" });
    await expect(startRecording({ sourceId: "screen:0:0" })).rejects.toThrow(/CAP_002/);
    // Drain both, then a stop with nothing running is an explicit error rather
    // than a silent no-op (an agent must not think it recorded something).
    await stopRecording();
    await stopRecording();
    await expect(stopRecording()).rejects.toThrow(/CAP_003/);
  });

  it("estimates size before a recording so callers can warn", () => {
    expect(estimateRecordingBytes(30, 1200)).toBe(Math.round((30 * 1200 * 1000) / 8));
  });
});

describe("capture file naming", () => {
  it("does not smuggle path dots into the file name", async () => {
    const res = await captureStill({
      sourceId: "screen:0:0",
      out: "../../../etc/evil.png",
      force: true,
    });
    expect(path.dirname(res.file)).toBe(CAPTURES_DIR);
    expect(path.basename(res.file)).not.toMatch(/\.\./);
    expect(path.basename(res.file)).toBe("etc-evil.png");
  });
});
