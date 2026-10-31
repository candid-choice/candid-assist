import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThreeSurface } from '@/views/components/surfaces/ThreeSurface';
import type { SurfaceConfig } from '@/views/types';

function cfg(payload: Record<string, unknown>): SurfaceConfig {
  return { id: 's', label: '3D', type: '3d' as never, title: '3D', payload, source: 'mcp', createdAt: 1 };
}

describe('ThreeSurface', () => {
  it('shows validation errors for bad scene specs', () => {
    render(<ThreeSurface config={cfg({ primitives: [] })} />);
    expect(screen.getByRole('alert').textContent).toContain('3D_001');
  });

  it('mounts with a valid spec (fallback path in jsdom, no crash)', () => {
    render(<ThreeSurface config={cfg({ primitives: [{ type: 'box', color: '#ff0000' }] })} />);
    expect(screen.getByTestId('three-surface')).toBeTruthy();
    expect(screen.getByText(/drag: orbit/)).toBeTruthy();
  });
});
