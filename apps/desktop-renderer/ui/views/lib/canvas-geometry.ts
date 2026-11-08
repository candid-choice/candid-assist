/** Pure geometry for the canvas surface, kept out of the component so the
 *  maths (image fitting, hit boxes, flattening) is unit-testable. */

export interface Pt {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Fit a source rect into a box, preserving aspect ratio ("contain"), centred.
 * Returns null for degenerate input so the caller can skip drawing.
 */
export function fitContain(srcW: number, srcH: number, boxW: number, boxH: number): Box | null {
  if (!(srcW > 0) || !(srcH > 0) || !(boxW > 0) || !(boxH > 0)) return null;
  const scale = Math.min(boxW / srcW, boxH / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
}

/** Bounding box of a stroke in drawing-space, for hit-testing and exports. */
export function strokeBounds(s: {
  tool: string;
  points?: Pt[];
  x0?: number;
  y0?: number;
  x1?: number;
  y1?: number;
  size?: number;
}): Box | null {
  const pad = (s.size ?? 2) / 2;
  if (s.points?.length) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of s.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
  }
  if (s.x0 !== undefined && s.y0 !== undefined && s.x1 !== undefined && s.y1 !== undefined) {
    return {
      x: Math.min(s.x0, s.x1) - pad,
      y: Math.min(s.y0, s.y1) - pad,
      w: Math.abs(s.x1 - s.x0) + pad * 2,
      h: Math.abs(s.y1 - s.y0) + pad * 2,
    };
  }
  return null;
}

/** Map a 0..1 callout position (as agents send annotations) into pixels of the
 *  drawn image rect. Values outside 0..1 are clamped so callouts never drift
 *  off the picture. */
export function calloutPoint(rel: { x?: number; y?: number }, img: Box): Pt {
  const fx = rel.x === undefined ? 0.5 : Math.min(1, Math.max(0, rel.x));
  const fy = rel.y === undefined ? 0.5 : Math.min(1, Math.max(0, rel.y));
  return { x: img.x + fx * img.w, y: img.y + fy * img.h };
}

/** Pointer coordinates → drawing space. The canvas element may be stretched by
 *  CSS, so scale by the ratio of logical size to rendered size; a wrong scale
 *  here is exactly why the old canvas drew in the wrong place. */
export function toDrawingSpace(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  logical: { w: number; h: number },
): Pt {
  const sx = rect.width > 0 ? logical.w / rect.width : 1;
  const sy = rect.height > 0 ? logical.h / rect.height : 1;
  return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
}
