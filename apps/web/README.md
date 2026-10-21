# web — Candid Assist Web App

A Next.js 16 application powered by React 19, TypeScript, and Tailwind CSS 4. This is the primary frontend interface for the Human Assist platform.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4
- **UI Components**: shadcn/ui, base-ui, Lucide icons
- **Styling**: Tailwind CSS 4 + tw-animate-css
- **Language**: TypeScript (strict mode)

## Scripts

```bash
pnpm dev        # Start dev server (port from WEB_PORT env, default 3600)
pnpm build      # Production build
pnpm start      # Start production server
pnpm lint       # Run ESLint
```

## Structure

```
src/
├── app/              # Next.js App Router pages/layout
│   ├── layout.tsx    # Root layout
│   └── page.tsx      # Home page
├── components/
│   ├── ui/           # Reusable UI primitives (buttons, cards, etc.)
│   └── landing/      # Landing page sections
├── lib/
│   └── utils.ts      # Shared utility functions
```

## Environment

- `WEB_PORT` — Dev server port (default: `3600`)

## Next Steps

- Add page routes and components for the full application
- Integrate with the NestJS backend API (`apps/backend`)
- Connect Firebase Auth, Firestore, and Storage services
