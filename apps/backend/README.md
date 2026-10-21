# backend — Candid Assist API Server

A NestJS 12 API server serving as the backend for the Human Assist platform. Written in TypeScript with strict mode enabled.

## Tech Stack

- **Framework**: NestJS 12
- **Runtime**: Node.js
- **Language**: TypeScript (strict mode)
- **HTTP**: Express adapter via `@nestjs/platform-express`

## Scripts

```bash
pnpm start:dev      # Start in watch mode (port from BACKEND_PORT env, default 3601)
pnpm start:debug     # Start in debug mode
pnpm build           # Production build
pnpm start:prod      # Run production build
pnpm format          # Format source with Prettier
```

## Structure

```
src/
├── app.module.ts     # Root NestJS module
├── main.ts           # App entry point
├── health/
│   ├── health.module.ts
│   └── health.controller.ts   # GET /health endpoint
└── types/
    └── firestore.ts   # Shared Firestore type definitions
```

## Environment

- `BACKEND_PORT` — Server port (default: `3601`)

## API

- `GET /health` — Health check endpoint

## Next Steps

- Define API routes for user, session, and surface management
- Connect to Firebase Firestore and Authentication
- Implement WebSocket handlers for real-time interactions
