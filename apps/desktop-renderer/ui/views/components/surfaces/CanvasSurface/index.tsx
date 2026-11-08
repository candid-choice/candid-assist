/**
 * Canvas surface — the one visual panel for anything a human should look at,
 * mark up, or annotate.
 *
 * Two modes, same tooling: a blank sheet, or an image the agent sent
 * (`payload.imageSrc`) that you draw on. What you draw is a *vector* model
 * (a list of strokes), re-rendered on every resize at device pixel ratio — so
 * nothing blurs, nothing gets cropped when the pane changes size, and Send
 * flattens exactly what you saw.
 *
 * The old version stretched a fixed 300×150 backing store with CSS (blurred,
 * strokes landed in the wrong place), kept tool colour in refs (toolbar never
 * updated), ignored width/height/initialContent, and its “Send” button sent
 * nothing. This is the surface the agent reads back with readSurface().
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  IconArrowBarToRight,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconArrowNarrowRight,
  IconCircle,
  IconEraser,
  IconHighlight,
  IconBrush,
  IconPencil,
  IconRectangle,
  IconSquareRoundedNumber1,
  IconTrash,
  IconTypography,
} from "@tabler/icons-react";

import type { SurfaceConfig, CanvasPayload } from "../../../types";
import {
  calloutPoint,
  fitContain,
  toDrawingSpace,
  type Box,
  type Pt,
} from "../../../lib/canvas-geometry";

import "./index.css";

type Tool = "pen" | "marker" | "highlighter" | "arrow" | "rect" | "ellipse" | "text" | "eraser";

type Stroke =
  | { tool: "pen" | "marker" | "highlighter" | "eraser"; color: string; size: number; points: Pt[] }
  | {
      tool: "arrow" | "rect" | "ellipse";
      color: string;
      size: number;
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    }
  | { tool: "text"; color: string; size: number; x: number; y: number; text: string };

const TOOLS: { id: Tool; label: string; key: string; icon: typeof IconPencil }[] = [
  { id: "pen", label: "Pen", key: "P", icon: IconPencil },
  { id: "marker", label: "Marker", key: "M", icon: IconBrush },
  { id: "highlighter", label: "Highlight", key: "H", icon: IconHighlight },
  { id: "arrow", label: "Arrow", key: "A", icon: IconArrowNarrowRight },
  { id: "rect", label: "Box", key: "R", icon: IconRectangle },
  { id: "ellipse", label: "Oval", key: "O", icon: IconCircle },
  { id: "text", label: "Text", key: "T", icon: IconTypography },
  { id: "eraser", label: "Eraser", key: "E", icon: IconEraser },
];

const COLORS = ["#E5484D", "#F5A524", "#30A46C", "#3E63DD", "#8E4EC6", "#1F1F1F", "#FFFFFF"];
const SIZES = [2, 4, 8, 14];

const TOOLS_WITH_POINTS = new Set<Tool>(["pen", "marker", "highlighter", "eraser"]);
const TOOLS_WITH_DRAG = new Set<Tool>(["arrow", "rect", "ellipse"]);

export interface CanvasSurfaceProps {
  config: SurfaceConfig<CanvasPayload>;
  /** Flatten and hand the annotated picture to the agent. */
  onSend: (markupDataUrl: string, note: string) => void;
  onCancel: () => void;
}

