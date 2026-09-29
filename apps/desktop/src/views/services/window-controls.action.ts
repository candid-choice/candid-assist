/** Window control actions — renderer-side action types. */

import type {
  WindowControlRequest,
} from "../../rpc/types.js";

/** RPC request params (renderer → bun). */
export interface WindowControlParams {
  method: WindowControlRequest extends { method: infer M } ? M : never;
}
