/** JSON Schema → TypeBox (subset used by the human-assist manifest). */

import { Type } from "typebox";
import { IDENTITY_PROPS } from "./identity.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toTypeBox(schema: unknown): any {
  if (!schema || typeof schema !== "object") return Type.Unsafe<unknown>({});
  const s = schema as Record<string, unknown>;
  const desc = typeof s["description"] === "string" ? { description: s["description"] } : {};
  if (Array.isArray(s["anyOf"])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Type.Union((s["anyOf"] as unknown[]).map((x) => toTypeBox(x)) as any);
  }
  if (Array.isArray(s["enum"])) return Type.Unsafe<unknown>(s);
  switch (s["type"]) {
    case "string":
      return Type.String(desc);
    case "number":
    case "integer":
      return Type.Number(desc);
    case "boolean":
      return Type.Boolean(desc);
    case "array":
      return Type.Array(toTypeBox(s["items"]), desc);
    case "object": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props: Record<string, any> = {};
      for (const [k, v] of Object.entries((s["properties"] ?? {}) as Record<string, unknown>)) {
        if ((IDENTITY_PROPS as readonly string[]).includes(k)) continue; // injected, hidden from model
        props[k] = toTypeBox(v);
      }
      const required = Array.isArray(s["required"]) ? (s["required"] as string[]) : [];
      for (const r of required)
        if (!(r in props) && !(IDENTITY_PROPS as readonly string[]).includes(r))
          props[r] = Type.Unknown();
      return Type.Object(props, {
        ...desc,
        additionalProperties: true,
        required: required.filter((r) => r in props),
      });
    }
    default:
      return Type.Unsafe<unknown>(s);
  }
}

export function snake(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}
