/** Canvas surface — freeform drawing canvas. */

import { useCallback, useRef } from "react";

import type { SurfaceConfig, CanvasPayload } from "../../../types";

import "./index.css";

const TOOLS = [
  { id: "pen" as const, label: "Pen", icon: "✎" },
  { id: "eraser" as const, label: "Eraser", icon: "◇" },
];

const STROKE_COLORS = [
  { name: "black", value: "#3D3D3D" },
  { name: "violet", value: "#7C6FA8" },
  { name: "peach", value: "#E8927F" },
  { name: "blue", value: "#6B8BA8" },
];

export interface CanvasSurfaceProps {
  config: SurfaceConfig<CanvasPayload>;
  onDone: () => void;
  onCancel: () => void;
}

export function CanvasSurface({ onDone, onCancel: _onCancel }: CanvasSurfaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tool = useRef<"pen" | "eraser">("pen");
  const color = useRef(STROKE_COLORS[0].value);
  const undoStack = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    undoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (undoStack.current.length > 20) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  const handleUndo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || undoStack.current.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const prev = undoStack.current[undoStack.current.length - 1];
    ctx.putImageData(prev, 0, 0);
    undoStack.current.pop();
    redoStack.current.push(current);
  }, []);

  const handleRedo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || redoStack.current.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const next = redoStack.current[redoStack.current.length - 1];
    ctx.putImageData(next, 0, 0);
    redoStack.current.pop();
    undoStack.current.push(current);
  }, []);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    saveState();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#E8E2D9";
    ctx.lineWidth = 0.5;
    for (let x = 20; x < canvas.width; x += 20) {
      for (let y = 20; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, [saveState]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    lastPos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPos.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.strokeStyle = tool.current === "eraser" ? "#FFFFFF" : color.current;
    ctx.lineWidth = tool.current === "eraser" ? 20 : 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPos.current = { x, y };
  };

  const handleMouseUp = useCallback(() => {
    if (isDrawing.current) saveState();
    isDrawing.current = false;
    lastPos.current = null;
  }, [saveState]);

  return (
    <div className="ha-canvas-surface">
      {/* Canvas area */}
      <div className="ha-canvas-surface__area">
        <canvas
          ref={canvasRef}
          className="ha-canvas-surface__canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* Toolbar */}
      <div className="ha-canvas-surface__toolbar">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`ha-action-btn${tool.current === t.id ? " ha-action-btn--active" : ""}`}
            onClick={() => { tool.current = t.id; }}
            type="button"
            title={t.label}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}

        <span className="ha-canvas-surface__divider" />

        {STROKE_COLORS.map((c) => (
          <button
            key={c.name}
            className={`ha-color-swatch${color.current === c.value ? " ha-color-swatch--active" : ""}`}
            onClick={() => { color.current = c.value; }}
            type="button"
          />
        ))}

        <span className="ha-canvas-surface__divider" />

        <button className="ha-action-btn" onClick={handleUndo} type="button" title="Undo">↩</button>
        <button className="ha-action-btn" onClick={handleRedo} type="button" title="Redo">↪</button>
        <button className="ha-action-btn" onClick={handleClear} type="button" title="Clear">Clear</button>
      </div>

      {/* Footer */}
      <div className="ha-canvas-surface__footer">
        <button className="ha-btn ha-btn--sm" onClick={handleClear} type="button">Clear</button>
        <button className="ha-btn ha-btn--sm ha-btn--primary" onClick={onDone} type="button">Send</button>
      </div>
    </div>
  );
}
