import { afterEach } from 'vitest';

// Auto cleanup after each test case
afterEach(() => {
  // Clean up DOM state if needed
});

// Mock DOM environment for tests
const mockNavigator = {
  platform: 'MacIntel',
};

Object.defineProperty(window, 'navigator', {
  value: mockNavigator,
  writable: true,
});

// Mock DOM APIs that may not exist in jsdom
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  },
  writable: true,
});

Object.defineProperty(window, 'indexedDB', {
  value: {
    open: () => {},
    deleteDatabase: () => {},
  },
  writable: true,
});

// Mock IntersectionObserver
Object.defineProperty(window, 'IntersectionObserver', {
  value: class MockIntersectionObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  },
  writable: true,
});
