# Electron Migration Plan — Electrobun + Vite → Electron + Vite

**Status:** 🚧 Starting (branch: `electron-migration`, from `phase-8-layout-and-functionality`)
**Scope:** `apps/desktop` only. `src/views/` UI, store, sync, tests, MCP/WS protocol, backend, and web app are **unchanged**.

---

## Phase 1 audit (completed — actual inventory)

Electrobun coupling is isolated to 10 files:

| File | Coupling | Replacement |
|---|---|---|
| `src/bun/index.ts` | `BrowserWindow`, BrowserViews for View A/B, window lifecycle, boots MCP+WS | Electron `app` + `BrowserWindow` + `WebContentsView` |
| `src/mcp-server.ts` | **None** (pure `node:http` + `ws`) | Move into Electron main process unchanged |
| `src/rpc/renderer.ts` | `Electroview` + RPC schemas | `contextBridge` preload (`window.desktop`) |
| `src/rpc/types.ts` | RPC message schemas | IPC channel contracts (`electron-trpc` not needed; plain typed IPC) |
| `src/rpc/window-controls.ts` | `BrowserWindow` from `electrobun/main` | IPC → `mainWindow.minimize()` etc. |
| `src/views/main.tsx` | `Electroview` construction gated on `window.__electrobun` | Gate on `window.desktop` (preload present) |
| `src/views/services/window-controls.ts` | RPC calls (minimize/maximize/close) | `window.desktop.window.*` |
| `src/views/components/surfaces/BrowserSurface/index.tsx` | `<electrobun-webview src>` + `toggleHidden()` | `WebContentsView` hosted by main; renderer reports bounds via IPC |
| `src/views/hooks/use-hide-native-views.ts` | native-view hide dance | Keep concept: `window.desktop.views.setVisible(open)` |
| `src/views/devkit-stub.ts` + vite aliases + `.hutch` | build glue | Delete |

Package: `electrobun ^2.0.1` dep, `postinstall: electrobun prepare`, `dev: vite & electrobun dev --watch`, `build: vite:build && electrobun build`.

## Key decisions

1. **Embedded browser = `WebContentsView`** (not iframe): claude.ai sends `X-Frame-Options` / CSP `frame-ancestors` → iframe impossible.
2. **Overlay z-order solved natively**: renderer sends `view.setVisible(false)` over IPC while modals/dropdowns are open (replaces Electrobun `toggleHidden`), or zeroes bounds. No DOM hacks.
3. **MCP + WS server**: `src/mcp-server.ts` runs in Electron main unchanged (`node:http` + `ws` are Node APIs). Ports stay MCP :3615 / WS :3614.
4. **Security baseline**: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`; preload exposes only `window.desktop`; embedded remote views get **no preload** and navigation validation.
5. **Tooling**: `electron-vite` (main/preload/renderer configs) + `electron-builder` (macOS first).
6. **Website analysis (future)**: `session.webRequest` for metadata; CDP for response bodies; `webContents.executeJavaScript` for DOM extraction. Stub interface reserved in preload.

## Phases

- **P2 — Scaffold** (in progress): `electron-vite` layout inside `apps/desktop`; keep `vite:build` + vitest green (tests are runtime-agnostic).
- **P3 — Main process**: port `bun/index.ts` → `electron/main/index.ts` (window, 2 `WebContentsView`s, MCP/WS boot); `electron/preload/index.ts` exposing `window.desktop` (window controls, view bounds/visibility, later network events).
- **P4 — Renderer glue**: BrowserSurface becomes a bounds-reporting host (ResizeObserver + `window.desktop.views`); `use-hide-native-views` → IPC visibility calls; delete `Electroview` path.
- **P5 — Cleanup**: delete `devkit-stub.ts`, `.hutch` aliases, `electrobun` dep, `postinstall`; scripts → `electron-vite dev/build`.
- **P6 — Packaging**: `electron-builder` macOS target; icon/identifier; smoke test packaged build.
- **P7 — Verification**: dev mode, prod build, overlays above embedded content, MCP push E2E (188-test suite green), auth/session flow, no Electrobun residue.

## Risk notes

- `ws` + `node:http` in Electron main: proven pattern.
- CI (when re-enabled) gets simpler — no `electrobun prepare` native step to skip.
- Electron adds ~200MB app size vs Electrobun's native shell (acceptable tradeoff for CDP/webRequest analysis surface).
