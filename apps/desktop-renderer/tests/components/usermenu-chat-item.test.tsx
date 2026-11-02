import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { UserMenu } from '@/views/components/UserMenu';

// Chat intentionally LEFT the user menu: MCP/agent sessions must not
// carry chat; only user-added sessions get the chat column (auto-shown).
describe('UserMenu (chat removed)', () => {
  afterEach(cleanup);

  it('has no Chat item', () => {
    render(<UserMenu onOpenSettings={() => undefined} />);
    fireEvent.click(document.querySelector('.ha-usermenu-chip') as HTMLElement);
    expect(screen.queryByRole('menuitem', { name: /chat/i })).toBeNull();
    expect(screen.getByRole('menuitem', { name: /settings/i })).toBeTruthy();
  });
});
