/** Offline queue replay-executor integration tests.

Verifies the executor hook added for Firestore sync:
  setReplayExecutor → queueAction → replayQueue delivers real actions,
  removes successes, keeps failures, honors maxRetries.
*/

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  setReplayExecutor,
  queueAction,
  replayQueue,
  getQueueSize,
  clearQueue,
  getPendingActions,
} from '@/views/errors/offline-queue';

beforeEach(async () => {
  await clearQueue();
  setReplayExecutor(null as never);
});

describe('offline queue replay executor', () => {
  it('delivers queued actions to the registered executor', async () => {
    const executor = vi.fn(async () => {});
    setReplayExecutor(executor);

    await queueAction('createSession', { title: 'Queued', workspacePath: '/x' });
    await replayQueue();

    expect(executor).toHaveBeenCalledTimes(1);
    const action = executor.mock.calls[0]![0];
    expect(action.op).toBe('createSession');
    expect(action.data).toEqual({ title: 'Queued', workspacePath: '/x' });
  });

  it('removes successfully replayed actions from the queue', async () => {
    setReplayExecutor(async () => {});

    await queueAction('archiveSession', { sessionId: 's1' });
    await queueAction('archiveSession', { sessionId: 's2' });
    expect(await getQueueSize()).toBe(2);

    await replayQueue();
    expect(await getQueueSize()).toBe(0);
  });

  it('keeps failed actions queued and increments attempts', async () => {
    const executor = vi.fn(async () => {
      throw new Error('backend down');
    });
    setReplayExecutor(executor);

    await queueAction('createSession', { title: 'Keep me' });
    await replayQueue();

    expect(await getQueueSize()).toBe(1);
    const pending = await getPendingActions();
    expect(pending[0]!.attempts).toBe(1);
    expect(pending[0]!.data).toEqual({ title: 'Keep me' });
  });

  it('drops actions after maxRetries (3) failed replays', async () => {
    const executor = vi.fn(async () => {
      throw new Error('backend down');
    });
    setReplayExecutor(executor);

    await queueAction('createSession', { title: 'Doomed' });

    await replayQueue(); // attempts 1
    await replayQueue(); // attempts 2
    await replayQueue(); // attempts 3 → dropped

    expect(await getQueueSize()).toBe(0);
  });

  it('without an executor, replay still drains the queue', async () => {
    setReplayExecutor(null as never);
    await queueAction('createSession', { title: 'No executor' });

    await replayQueue();
    expect(await getQueueSize()).toBe(0);
  });

  it('replays in FIFO order', async () => {
    const order: string[] = [];
    setReplayExecutor(async (action) => {
      order.push(String(action.data['sessionId']));
    });

    await queueAction('archiveSession', { sessionId: 'a' });
    await queueAction('archiveSession', { sessionId: 'b' });
    await queueAction('archiveSession', { sessionId: 'c' });

    await replayQueue();
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('mixed success/failure keeps only failures', async () => {
    setReplayExecutor(async (action) => {
      if (action.data['fail']) {
        throw new Error('nope');
      }
    });

    await queueAction('updateSession', { sessionId: 'ok-1' });
    await queueAction('updateSession', { sessionId: 'bad-1', fail: true });
    await queueAction('updateSession', { sessionId: 'ok-2' });

    await replayQueue();

    expect(await getQueueSize()).toBe(1);
    const pending = await getPendingActions();
    expect(pending[0]!.data['sessionId']).toBe('bad-1');
  });
});
