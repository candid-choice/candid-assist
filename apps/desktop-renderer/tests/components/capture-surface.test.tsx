/** The capture panel — what the human actually touches.

 The pipeline (desktopCapturer / capturePage / MediaRecorder) can only run in
 the app, and it is covered in apps/desktop/tests/capture.test.ts. What is
 covered HERE is the half that used to be a decorative facade: the picker that
 exists because an agent cannot choose between "Entire screen" and six near-
 identical windows, and the two buttons that turn a click into a
 `capture:request` over the wire.
*/

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

import { CaptureSurface } from "@/views/components/surfaces/CaptureSurface";
import { wsService } from "@/views/services/ws-service";
import type { SurfaceConfig, ScreenPayload } from "@/views/types";

function config(payload: ScreenPayload): SurfaceConfig<ScreenPayload> {
  return {
    id: "surf_capture",
    type: "screen",
    source: "agent",
    payload,
    createdAt: Date.now(),
    lastActive: Date.now(),
  } as unknown as SurfaceConfig<ScreenPayload>;
}

const SOURCES = [
  { id: "screen:1:0", name: "Entire screen", kind: "screen" as const, width: 3024, height: 1964 },
  { id: "window:42:0", name: "Gaswork — Chrome", kind: "window" as const },
  { id: "pane:surf_browser", name: "gaswork.com/jobs", kind: "pane" as const },
];

const noop = () => {};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CaptureSurface picker", () => {
  it("labels each source by kind so a person can tell them apart", () => {
    render(
      <CaptureSurface
        config={config({ sources: SOURCES, selectedSourceId: SOURCES[0].id })}
        onDone={noop}
        onCancel={noop}
      />,
    );
    // Kind and size share one text node ("Full screen · 3024×1964"), so match
    // loosely rather than pretending the label stands alone.
    expect(screen.getByText("Entire screen")).toBeTruthy();
    expect(screen.getByText(/Full screen/)).toBeTruthy();
    expect(screen.getByText("Gaswork — Chrome")).toBeTruthy();
    expect(screen.getByText(/Window/)).toBeTruthy();
    expect(screen.getByText("gaswork.com/jobs")).toBeTruthy();
    expect(screen.getByText(/Browser pane/)).toBeTruthy();
    expect(screen.getByText(/3024×1964/)).toBeTruthy();
  });

  it("shows the thumbnails Electron gave us, and a fallback icon when absent", () => {
    // alt="" keeps a decorative preview out of the a11y tree, so query the DOM
    // directly — the assertion is that the preview is there and pointing at it.
    const view = render(
      <CaptureSurface
        config={config({
          sources: [
            { ...SOURCES[0], thumbnail: "data:image/png;base64,AAA" },
            { ...SOURCES[1], thumbnail: "data:image/png;base64,BBB" },
          ],
        })}
        onDone={noop}
        onCancel={noop}
      />,
    ).container;
    const imgs = Array.from(view.querySelectorAll("img"));
    expect(imgs).toHaveLength(2);
    expect(imgs[0].getAttribute("src")).toBe("data:image/png;base64,AAA");
  });

  it("selecting a source tells main, which re-pushes the surface", () => {
    const send = vi.spyOn(wsService, "send").mockReturnValue(true);
    render(<CaptureSurface config={config({ sources: SOURCES })} onDone={noop} onCancel={noop} />);
    fireEvent.click(screen.getByText("Gaswork — Chrome"));
    expect(send).toHaveBeenCalledWith({
      type: "capture:select",
      surfaceId: "surf_capture",
      sourceId: "window:42:0",
    });
  });
});

