/** Scene spec shared by the MCP tool contract and the ThreeSurface
 * viewer: validates/normalizes primitive descriptors. */

export type PrimitiveKind = "box" | "sphere" | "cylinder" | "torus" | "plane";

export interface PrimitiveSpec {
  type: PrimitiveKind;
  position: [number, number, number];
  size: number;
  color: string;
  rotation?: [number, number, number];
}

export interface SceneSpec {
  primitives: PrimitiveSpec[];
  background: string;
  camera?: { x: number; y: number; z: number };
}

const KINDS = new Set<PrimitiveKind>(["box", "sphere", "cylinder", "torus", "plane"]);
const HEX = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_COLOR = "#6366f8";

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function vec3(v: unknown, fallback: [number, number, number]): [number, number, number] {
  if (Array.isArray(v) && v.length === 3 && v.every((n) => Number.isFinite(n))) {
    return [v[0], v[1], v[2]];
  }
  return fallback;
}

export function parseSceneSpec(input: unknown): SceneSpec {
  const o = (input ?? {}) as Record<string, unknown>;
  const raw = Array.isArray(o["primitives"]) ? o["primitives"] : [];
  if (raw.length === 0) throw new Error("3D_001: primitives[] must contain at least one item");
  if (raw.length > 64) throw new Error("3D_002: too many primitives (max 64)");

  const primitives: PrimitiveSpec[] = raw.map((item, i) => {
    const p = (item ?? {}) as Record<string, unknown>;
    const type = p["type"] as PrimitiveKind;
    if (!KINDS.has(type)) {
      throw new Error(`3D_003: primitive[${i}] type must be one of ${[...KINDS].join(", ")}`);
    }
    const color = typeof p["color"] === "string" && HEX.test(p["color"]) ? p["color"] : DEFAULT_COLOR;
    return {
      type,
      position: vec3(p["position"], [0, 0, 0]),
      size: Math.min(50, Math.max(0.05, num(p["size"], 1))),
      color,
      ...(Array.isArray(p["rotation"]) ? { rotation: vec3(p["rotation"], [0, 0, 0]) } : {}),
    };
  });

  const background =
    typeof o["background"] === "string" && HEX.test(o["background"]) ? o["background"] : "#161a21";

  let camera: SceneSpec["camera"];
  const cam = o["camera"];
  if (cam && typeof cam === "object") {
    const c = cam as Record<string, unknown>;
    camera = { x: num(c["x"], 6), y: num(c["y"], 5), z: num(c["z"], 8) };
  }

  return { primitives, background, ...(camera ? { camera } : {}) };
}
