/** ConnectionIndicator component tests.

Renders the indicator for each connection state and asserts the visible
label, data-state attribute, and dot styling class.
*/

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';

import { ConnectionIndicator } from '@/views/components/ConnectionIndicator';
import { useStore } from '@/views/store';

afterEach(() => {
  cleanup();
  // Reset volatile connection state between tests
  useStore.setState({ connectionState: 'disconnected', mcpAgentCount: 0 });
});

describe('ConnectionIndicator', () => {
  it('shows "Offline" when disconnected', () => {
    useStore.setState({ connectionState: 'disconnected' });
    render(<ConnectionIndicator />);

    const el = screen.getByRole('status');
    expect(el.textContent).toBe('MCP offline');
    expect(el.getAttribute('data-state')).toBe('disconnected');
    const dot = el.querySelector('.ha-connection-dot');
    expect(dot?.className).toContain('ha-connection-dot--disconnected');
  });

  it('shows "Connecting…" while connecting', () => {
    useStore.setState({ connectionState: 'connecting' });
    render(<ConnectionIndicator />);

    const el = screen.getByRole('status');
    expect(el.textContent).toBe('Connecting to MCP…');
    expect(el.getAttribute('data-state')).toBe('connecting');
    const dot = el.querySelector('.ha-connection-dot');
    expect(dot?.className).toContain('ha-connection-dot--connecting');
  });

  it('shows "MCP connected" when transport is up AND an agent is seen', () => {
    useStore.setState({ connectionState: 'connected', mcpAgentCount: 1 });
    render(<ConnectionIndicator />);

    const el = screen.getByRole('status');
    expect(el.textContent).toBe('1 MCP agent connected');
    expect(el.getAttribute('data-state')).toBe('connected');
    const dot = el.querySelector('.ha-connection-dot');
    expect(dot?.className).toContain('ha-connection-dot--connected');
  });

  it('shows "Waiting for agent…" when transport is up but no agent connected', () => {
    useStore.setState({ connectionState: 'connected', mcpAgentCount: 0 });
    render(<ConnectionIndicator />);

    const el = screen.getByRole('status');
    expect(el.textContent).toBe('Waiting for agent…');
    const dot = el.querySelector('.ha-connection-dot');
    expect(dot?.className).toContain('ha-connection-dot--connecting');
  });

  it('updates reactively when store state changes', () => {
    useStore.setState({ connectionState: 'disconnected', mcpAgentCount: 0 });
    render(<ConnectionIndicator />);
    expect(screen.getByRole('status').textContent).toBe('MCP offline');

    act(() => {
      useStore.setState({ connectionState: 'connected', mcpAgentCount: 0 });
    });
    expect(screen.getByRole('status').textContent).toBe('Waiting for agent…');

    act(() => {
      useStore.setState({ mcpAgentCount: 1 });
    });
    // Component subscribes via zustand — DOM updates without rerender
    expect(screen.getByRole('status').textContent).toBe('1 MCP agent connected');
  });
});

describe('ConnectionIndicator — agent count', () => {
  it('shows the number of connected agents', () => {
    useStore.setState({ connectionState: 'connected', mcpAgentCount: 3 });
    render(<ConnectionIndicator />);
    expect(screen.getByRole('status').textContent).toBe('3 MCP agents connected');
  });
});
