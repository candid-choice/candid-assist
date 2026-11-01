import { describe, it, expect, afterEach } from 'vitest';
import { shouldStartLiveServices } from '@/views/services/standalone-guard';

describe('standalone guard', () => {
  afterEach(() => {
    delete (window as unknown as { desktop?: unknown }).desktop;
  });

  it('plain browser tab starts no live services', () => {
    delete (window as unknown as { desktop?: unknown }).desktop;
    expect(shouldStartLiveServices()).toBe(false);
  });

  it('Electron window (bridge present) starts live services', () => {
    (window as unknown as { desktop: unknown }).desktop = { runtime: 'electron' };
    expect(shouldStartLiveServices()).toBe(true);
  });

  it('non-electron runtime marker does not count', () => {
    (window as unknown as { desktop: unknown }).desktop = { runtime: 'something-else' };
    expect(shouldStartLiveServices()).toBe(false);
  });
});
