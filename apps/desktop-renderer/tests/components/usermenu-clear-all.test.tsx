import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { UserMenu } from '@/views/components/UserMenu';
import { useStore } from '@/views/store';
import { deleteSession } from '@/views/services/sync/sync-service';

vi.mock('@/views/services/sync/sync-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/views/services/sync/sync-service')>();
  return { ...actual, deleteSession: vi.fn(async () => ({})) };
});

function session(id: string) {
  return {
    id,
    title: `S ${id}`,
    status: 'active',
    createdAt: 't',
    updatedAt: 't',
  } as never;
}

describe('UserMenu ▸ Clear all sessions (moved out of the sidebar)', () => {
  beforeEach(() => {
    useStore.setState({ sessions: [], activeSessionId: null, views: {}, userMenuOpen: false });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('hidden when there are no sessions', () => {
    render(<UserMenu onOpenSettings={() => undefined} />);
    fireEvent.click(document.querySelector('.ha-usermenu-chip') as HTMLElement);
    expect(screen.queryByRole('menuitem', { name: /clear all/i })).toBeNull();
  });

  it('clears the store and queues backend deletes for every session', () => {
    useStore.setState({ sessions: [session('a'), session('b')] });
    const confirm = vi.fn(() => true);
    (window as unknown as { confirm: unknown }).confirm = confirm;
    render(<UserMenu onOpenSettings={() => undefined} />);
    fireEvent.click(document.querySelector('.ha-usermenu-chip') as HTMLElement);
    fireEvent.click(screen.getByRole('menuitem', { name: /clear all/i }));
    expect(useStore.getState().sessions).toHaveLength(0);
    expect(deleteSession).toHaveBeenCalledWith('a');
    expect(deleteSession).toHaveBeenCalledWith('b');
  });

  it('denying the confirm keeps sessions', () => {
    useStore.setState({ sessions: [session('a')] });
    (window as unknown as { confirm: unknown }).confirm = () => false;
    render(<UserMenu onOpenSettings={() => undefined} />);
    fireEvent.click(document.querySelector('.ha-usermenu-chip') as HTMLElement);
    fireEvent.click(screen.getByRole('menuitem', { name: /clear all/i }));
    expect(useStore.getState().sessions).toHaveLength(1);
  });
});
