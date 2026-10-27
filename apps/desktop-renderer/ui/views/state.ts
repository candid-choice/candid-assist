/** Surface State — re-exports from the Zustand store for backward compat.

 * This file is deprecated; migrate imports to `./store`.
 */

// Re-export store for consumers who may still import from here.
export { useStore, useStoreSelector } from './store';
export type { AppState as SurfaceState } from './store';
