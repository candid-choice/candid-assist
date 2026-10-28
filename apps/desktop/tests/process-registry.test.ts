/** Process registry + process MCP tools. */

import { describe, it, expect } from 'vitest';
import { startProcess, stopProcess, listProcesses, getProcess, snapshotProcesses } from '@/process-registry';

describe('process registry', () => {
  it('starts a process, captures output, records clean exit', async () => {
    const proc = startProcess({ name: 'echo', command: 'echo hello-proc && exit 0' });
    expect(proc.status).toBe('running');
    await new Promise((r) => setTimeout(r, 700));
    const done = getProcess(proc.id)!;
    expect(done.output.join('\n')).toContain('hello-proc');
    expect(['exited', 'stopped']).toContain(done.status);
    expect(done.exitCode).toBe(0);
  });

  it('kills a long-running process', async () => {
    const proc = startProcess({ name: 'sleeper', command: 'sleep 30' });
    expect(listProcesses().some((p) => p.id === proc.id)).toBe(true);
    stopProcess(proc.id);
    await new Promise((r) => setTimeout(r, 500));
    const done = getProcess(proc.id)!;
    expect(['stopped', 'crashed', 'exited']).toContain(done.status);
  });

  it('snapshot omits child handles', () => {
    const snap = snapshotProcesses();
    for (const p of snap) expect((p as Record<string, unknown>)['child']).toBeUndefined();
  });
});
