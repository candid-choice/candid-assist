/** Process registry — Claude/pi-launched background processes.

The desktop app is the supervisor: agents start dev servers / test
runners through MCP, and the ProcessManager surface shows live status,
output tails, and kill/restart controls (user buttons send
{type:'process:control'} over the surface WS, handled by mcp-server).
*/

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";

export type ProcessStatus = "running" | "stopped" | "crashed" | "exited";

export interface ManagedProcess {
  id: string;
  name: string;
  command: string;
  cwd: string;
  startedAt: number;
  stoppedAt?: number;
  status: ProcessStatus;
  exitCode: number | null;
  /** Ring buffer of recent output lines (stderr prefixed). */
  output: string[];
  child?: ChildProcessWithoutNullStreams;
}

export type ProcessListener = (proc: ManagedProcess) => void;

const OUTPUT_LIMIT = 200;
const processes = new Map<string, ManagedProcess>();
const listeners = new Set<ProcessListener>();

export function onProcessEvent(fn: ProcessListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(proc: ManagedProcess): void {
  for (const fn of listeners) {
    try {
      fn(proc);
    } catch {
      /* listener errors never break the supervisor */
    }
  }
}

function appendOutput(proc: ManagedProcess, line: string, isErr = false): void {
  proc.output.push(isErr ? `stderr: ${line}` : line);
  if (proc.output.length > OUTPUT_LIMIT) proc.output.shift();
}

export function startProcess(opts: {
  name: string;
  command: string;
  cwd?: string;
}): ManagedProcess {
  if (processes.size >= 10) {
    throw new Error("PROC_001: maximum 10 managed processes");
  }
  const id = `proc_${randomUUID().slice(0, 8)}`;
  const proc: ManagedProcess = {
    id,
    name: opts.name,
    command: opts.command,
    cwd: opts.cwd ?? process.cwd(),
    startedAt: Date.now(),
    status: "running",
    exitCode: null,
    output: [],
  };
  const child = spawn(opts.command, {
    shell: true,
    cwd: proc.cwd,
    env: process.env,
  }) as ChildProcessWithoutNullStreams;
  proc.child = child;
  child.stdout.on("data", (d: Buffer) => {
    for (const l of d.toString().split(/\r?\n/)) {
      if (l.trim()) appendOutput(proc, l.slice(0, 500));
    }
    emit(proc);
  });
  child.stderr.on("data", (d: Buffer) => {
    for (const l of d.toString().split(/\r?\n/)) {
      if (l.trim()) appendOutput(proc, l.slice(0, 500), true);
    }
    emit(proc);
  });
  child.on("error", (err) => {
    appendOutput(proc, `spawn error: ${err.message}`, true);
    proc.status = "crashed";
    proc.stoppedAt = Date.now();
    emit(proc);
  });
  child.on("exit", (code) => {
    proc.exitCode = code;
    proc.status = code === 0 ? "exited" : code === null ? "crashed" : code > 128 ? "crashed" : "stopped";
    proc.stoppedAt = Date.now();
    proc.child = undefined;
    emit(proc);
  });
  processes.set(id, proc);
  emit(proc);
  return proc;
}

export function stopProcess(id: string): ManagedProcess {
  const proc = requireProc(id);
  proc.child?.kill("SIGTERM");
  return proc;
}

export function restartProcess(id: string): ManagedProcess {
  const proc = requireProc(id);
  const { name, command, cwd } = proc;
  proc.child?.kill("SIGTERM");
  processes.delete(id);
  return startProcess({ name, command, cwd });
}

export function getProcess(id: string): ManagedProcess | undefined {
  return processes.get(id);
}

export function listProcesses(): ManagedProcess[] {
  return [...processes.values()];
}

/** Serializable snapshot (no child handles) for surface payloads. */
export function snapshotProcesses(): Array<Omit<ManagedProcess, "child">> {
  return listProcesses().map(({ child: _child, ...rest }) => rest);
}

function requireProc(id: string): ManagedProcess {
  const proc = processes.get(id);
  if (!proc) throw new Error(`PROC_002: unknown process "${id}"`);
  return proc;
}