export function CanvasSurface({ config, onSend, onCancel }: CanvasSurfaceProps) {
  const payload = config.payload ?? {};
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImage = useRef<HTMLImageElement | null>(null);
  const [, bump] = useReducer((n: number) => n + 1, 0);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redo, setRedo] = useState<Stroke[]>([]);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(COLORS[0]);
  const [size, setSize] = useState<number>(SIZES[1]);
  const [draft, setDraft] = useState<Stroke | null>(null);
  const [editing, setEditing] = useState<{ x: number; y: number; text: string } | null>(null);
  const [note, setNote] = useState("");
  const [sentAt, setSentAt] = useState<number | null>(
    typeof payload.markupAt === "number" ? payload.markupAt : null,
  );
  const [imageError, setImageError] = useState<string | null>(null);
  const [box, setBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const drawing = useRef(false);

  const annotations = useMemo(
    () =>
      (Array.isArray(payload.annotations) ? payload.annotations : []).filter(
        (a) => a && typeof a.text === "string",
      ),
    [payload.annotations],
  );

  // ── Sizing: logical drawing space == rendered CSS pixels, at device DPI ──
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      // honour an agent-requested aspect ratio, otherwise fill the pane
      const reqW = Number(payload.width) || 0;
      const reqH = Number(payload.height) || 0;
      let w = Math.max(160, Math.floor(r.width));
      let h = Math.max(160, Math.floor(r.height));
      if (reqW > 0 && reqH > 0) {
        const scale = Math.min(w / reqW, h / reqH);
        w = Math.floor(reqW * scale);
        h = Math.floor(reqH * scale);
      }
      setBox({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [payload.width, payload.height]);

  // ── Background image (what you are being asked to review) ──────────────
  useEffect(() => {
    const src = payload.imageSrc;
    if (!src) {
      bgImage.current = null;
      bump();
      return;
    }
    let live = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!live) return;
      bgImage.current = img;
      setImageError(null);
      bump();
    };
    img.onerror = () => {
      if (!live) return;
      bgImage.current = null;
      setImageError(`Could not load image: ${src.slice(0, 80)}`);
      bump();
    };
    img.src = src;
    return () => {
      live = false;
    };
  }, [payload.imageSrc]);

  /** Where the picture actually lands inside the drawing space. */
  const imageRect = useCallback((): Box | null => {
    const img = bgImage.current;
    if (!img || !img.naturalWidth) return null;
    return fitContain(img.naturalWidth, img.naturalHeight, box.w, box.h);
  }, [box.w, box.h]);

  // ── Painting ───────────────────────────────────────────────────────────
  const paintStroke = useCallback((ctx: CanvasRenderingContext2D, s: Stroke) => {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = s.size;

    if (s.tool === "eraser") ctx.globalCompositeOperation = "destination-out";
    if (s.tool === "highlighter") ctx.globalAlpha = 0.3;
    if (s.tool === "marker") ctx.globalAlpha = 0.55;

    if (TOOLS_WITH_POINTS.has(s.tool as Tool) && "points" in s) {
      const pts = s.points;
      if (pts.length) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          // Quadratic smoothing through midpoints: freehand looks like a pen,
          // not a chain of straight segments.
          const p = pts[i];
          const prev = pts[i - 1];
          ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + p.x) / 2, (prev.y + p.y) / 2);
        }
        const last = pts[pts.length - 1];
        ctx.lineTo(last.x, last.y);
        ctx.stroke();
      }
    } else if ("x0" in s && (s.tool === "rect" || s.tool === "ellipse")) {
      const x = Math.min(s.x0, s.x1);
      const y = Math.min(s.y0, s.y1);
      const w = Math.abs(s.x1 - s.x0);
      const h = Math.abs(s.y1 - s.y0);
      ctx.beginPath();
      if (s.tool === "rect") ctx.rect(x, y, w, h);
      else ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if ("x0" in s && s.tool === "arrow") {
      ctx.beginPath();
      ctx.moveTo(s.x0, s.y0);
      ctx.lineTo(s.x1, s.y1);
      ctx.stroke();
      const angle = Math.atan2(s.y1 - s.y0, s.x1 - s.x0);
      const head = Math.max(8, s.size * 3);
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(
        s.x1 - head * Math.cos(angle - Math.PI / 7),
        s.y1 - head * Math.sin(angle - Math.PI / 7),
      );
      ctx.lineTo(
        s.x1 - head * Math.cos(angle + Math.PI / 7),
        s.y1 - head * Math.sin(angle + Math.PI / 7),
      );
      ctx.closePath();
      ctx.fill();
    } else if ("text" in s && s.tool === "text") {
      ctx.font = `600 ${Math.max(12, s.size * 4)}px -apple-system, system-ui, sans-serif`;
      ctx.textBaseline = "middle";
      // Halo so dark text stays legible over a screenshot.
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,.85)";
      ctx.strokeText(s.text, s.x, s.y);
      ctx.restore();
      ctx.fillText(s.text, s.x, s.y);
    }
    ctx.restore();
  }, []);

  /** Draw the current model into an arbitrary context (also used by Send). */
  const paintAll = useCallback(
    (ctx: CanvasRenderingContext2D, target: { w: number; h: number }, includeDraft = true) => {
      ctx.clearRect(0, 0, target.w, target.h);
      const img = bgImage.current;
      const rect =
        img && img.naturalWidth
          ? fitContain(img.naturalWidth, img.naturalHeight, target.w, target.h)
          : null;
      if (!img || !rect) {
        // Plain sheet: paper with a faint dot grid, so a blank canvas reads as
        // a surface rather than a void.
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, target.w, target.h);
        ctx.fillStyle = "rgba(31,31,31,.10)";
        for (let x = 16; x < target.w; x += 16)
          for (let y = 16; y < target.h; y += 16) {
            ctx.beginPath();
            ctx.arc(x, y, 0.7, 0, Math.PI * 2);
            ctx.fill();
          }
      } else {
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,.18)";
        ctx.shadowBlur = 10;
        ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);
        ctx.restore();
      }
      // Agent-placed callouts, numbered, before the human's own marks.
      if (rect) {
        annotations.forEach((a, i) => {
          const p = calloutPoint({ x: a.x, y: a.y }, rect);
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
          ctx.fillStyle = "#E5484D";
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#FFFFFF";
          ctx.stroke();
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "700 12px -apple-system, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(i + 1), p.x, p.y + 0.5);
          ctx.restore();
        });
      }
      for (const s of strokes) paintStroke(ctx, s);
      if (includeDraft && draft) paintStroke(ctx, draft);
    },
    [annotations, draft, paintStroke, strokes],
  );

  // Redraw on every model or size change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || box.w <= 0 || box.h <= 0) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const bw = Math.floor(box.w * dpr);
    const bh = Math.floor(box.h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintAll(ctx, box);
  }, [box, paintAll]);

  // ── Pointer input (mouse, trackpad, stylus, touch) ─────────────────────
  const pointOf = (e: ReactPointerEvent<HTMLCanvasElement>): Pt => {
    const rect = e.currentTarget.getBoundingClientRect();
    return toDrawingSpace(e.clientX, e.clientY, rect, box);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (editing) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointOf(e);
    if (tool === "text") {
      setEditing({ x: p.x, y: p.y, text: "" });
      return;
    }
    drawing.current = true;
    if (TOOLS_WITH_POINTS.has(tool)) {
      setDraft({ tool: tool as never, color, size, points: [p] });
    } else {
      setDraft({ tool: tool as never, color, size, x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !draft) return;
    const p = pointOf(e);
    if ("points" in draft) setDraft({ ...draft, points: [...draft.points, p] });
    else if ("x0" in draft) setDraft({ ...draft, x1: p.x, y1: p.y });
  };

  const onPointerUp = () => {
    if (!drawing.current || !draft) {
      drawing.current = false;
      return;
    }
    drawing.current = false;
    // Ignore accidental single-pixel drags; keep genuine dots from the pen.
    const meaningful =
      "points" in draft
        ? draft.points.length > 1
        : "x0" in draft
          ? Math.abs(draft.x1 - draft.x0) > 3 || Math.abs(draft.y1 - draft.y0) > 3
          : true;
    if (meaningful) {
      setStrokes((prev) => [...prev, draft]);
      setRedo([]);
    }
    setDraft(null);
  };

  const commitText = useCallback(() => {
    if (!editing) return;
    const text = editing.text.trim();
    if (text) {
      setStrokes((prev) => [
        ...prev,
        { tool: "text", color, size, x: editing.x, y: editing.y, text },
      ]);
      setRedo([]);
    }
    setEditing(null);
  }, [color, editing, size]);

  const undo = useCallback(() => {
    setStrokes((prev) => {
      if (!prev.length) return prev;
      setRedo((r) => [...r, prev[prev.length - 1]]);
      return prev.slice(0, -1);
    });
  }, []);

  const redoLast = useCallback(() => {
    setRedo((r) => {
      if (!r.length) return r;
      setStrokes((prev) => [...prev, r[r.length - 1]]);
      return r.slice(0, -1);
    });
  }, []);

  const clearAll = useCallback(() => {
    if (!strokes.length) return;
    setRedo([...strokes]);
    setStrokes([]);
  }, [strokes]);

  // ── Send: flatten at full resolution and hand it to the agent ──────────
  const send = useCallback(() => {
    const src = canvasRef.current;
    if (!src || box.w <= 0) return;
    const flat = document.createElement("canvas");
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    flat.width = Math.floor(box.w * dpr);
    flat.height = Math.floor(box.h * dpr);
    const ctx = flat.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintAll(ctx, box, false);
    // Flattened, but downscaled to at most 1600 px wide: the agent reads it,
    // and a 5 MB PNG helps nobody.
    const scale = Math.min(1, 1600 / flat.width);
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(flat.width * scale));
    out.height = Math.max(1, Math.round(flat.height * scale));
    const octx = out.getContext("2d");
    if (!octx) return;
    octx.drawImage(flat, 0, 0, out.width, out.height);
    setSentAt(Date.now());
    onSend(out.toDataURL("image/png"), note.trim());
  }, [box, note, onSend, paintAll]);

  // ── Keyboard shortcuts (ignored while typing) ──────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redoLast() : undo();
        return;
      }
      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        send();
        return;
      }
      if (e.key === "Escape") {
        if (editing) setEditing(null);
        else onCancel();
        return;
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        undo();
        return;
      }
      const hit = TOOLS.find((x) => x.key.toLowerCase() === e.key.toLowerCase());
      if (hit && !meta) setTool(hit.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, onCancel, redoLast, send, undo]);

  const dirty = strokes.length > 0 || annotations.length > 0;

  return (
    <div className="ha-canvas-root">
      <div className="ha-canvas-toolbar" role="toolbar" aria-label="Drawing tools">
        <div className="ha-canvas-tools">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`ha-canvas-tool${tool === t.id ? " is-active" : ""}`}
              onClick={() => setTool(t.id)}
              title={`${t.label} (${t.key})`}
              aria-pressed={tool === t.id}
            >
              <t.icon size={16} stroke={1.75} />
            </button>
          ))}
        </div>

        <span className="ha-canvas-separator" />

        <div className="ha-canvas-swatches">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`ha-canvas-swatch${color === c ? " is-active" : ""}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              title={c}
              aria-label={`Colour ${c}`}
              aria-pressed={color === c}
            />
          ))}
          <label className="ha-canvas-custom" title="Custom colour">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value.toUpperCase())}
            />
          </label>
        </div>

        <span className="ha-canvas-separator" />

        <div className="ha-canvas-sizes">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              className={`ha-canvas-size${size === s ? " is-active" : ""}`}
              onClick={() => setSize(s)}
              title={`${s}px`}
              aria-pressed={size === s}
            >
              <span style={{ width: Math.min(14, s + 2), height: Math.min(14, s + 2) }} />
            </button>
          ))}
        </div>

        <span className="ha-canvas-separator" />

        <div className="ha-canvas-history">
          <button
            type="button"
            className="ha-canvas-tool"
            onClick={undo}
            disabled={!strokes.length}
            title="Undo (⌘Z)"
          >
            <IconArrowBackUp size={16} stroke={1.75} />
          </button>
          <button
            type="button"
            className="ha-canvas-tool"
            onClick={redoLast}
            disabled={!redo.length}
            title="Redo (⇧⌘Z)"
          >
            <IconArrowForwardUp size={16} stroke={1.75} />
          </button>
          <button
            type="button"
            className="ha-canvas-tool"
            onClick={clearAll}
            disabled={!strokes.length}
            title="Clear marks"
          >
            <IconTrash size={16} stroke={1.75} />
          </button>
        </div>
      </div>

      <div className="ha-canvas-stage" ref={wrapRef}>
        {imageError && <div className="ha-canvas-error">{imageError}</div>}
        {!payload.imageSrc && !dirty && (
          <div className="ha-canvas-hint">
            <IconSquareRoundedNumber1 size={18} stroke={1.5} />
            <span>
              Draw here — or ask the agent to send an image in for markup. Press <kbd>P</kbd> pen,{" "}
              <kbd>A</kbd> arrow, <kbd>T</kbd> text, <kbd>⌘Z</kbd> undo.
            </span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="ha-canvas"
          style={{ width: box.w || undefined, height: box.h || undefined }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {editing && (
          <input
            className="ha-canvas-text"
            style={{ left: editing.x, top: editing.y }}
            autoFocus
            value={editing.text}
            placeholder="type…"
            onChange={(e) => setEditing({ ...editing, text: e.target.value })}
            onBlur={commitText}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitText();
              }
              if (e.key === "Escape") setEditing(null);
            }}
          />
        )}
      </div>

      <div className="ha-canvas-footer">
        <span className="ha-canvas-status">
          {strokes.length} mark{strokes.length === 1 ? "" : "s"}
          {annotations.length
            ? ` · ${annotations.length} callout${annotations.length === 1 ? "" : "s"}`
            : ""}
          {payload.markedUp || sentAt
            ? ` · sent ${sentAt ? new Date(sentAt).toLocaleTimeString() : "earlier"}`
            : dirty
              ? " · unsent changes"
              : ""}
        </span>
        <input
          className="ha-canvas-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note for the agent (optional)…"
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button type="button" className="ha-canvas-btn" onClick={onCancel}>
          Close
        </button>
        <button
          type="button"
          className="ha-canvas-btn ha-canvas-btn--primary"
          onClick={send}
          disabled={!dirty && !note.trim()}
          title="Send the annotated image to the agent (⌘S)"
        >
          <IconArrowBarToRight size={15} stroke={1.9} />
          {sentAt ? "Send again" : "Send"}
        </button>
      </div>
    </div>
  );
}
