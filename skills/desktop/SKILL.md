---
description: Electrobun 2.x desktop application — architecture, build, and debugging
---

# Harness Desktop — Electrobun 2.x

The Harness desktop application is an Electrobun 2.x Electron alternative for building a fast, tiny, cross-platform desktop browser app.

## Architecture

```
Hutch (build/workspace CLI)
        ↓
Electrobun (desktop runtime)
        ↓
BrowserWindow
        ↓
├── Vite dev server (localhost:3200)  [development]
│   └── React frontend with HMR
├── Bundled Vite assets (views://)    [production]
│   └── Compiled React frontend
└── RPC bridge → Bun side handlers
```

### Two modes

```
Development:
  BrowserWindow → http://localhost:3200 (Vite dev server, HMR)
  - Vite serves all assets dynamically
  - Changes to React source update via HMR
  - No rebuild needed

Production:
  BrowserWindow → views://renderer/index.html (bundled)
  - Vite compiles to desktop/public/renderer/
  - All assets are static, embedded in the app
  - No localhost dependency
```

## Version

- **Electrobun**: `2.0.1` (pinned in `package.json` and `hutch.config.ts`)
- **Hutch**: Bundled with Electrobun 2.x release
- **Vite**: `^5.4.0`
- **React**: `^18.3.0`

## Location

```
.claude/skills/harness/
  apps/
    desktop/          ← Electrobun main process
      src/
        main.ts       ← Entry point
        harness.ts    ← Application initialization
        rpc/          ← RPC handlers
        platform/     ← Platform abstraction
      hutch.config.ts ← Hutch configuration
      package.json
    renderer/         ← Vite-based React frontend
      src/
        index.tsx     ← Entry point
        App.tsx       ← Root component
        rpc/          ← RPC client & hooks
        components/   ← UI components
      vite.config.ts  ← Vite configuration
      package.json
  packages/
    types/            ← Shared RPC & tool types
```

## Development

```bash
cd .claude/skills/harness
pnpm install
pnpm harness:dev
```

This single command:
1. Starts Vite dev server on port 3200 (HMR enabled)
2. Waits for Vite to become available (`wait-on`)
3. Launches Electrobun desktop app (which loads the Vite URL)

## Production Build

```bash
# Compile renderer assets to desktop/public/renderer/
pnpm --filter harness-renderer build

# Build the desktop app with Hutch
hutch electrobun build --env=production
```

## Packaging

```bash
hutch electrobun package
```

Produces a signed macOS ARM64 package.

## RPC Architecture

The RPC layer connects the frontend to Bun-side handlers:

```
Frontend (React)
    ↓ @harness/types/rpc (BunRequests, WebviewMessages)
Electrobun RPC bridge (window.__electrobunRPC)
    ↓ RPC handlers
Bun-side handlers (src/rpc/bun-handler.ts)
    ↓ Browser automation
Local-web skill (Playwright-based)
```

**Bun-side requests** (frontend → Bun):
- `tabs` — list browser tabs
- `switchTab` — switch to a tab
- `activeTabId` — get active tab
- `closeTab` — close a tab

**Bun-side messages** (Bun → frontend):
- `tabUpdate` — notify tab state changes

**Webview requests** (Bun → frontend):
- `getCurrentUrl` — get content view URL
- `getTitle` — get content view title

**Webview messages** (frontend → Bun):
- `tabClick`, `tabClose`, `urlChange`, `titleChange`, `ready`

## Native Capabilities

Business logic calls `HarnessPlatform` interface, not Electrobun directly:

```ts
interface HarnessPlatform {
  openExternal(url: string): Promise<void>;
  showDialog(options: DialogOptions): Promise<DialogResult>;
  getClipboard(): Promise<string>;
  setClipboard(value: string): Promise<void>;
}
```

Implementation uses Electrobun APIs:
- `shell.openExternal` → `platform.openExternal`
- `dialog.show` → `platform.showDialog`
- `clipboard.readText` → `platform.getClipboard`
- etc.

## Adding a New RPC Method

1. Add the method to `@harness/types/rpc` (RPC schema types)
2. Add a handler in `apps/desktop/src/rpc/bun-handler.ts`
3. Add a client method in `apps/renderer/src/rpc/client.ts`
4. Add a React hook in `apps/renderer/src/rpc/hooks.ts`

## Adding a Native Capability

1. Extend `HarnessPlatform` interface in `src/platform/interface.ts`
2. Implement in `src/platform/electrobun-impl.ts`
3. Use through the interface, not Electrobun directly

## Adding a New View

Electrobun uses the `views://` URL scheme for packaged views.

For development, just use the Vite dev server (`localhost:3200`).
For production, compile the renderer output to the appropriate
directory referenced by `hutch.config.ts`.

## Platform Requirements

- **macOS**: 14+ (ARM64)
- **Xcode**: Command Line Tools
- **CMake**: `brew install cmake`
- **Node.js**: 20+
- **pnpm**: 9+

## Debugging

**Renderer**: Open DevTools via `win.webContents.openDevTools()` in `main.ts`.
DevTools are opened automatically in development mode.

**Main process**: Use LLDB for debugging release builds:

```bash
lldb --launch-simplify "hutch electrobun run"
```

For source-level debugging, use `pnpm harness:dev` with the Bun debugger:

```bash
pnpm --filter harness-desktop dev --inspect
```
