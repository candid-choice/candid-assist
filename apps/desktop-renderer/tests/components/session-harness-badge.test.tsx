/** SessionHarnessBadge tests — footer harness id display. */

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';

import { SessionHarnessBadge } from '@/views/components/SessionHarnessBadge';
import { useStore } from '@/views/store';
import type { SessionDoc } from '@/views/services/sync/types';

function makeSession(overrides: Partial<SessionDoc> = {}): SessionDoc {
  return {
    id: 's1',
    userId: 'u1',
    title: 'pi · abc123456789 · 10:00',
    status: 'active',
    surfaces: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    archivedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  useStore.setState({ sessions: [], activeSessionId: null });
});

afterEach(() => cleanup());

describe('SessionHarnessBadge', () => {
  it('renders nothing when no session is active', () => {
    const { container } = render(<SessionHarnessBadge />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing for a non-agent session', () => {
    useStore.setState({ sessions: [makeSession()], activeSessionId: 's1' });
    const { container } = render(<SessionHarnessBadge />);
    expect(container.innerHTML).toBe('');
  });

  it('shows client and harness id for an agent session', () => {
    useStore.setState({
      sessions: [makeSession({ agentClient: 'pi', agentSessionId: 'harness-abcdef-012345' })],
      activeSessionId: 's1',
    });
    render(<SessionHarnessBadge />);
    const badge = screen.getByTestId('harness-badge');
    expect(badge.textContent).toContain('pi');
    expect(badge.getAttribute('title')).toContain('harness-abcdef-012345');
  });
});
