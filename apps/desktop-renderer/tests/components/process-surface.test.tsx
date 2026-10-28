/** ProcessSurface rendering + user controls. */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';

import { ProcessSurface, type ManagedProcessInfo } from '@/views/components/surfaces/ProcessSurface';
import { wsService } from '@/views/services/ws-service';

vi.mock('@/views/services/ws-service', () => ({
  wsService: { send: vi.fn(() => true) },
}));

const running: ManagedProcessInfo = {
  id: 'proc_1',
  name: 'Dev Server',
  command: 'pnpm dev',
  cwd: '/app',
  startedAt: Date.now(),
  status: 'running',
  exitCode: null,
  output: ['ready on :3000', 'compiled 42 files'],
};

afterEach(() => cleanup());

describe('ProcessSurface', () => {
  it('renders processes with status + latest output', () => {
    render(<ProcessSurface processes={[running]} />);
    expect(screen.getByText('Dev Server')).toBeTruthy();
    expect(screen.getByText(/compiled 42 files/)).toBeTruthy();
    expect(screen.getByText(/1 running/)).toBeTruthy();
  });

  it('expands the log and sends control messages', () => {
    render(<ProcessSurface processes={[running]} />);
    fireEvent.click(screen.getByText('View Log'));
    expect(screen.getByText('ready on :3000')).toBeTruthy();

    fireEvent.click(screen.getByText('⏹ Stop'));
    expect(wsService.send).toHaveBeenCalledWith({
      type: 'process:control',
      id: 'proc_1',
      action: 'kill',
    });
    fireEvent.click(screen.getByText('↻ Restart'));
    expect(wsService.send).toHaveBeenCalledWith({
      type: 'process:control',
      id: 'proc_1',
      action: 'restart',
    });
  });

  it('shows empty state', () => {
    render(<ProcessSurface processes={[]} />);
    expect(screen.getByText(/No processes yet/)).toBeTruthy();
  });
});
