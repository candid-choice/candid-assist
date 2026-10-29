import { describe, it, expect } from 'vitest';
import { deriveSessionTabs, reopenRecordedSurface } from '@/views/lib/session-tabs';
import type { SessionDoc } from '@/views/services/sync/types';

const session: SessionDoc = {
  id: 's1',
  userId: 'u1',
  title: 'pi · abc123 · 10:00',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  archivedAt: null,
  surfaces: [
    { surfaceId: 'surf_1', type: 'browser', url: 'https://react.dev', prompt: '', createdAt: '2026-01-01T00:00:00.000Z', userResponse: null, claudeResponse: null, closedAt: null },
    { surfaceId: 'surf_2', type: 'code-diff', url: null, prompt: 'auth refactor', createdAt: '2026-01-01T00:01:00.000Z', userResponse: null, claudeResponse: null, closedAt: '2026-01-01T00:02:00.000Z' },
  ],
};

describe('deriveSessionTabs', () => {
  it('lists open session views + recorded surfaces not currently open', () => {
    const views = [
      { id: 'surf_1', label: 'Browser', type: 'browser', title: 't', payload: {}, source: 'mcp', createdAt: 1, sessionId: 's1' },
      { id: 'other', label: 'Other', type: 'browser', title: 't', payload: {}, source: 'mcp', createdAt: 1, sessionId: 's2' },
    ] as never;
    const tabs = deriveSessionTabs(session, views);
    expect(tabs.map((t) => t.id)).toEqual(['surf_1', 'saved:surf_2']);
    expect(tabs[1]!.label).toContain('Code-diff');
    expect(tabs[1]!.label).toContain('auth refactor');
    expect(tabs[1]!.open).toBe(false);
  });

  it('reopens a recorded surface as a live view config', () => {
    const cfg = reopenRecordedSurface(session.surfaces[1]!, 's1');
    expect(cfg.id).toBe('surf_2');
    expect(cfg.type).toBe('code-diff');
    expect(cfg.sessionId).toBe('s1');
    expect((cfg.payload as Record<string, unknown>).prompt).toBe('auth refactor');
  });
});
