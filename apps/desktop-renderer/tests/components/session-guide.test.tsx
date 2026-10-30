import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionEmptyGuide } from '@/views/components/SessionEmptyGuide';
import type { SessionDoc } from '@/views/services/sync/types';

const session: SessionDoc = {
  id: 's1', userId: 'u', title: 'pi · abc123 · 10:00', status: 'active',
  createdAt: 'x', updatedAt: 'x', archivedAt: null, surfaces: [],
};

describe('SessionEmptyGuide', () => {
  it('leads with authenticated-web value prop, not IDE basics', () => {
    render(<SessionEmptyGuide session={session} />);
    expect(screen.getByText('pi · abc123 · 10:00')).toBeTruthy();
    expect(screen.getByText(/authenticated web/i).textContent).toBeTruthy();
    expect(screen.getByText(/Google Drive \/ authenticated docs/)).toBeTruthy();
    expect(screen.getByText(/Selective scraping/)).toBeTruthy();
    expect(screen.getByText(/Human handoff/)).toBeTruthy();
    // demoted tier is explicitly labeled
    expect(screen.getByText(/your IDE can do these too/i)).toBeTruthy();
    // roadmap surfaces flagged
    expect(screen.getAllByText(/coming soon/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Circuit JSON \/ E-CAD preview/)).toBeTruthy();
  });
});
