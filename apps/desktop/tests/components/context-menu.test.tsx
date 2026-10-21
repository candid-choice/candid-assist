import { describe, it, expect } from 'vitest';

describe('ContextMenu', () => {
  it('should export components', async () => {
    const module = await import('@/views/components/ContextMenu/index.tsx');
    expect(typeof module.ContextMenu).toBe('function');
  });
});
