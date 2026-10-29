/** SidebarResizer drag behavior + resize indication. */

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';

import { SidebarResizer } from '@/views/components/SidebarResizer';
import { useStore } from '@/views/store';

afterEach(() => {
  cleanup();
  document.body.classList.remove('ha-resizing-sidebar');
  useStore.setState({ sidebarWidth: 240 });
});

const drag = (dx: number) => {
  const el = document.querySelector('.ha-sidebar-resizer')!;
  fireEvent.mouseDown(el, { button: 0, clientX: 100 });
  expect(el.className).toContain('ha-sidebar-resizer--active');
  expect(document.body.className).toContain('ha-resizing-sidebar');
  fireEvent.mouseMove(document, { clientX: 100 + dx });
  fireEvent.mouseUp(document);
  expect(el.className).not.toContain('ha-sidebar-resizer--active');
  expect(document.body.className).not.toContain('ha-resizing-sidebar');
};

describe('SidebarResizer', () => {
  it('resizes by drag and indicates the active state', () => {
    render(<SidebarResizer />);
    drag(100);
    expect(useStore.getState().sidebarWidth).toBe(340);
  });

  it('clamps to min/max', () => {
    render(<SidebarResizer />);
    drag(-500);
    expect(useStore.getState().sidebarWidth).toBe(180);
    drag(2000);
    expect(useStore.getState().sidebarWidth).toBe(520);
  });

  it('double-click resets to default', () => {
    useStore.setState({ sidebarWidth: 400 });
    render(<SidebarResizer />);
    fireEvent.doubleClick(document.querySelector('.ha-sidebar-resizer')!);
    expect(useStore.getState().sidebarWidth).toBe(240);
  });
});
