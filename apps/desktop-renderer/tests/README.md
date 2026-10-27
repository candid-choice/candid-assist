# Test Strategy

This document outlines the testing strategy for the Human Assist desktop application.

## Testing Framework

- **Framework**: Vitest
- **Environment**: jsdom (browser simulation)
- **Coverage Target**: 80% across all modules

## Test Structure

```
tests/
├── setup.ts              # Global setup and mocks
├── errors/               # Error handling tests
│   └── error-hierarchy.test.ts
├── hooks/                # Custom hooks
│   └── keyboard-shortcuts.test.ts
├── components/           # React components
│   └── context-menu.test.tsx
├── integration/          # Integration tests
│   └── offline-queue.test.ts
└── store/                # State management
    └── store-structure.test.ts
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test tests/errors/error-hierarchy.test.ts
```

## Test Coverage

### Unit Tests (Critical Path)
- Error hierarchy (30+ error codes, severity, retry policies)
- Keyboard shortcuts (platform detection, modifier keys)
- Context menus (show/hide, positioning, item actions)

### Integration Tests
- Error context provider (error routing, state management)
- Offline queue (IndexedDB operations, FIFO replay)
- Store actions (state mutations, selectors)

### Component Tests
- Surface context menus (close, copy, download)
- Sidebar context menus (copy ID, archive, delete)
- Error boundary (error catching, rendering fallbacks)

## Coverage Goals

| Module | Target |
|--------|--------|
| Error hierarchy | 90%+ |
| Keyboard shortcuts | 85%+ |
| Context menus | 80%+ |
| Offline queue | 85%+ |
| Error context | 80%+ |
| Store | 75%+ |

## Adding Tests

1. Create test file matching source structure (e.g., `src/foo/bar.ts` → `tests/foo/bar.test.ts`)
2. Use `vitest` assertions (`expect`, `it`, `describe`)
3. Mock external dependencies (localStorage, IndexedDB, navigator)
4. Run `pnpm test` to verify all tests pass
