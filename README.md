# harness — Electrobun Desktop Runtime

Electrobun-powered desktop application toolkit. The harness provides a runtime for building lightweight, non-Electron desktop applications via Electrobun (Cottontail / JavaScriptCore main process + Vite-rendered webviews).

## Structure

```
harness/
├── apps/
│   └── desktop/       # harness-desktop — Vite + React 19 renderer
│       ├── src/
│       │   ├── bun/     # Electrobun main process entry
│       │   └── views/   # Renderer UI (Human Assist app)
│       ├── index.html
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── package.json
├── skills/            # Reusable skill packages
├── rules/             # Development rules & guidelines
├── package.json       # Monorepo root (pnpm workspaces)
└── pnpm-workspace.yaml
```

## Apps

### harness-desktop

A Vite + React 19 desktop app built on Electrobun 2.x.

**Stack:**
- **Runtime** — Electrobun 2.x (Cottontail / JavaScriptCore main process)
- **Build** — Vite 7 + @vitejs/plugin-react
- **Styling** — Tailwind CSS 4 + CSS custom properties (`--ha-*`)
- **Language** — TypeScript (strict mode)

**Capabilities:**
- `<electrobun-webview>` custom element for embedded webviews
- RPC-based communication between main process and renderer
- Surface-driven architecture for human-in-the-loop interactions

### Human Assist

Human Assist is the primary application built with the harness — a warm, minimal human-in-the-loop interaction peripheral for Claude Code. Claude Code pushes "surfaces" via MCP, the human interacts with them, and results flow back.

**Architecture:**
```
WindowShell (macOS-style chrome)
└── ha-body
    ├── SurfaceHost (type router)
    │   ├── IdleState → "Waiting for Claude"
    │   └── SurfaceShell → surface-specific component
    └── HelpPalette (proactive help menu)
```

**Surface types:**
| Surface | Purpose |
|---|---|
| `browser` | Interactive web view with navigation |
| `image` | Image annotation (draw, circle, arrow, text) |
| `canvas` | Freeform drawing (pen, eraser, undo/redo) |
| `screen` | Region/window/screen capture selection |
| `input` | Structured input (choices, text, confirm, file, voice) |
| `file` / `voice` / `prompt` | Fallback surfaces (generic chrome) |

**Design tokens:**
- Background: `#FAF7F2` (warm cream)
- Surface: `#FFFFFF` (warm white)
- Primary: `#7C6FA8` (muted violet)
- Text: `#3D3D3D` (warm charcoal)

## Getting Started

```bash
cd apps/desktop
pnpm install
pnpm dev
```

Runs Vite dev server + Electrobun watch for live development.

## Surface Protocol

### SurfaceConfig
```ts
interface SurfaceConfig<T = unknown> {
  type: SurfaceType;       // 'browser' | 'image' | 'canvas' | 'screen' | 'input' | 'file' | 'voice' | 'prompt'
  title: string;            // Short title for chrome header
  instruction?: string;     // Longer instruction text
  payload: T;               // Type-specific payload data
  source: 'mcp' | 'proactive';
  createdAt: number;
}
```

### State Management
```ts
useSurfaceState<T>() => {
  activeSurface: SurfaceConfig<T> | null,
  helpPaletteOpen: boolean,
  openSurface(config),
  completeSurface(result),
  cancelSurface(),
  toggleHelpPalette()
}
```

## Architecture

Everything revolves around a **Surface** — a temporary workspace Claude hands to the human. The state machine flows:

```
Idle → Active Surface → Completed / Cancelled → Idle
```

Only one surface is active at a time. Surfaces arrive from MCP (Claude requests help) or from proactive mode (user opens the help palette).

## Project History

| Date | Milestone |
|---|---|
| 2024-09-22 | Human Assist UI — complete surface system (5 surfaces, 26 components, ~4500 lines) |
| 2024-09-15 | Vite + React migration (replaced minimal scaffold) |
| 2024-08 | Electrobun 2.x runtime integration |
| 2024-07 | Initial harness scaffold |
