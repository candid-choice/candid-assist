/** Sidebar project label → project web-access panel.

A session row shows its originating project as a clickable chip; clicking it
opens a panel listing every domain granted to THAT project (never another),
with the audit trail, and lets the human revoke per-domain or all at once.
Grants are stored per project (grantsByProject) — this is the per-project
isolation made reviewable from the session itself.
*/

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';

import { AppSidebar, toSidebarSession } from '@/views/components/AppSidebar';
import { useStore } from '@/views/store';
import { wsService } from '@/views/services/ws-service';
import type { SessionDoc } from '@/views/services/sync/types';

function makeSession(id: string, overrides: Partial<SessionDoc> = {}): SessionDoc {
  return {
    id,
    userId: 'user-1',
    title: `Session ${id}`,
    status: 'active',
    surfaces: [],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    archivedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  cleanup();
  act(() => {
    useStore.setState({
      sessions: [],
      activeSessionId: null,
      browserGrants: [],
      grantsByProject: {},
      consentLog: [],
    } as never);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('toSidebarSession project mapping', () => {
  it('maps agentProject through to project', () => {
    expect(toSidebarSession(makeSession('a', { agentProject: 'candid-assist' })).project).toBe(
      'candid-assist',
    );
  });
  it('leaves project undefined when the session has no project', () => {
    expect(toSidebarSession(makeSession('b')).project).toBeUndefined();
  });
});

describe('Sidebar project chip → access panel', () => {
  it('renders a project chip that opens a panel listing that project grants', () => {
    act(() => {
      useStore.getState().setSessions([makeSession('a', { agentProject: 'projA' })]);
      useStore.getState().grantForProject('projA', 'google.com', {
        agentClient: 'pi',
        tool: 'googleSearch',
      });
      useStore.getState().grantForProject('projB', 'openai.com', { agentClient: 'pi' });
    });
    render(<AppSidebar open width={240} />);

    // Chip is present and labeled with the project name.
    const chip = screen.getByRole('button', { name: 'Project projA — view web access' });
    expect(chip).toBeTruthy();

    fireEvent.click(chip);
    // Panel shows projA's grant but NEVER projB's (isolation).
    expect(screen.getByText('Project web access')).toBeTruthy();
    expect(screen.getByText('google.com')).toBeTruthy();
    expect(screen.queryByText('openai.com')).toBeNull();
    // Audit line names the granting agent + tool.
    expect(screen.getAllByText(/via pi/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/googleSearch/).length).toBeGreaterThan(0);
  });

  it('revoke removes only that project grant and syncs the per-project map', () => {
    const send = vi.spyOn(wsService, 'send').mockReturnValue(true);
    act(() => {
      useStore.getState().setSessions([makeSession('a', { agentProject: 'projA' })]);
      useStore.getState().grantForProject('projA', 'google.com');
      useStore.getState().grantForProject('projA', 'x.com');
      useStore.getState().grantForProject('projB', 'keep.com');
    });
    render(<AppSidebar open width={240} />);

    fireEvent.click(screen.getByRole('button', { name: 'Project projA — view web access' }));
    fireEvent.click(screen.getByRole('button', { name: 'Revoke x.com for projA' }));

    expect(useStore.getState().grantsByProject['projA']).toEqual(['google.com']);
    expect(useStore.getState().grantsByProject['projB']).toEqual(['keep.com']);
    expect(send).toHaveBeenCalledWith({
      type: 'permission:sync',
      grants: { projA: ['google.com'], projB: ['keep.com'] },
    });
  });

  it('revoke-all clears the project bucket but leaves other projects intact', () => {
    vi.spyOn(wsService, 'send').mockReturnValue(true);
    act(() => {
      useStore.getState().setSessions([makeSession('a', { agentProject: 'projA' })]);
      useStore.getState().grantForProject('projA', 'google.com');
      useStore.getState().grantForProject('projB', 'keep.com');
    });
    render(<AppSidebar open width={240} />);

    fireEvent.click(screen.getByRole('button', { name: 'Project projA — view web access' }));
    fireEvent.click(screen.getByRole('button', { name: /Revoke all for .projA/i }));

    expect(useStore.getState().grantsByProject['projA']).toBeUndefined();
    expect(useStore.getState().grantsByProject['projB']).toEqual(['keep.com']);
  });

  it('shows the empty hint when the project has no grants yet', () => {
    act(() => {
      useStore.getState().setSessions([makeSession('a', { agentProject: 'projA' })]);
    });
    render(<AppSidebar open width={240} />);

    fireEvent.click(screen.getByRole('button', { name: 'Project projA — view web access' }));
    expect(screen.getByText(/No domains granted to .projA/i)).toBeTruthy();
  });

  it('does not render a chip for a session without a project', () => {
    act(() => {
      useStore.getState().setSessions([makeSession('a', { title: 'No project here' })]);
    });
    render(<AppSidebar open width={240} />);
    expect(screen.queryByText('No project here')).toBeTruthy();
    // No project chip buttons exist.
    expect(screen.queryByText('(unassigned)')).toBeNull();
  });
});
