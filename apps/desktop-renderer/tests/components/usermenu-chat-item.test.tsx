import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { UserMenu } from '@/views/components/UserMenu';


describe('UserMenu chat item', () => {
  afterEach(cleanup);

  it('shows Chat and toggles when chat bridge available', () => {
    const onToggleChat = vi.fn();
    render(
      <UserMenu
        onOpenSettings={() => undefined}
        chatAvailable
        chatOpen={false}
        onToggleChat={onToggleChat}
      />,
    );
    const trigger = document.querySelector('.ha-usermenu-chip') as HTMLElement;
    fireEvent.click(trigger);
    const item = screen.getByRole('menuitem', { name: /chat/i });
    fireEvent.click(item);
    expect(onToggleChat).toHaveBeenCalledTimes(1);
  });

  it('hidden without the bridge; shows check when open', () => {
    render(<UserMenu onOpenSettings={() => undefined} chatAvailable chatOpen onToggleChat={() => undefined} />);
    fireEvent.click(document.querySelector('.ha-usermenu-chip') as HTMLElement);
    expect(screen.getByRole('menuitem', { name: /chat/i })).toBeTruthy();
    expect(screen.getByText('✓')).toBeTruthy();
    cleanup();
    render(<UserMenu onOpenSettings={() => undefined} />);
    fireEvent.click(document.querySelector('.ha-usermenu-chip') as HTMLElement);
    expect(screen.queryByRole('menuitem', { name: /chat/i })).toBeNull();
  });
});
