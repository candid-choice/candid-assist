import { describe, it, expect } from 'vitest';
import { surfaceLabel, surfaceIcon, pickVisibleSurface } from '@/views/lib/session-tabs';

describe('surfaceLabel / icons / visibility', () => {
  it('labels with payload hints', () => {
    expect(surfaceLabel('browser', { url: 'https://react.dev/reference' })).toBe('Browser · react.dev');
    expect(surfaceLabel('input', { question: 'Ship it?' })).toBe('Input · Ship it?');
    expect(surfaceLabel('code-diff', { diff: 'diff --git a/src/auth/guard.ts b/x' })).toBe('Code Diff · guard.ts');
    expect(surfaceLabel('terminal', { command: 'pnpm test' })).toBe('Terminal · pnpm test');
    expect(surfaceLabel('image', {})).toBe('Image');
  });

  it('icons per type', () => {
    expect(surfaceIcon('browser')).toBe('🌐');
    expect(surfaceIcon('code-diff')).toBe('🔀');
    expect(surfaceIcon('weird')).toBe('▫️');
  });

  it('never leaks surfaces across sessions', () => {
    const v1 = { id: 'a' };
    const v2 = { id: 'b' };
    expect(pickVisibleSurface(null, v1, [v1, v2])).toBeNull();
    expect(pickVisibleSurface({ id: 's1' }, v1, [v2])).toBe(v2);
    expect(pickVisibleSurface({ id: 's1' }, v2, [v1, v2])).toBe(v2);
    expect(pickVisibleSurface({ id: 's1' }, v1, [])).toBeNull();
  });
});

describe('recipe task names', () => {
  it('names search/scrape/drive tabs by task, not generic browser', () => {
    expect(surfaceLabel('browser', { url: 'https://google.com/search?q=x', searchQuery: 'resin printer' })).toBe('Search · resin printer');
    expect(surfaceLabel('browser', { url: 'https://acme.dev', goal: 'pricing table' })).toBe('Scrape · pricing table');
    expect(surfaceLabel('browser', { url: 'https://docs.google.com/x', doc: true })).toBe('Drive · docs.google.com');
    // plain browser unchanged
    expect(surfaceLabel('browser', { url: 'https://react.dev' })).toBe('Browser · react.dev');
  });
});