describe("CaptureSurface actions", () => {
  it("screenshot sends the selected display", () => {
    const send = vi.spyOn(wsService, "send").mockReturnValue(true);
    render(
      <CaptureSurface
        config={config({ mode: "screenshot", sources: SOURCES, selectedSourceId: "screen:1:0" })}
        onDone={noop}
        onCancel={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Screenshot/i }));
    expect(send).toHaveBeenCalledWith({
      type: "capture:request",
      surfaceId: "surf_capture",
      action: "still",
      sourceId: "screen:1:0",
    });
  });

  it("a browser pane is captured by paneSurfaceId, not by source id", () => {
    const send = vi.spyOn(wsService, "send").mockReturnValue(true);
    render(
      <CaptureSurface
        config={config({
          mode: "screenshot",
          sources: SOURCES,
          selectedSourceId: "pane:surf_browser",
        })}
        onDone={noop}
        onCancel={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Screenshot/i }));
    expect(send).toHaveBeenCalledWith({
      type: "capture:request",
      surfaceId: "surf_capture",
      action: "still",
      paneSurfaceId: "surf_browser",
    });
  });

  it("while recording, the button is a Stop that ends the right session", () => {
    const send = vi.spyOn(wsService, "send").mockReturnValue(true);
    render(
      <CaptureSurface
        config={config({
          mode: "video",
          sources: SOURCES,
          selectedSourceId: "screen:1:0",
          recordingId: "rec_abc",
          note: "Recording 30s of 15fps — click Stop when done.",
        })}
        onDone={noop}
        onCancel={noop}
      />,
    );
    // Header says "Recording <elapsed>s"; the note explains what to do. Assert
    // both without pretending they are one string.
    expect(screen.getAllByText(/Recording/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Recording 30s of 15fps — click Stop when done.")).toBeTruthy();
    const stop = screen.getByRole("button", { name: /Stop/ });
    fireEvent.click(stop);
    expect(send).toHaveBeenCalledWith({
      type: "capture:request",
      surfaceId: "surf_capture",
      action: "stop",
      sourceId: "screen:1:0",
    });
    // Screenshot is disabled mid-recording: a clip and a still are different
    // requests and main would have to drop one anyway.
    const shot = screen.getByRole("button", { name: /Screenshot/i }) as HTMLButtonElement;
    expect(shot.disabled).toBe(true);
  });

  it("nothing is sendable before a source exists", () => {
    const send = vi.spyOn(wsService, "send").mockReturnValue(true);
    render(
      <CaptureSurface config={config({ mode: "screenshot" })} onDone={noop} onCancel={noop} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Screenshot/i }));
    expect(send).not.toHaveBeenCalled();
  });
});

describe("CaptureSurface result", () => {
  it("shows the still from the /captures URL", () => {
    render(
      <CaptureSurface
        config={config({
          mode: "screenshot",
          sources: SOURCES,
          url: "http://127.0.0.1:3615/captures/shot.png",
          file: "/Users/x/Downloads/human-assist-captures/shot.png",
          bytes: 2826626,
          width: 4112,
          height: 2658,
        })}
        onDone={noop}
        onCancel={noop}
      />,
    );
    const img = screen.getByRole("img", { name: "capture" });
    expect(img.getAttribute("src")).toBe("http://127.0.0.1:3615/captures/shot.png");
    expect(screen.getByText(/4112×2658/)).toBeTruthy();
    expect(screen.getByText(/2\.7 MB/)).toBeTruthy();
    expect(screen.getByText(/human-assist-captures\/shot\.png/)).toBeTruthy();
  });

  it("plays the clip back with controls, and reports its length", () => {
    const { container } = render(
      <CaptureSurface
        config={config({
          mode: "video",
          sources: SOURCES,
          url: "http://127.0.0.1:3615/captures/rec.webm",
          file: "/Users/x/Downloads/human-assist-captures/rec.webm",
          bytes: 2657025,
          seconds: 8,
          fps: 15,
        })}
        onDone={noop}
        onCancel={noop}
      />,
    );
    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video!.getAttribute("src")).toBe("http://127.0.0.1:3615/captures/rec.webm");
    expect(video!.hasAttribute("controls")).toBe(true);
    expect(screen.getByText(/8s @ 15fps/)).toBeTruthy();
  });

  it("surfaces a failure note instead of a blank stage", () => {
    render(
      <CaptureSurface
        config={config({
          mode: "screenshot",
          sources: SOURCES,
          note: "Capture failed: Error: CAP_004: no mediaDevices",
        })}
        onDone={noop}
        onCancel={noop}
      />,
    );
    expect(screen.getByText(/CAP_004/)).toBeTruthy();
  });
});
