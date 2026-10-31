import { describe, it, expect } from 'vitest';
import { parseSceneSpec } from '@/views/lib/three-scene';

describe('parseSceneSpec', () => {
  it('normalizes valid primitives', () => {
    const spec = parseSceneSpec({
      primitives: [
        { type: 'box', position: [1, 2, 3], size: 2, color: '#ff0000' },
        { type: 'sphere' },
      ],
      background: '#000000',
      camera: { x: 1 },
    });
    expect(spec.primitives[0]).toEqual({ type: 'box', position: [1, 2, 3], size: 2, color: '#ff0000' });
    expect(spec.primitives[1]!.color).toBe('#6366f8');
    expect(spec.primitives[1]!.size).toBe(1);
    expect(spec.background).toBe('#000000');
    expect(spec.camera).toEqual({ x: 1, y: 5, z: 8 });
  });

  it('rejects empty lists, bad kinds, and caps count', () => {
    expect(() => parseSceneSpec({ primitives: [] })).toThrow(/3D_001/);
    expect(() => parseSceneSpec({ primitives: [{ type: 'pyramid' }] })).toThrow(/3D_003/);
    expect(() =>
      parseSceneSpec({ primitives: Array.from({ length: 65 }, () => ({ type: 'box' })) }),
    ).toThrow(/3D_002/);
  });

  it('clamps absurd sizes and rejects malformed positions', () => {
    const spec = parseSceneSpec({ primitives: [{ type: 'box', size: 1e6, position: ['a', 2, 3] }] });
    expect(spec.primitives[0]!.size).toBe(50);
    expect(spec.primitives[0]!.position).toEqual([0, 0, 0]);
  });
});
