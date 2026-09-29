# candid-assist

Monorepo for Human Assist — a human-in-the-loop interaction platform built on Next.js + NestJS + Firebase.

```
candid-assist/
├── apps/
│   ├── web/             # Next.js 16 web app (frontend)
│   ├── backend/         # NestJS 12 API server
│   └── desktop/         # Electrobun desktop runtime (existing)
├── config/
│   └── ports.ts         # Centralized port allocation
├── firebase.json        # Firebase config (emulators at root)
├── firestore.rules      # Firestore security rules
├── firestore.indexes.json
├── storage.rules
├── package.json         # Monorepo root (pnpm workspaces)
└── pnpm-workspace.yaml
```

## Quick Start

```bash
pnpm install           # Install all workspace dependencies
pnpm dev               # Start web + backend + Firebase emulator
pnpm build             # Build all apps
```

## Port Allocation

| Service              | Port |
| -------------------- | ---: |
| Web (Next.js)        | 3600 |
| Backend (NestJS)     | 3601 |
| Firebase Auth        | 3602 |
| Firebase Firestore   | 3613 |
| Firebase Storage     | 3604 |
| Firebase Functions   | 3605 |
| Firebase Emulator UI | 3607 |
| Firebase Database    | 3608 |
| Firebase Pub/Sub     | 3609 |

All ports are explicitly configured — no framework defaults are used. Override any port via environment variables documented in `.env.example`.

## Available Commands

```bash
# Start all services (web, backend, Firebase emulator)
pnpm dev

# Start individual services
pnpm dev:web          # Next.js dev server
pnpm dev:backend      # NestJS dev server (watch mode)
pnpm dev:firebase     # Firebase emulator suite

# Build
pnpm build            # Build all
pnpm build:web        # Build Next.js
pnpm build:backend    # Build NestJS
```

## Development

### Environment Variables

Copy `.env.example` to `.env.local` and adjust as needed. The key variables:

- `WEB_PORT` — Next.js dev server port (default: 3600)
- `BACKEND_PORT` — NestJS dev server port (default: 3601)
- `FIREBASE_*_PORT` — Firebase emulator ports
- `FIREBASE_PROJECT_ID` — Firebase project ID for development

### Next.js (apps/web)

```bash
cd apps/web
pnpm dev    # Runs on $WEB_PORT
```

### NestJS (apps/backend)

```bash
cd apps/backend
pnpm start:dev    # Runs on $BACKEND_PORT
```

The backend exposes a health check at `GET /health`.

### Firebase Emulator Suite

```bash
firebase emulators:start    # Starts all configured emulators
```

Emulators are configured in `firebase.json` at the repository root:

- **Auth** — `http://localhost:3602`
- **Firestore** — `http://localhost:3613`
- **Storage** — `http://localhost:3604`
- **Emulator UI** — `http://localhost:3607`

Use `FIREBASE_PROJECT_ID=candid-assist` consistently when the emulator suite is running.

## Structure

- `apps/web` — Next.js 16 application (React 19, TypeScript, Tailwind CSS 4)
- `apps/backend` — NestJS 12 API server (TypeScript, strict mode)
- `apps/desktop` — Electrobun desktop runtime (existing application)
- `config/ports.ts` — Single source of truth for all local service ports
- Root `firebase.json` — Firebase configuration (not in any app directory)

## Testing

```bash
pnpm test        # Run tests across all packages
```

## Linting

```bash
pnpm lint        # Lint all packages
```

## Type Checking

```bash
pnpm type-check  # Type-check harness-desktop
```
