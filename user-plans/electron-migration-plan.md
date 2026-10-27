# Electron Migration Plan — Electrobun + Vite → Electron + Vite

**Status:** P2–P4 ✅ (branch `electron-migration`; commits: 415a71a docs, b1bbe6e scaffold, then E4). Electron app runs via `pnpm dev:desktop-electron` (renderer :5174, MCP/WS :3625/:3626 via env). 191/191 tests green, `electron-vite build` green.

**Done:** apps/desktop-electron pkg (main/preload/config reusing ../desktop/src/views renderer); WebContentsView embedded pages + IPC (create/bounds/visible/destroy); window.desktop bridge (window controls + views); overlay visibility via setVisible (pages stay loaded); titlebar solid bg + traffic-light alignment; Electrobun toggleHidden path retired (Electron-first per user).

**Remaining:** P5 cleanup (delete devkit-stub/electrobun deps/scripts after Electrobun retirement decision); P6 electron-builder packaging (`pnpm dist`); P7 verification (packaged build, auth flow, MCP push E2E into Electron, network-instrumentation stub); window control buttons UI check (WindowShell maximize via bridge); decide Electrobun fate (apps/desktop stays Electrobun for now — do NOT work on it).

**Rules of engagement:** work only on Electron (`apps/desktop-electron` + shared renderer in `apps/desktop/src/views`); renderer changes must keep 191 tests green; no commits/pushes without explicit instruction.
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

## Phases (status)

- **P2 Scaffold** ✅ — electron-vite layout, renderer reused from apps/desktop
- **P3 Main process** ✅ — window, MCP/WS boot (ports via env), security baseline
- **P4 Embedded views + bridge** ✅ — WebContentsView host, window controls, overlay visibility, titlebar fix
- **P5 Cleanup** ⏸ blocked on Electrobun retirement decision
- **P6 Packaging** ⬜ electron-builder macOS (`pnpm dist`)
- **P7 Verification** ⬜ full checklist

## Risk notes

- `ws` + `node:http` in Electron main: proven pattern.
- CI (when re-enabled) gets simpler — no `electrobun prepare` native step to skip.
- Electron adds ~200MB app size vs Electrobun's native shell (acceptable tradeoff for CDP/webRequest analysis surface).
