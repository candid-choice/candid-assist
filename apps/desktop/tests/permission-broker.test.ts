import { describe, it, expect, vi } from 'vitest';
import { PermissionBroker, pendingPermissionIds } from '../src/permission-broker';

describe('PermissionBroker', () => {
  it('auto-allows granted domains without broadcasting', async () => {
    const broadcast = vi.fn();
    const broker = new PermissionBroker(broadcast);
    broker.syncGrants(['docs.google.com', 'WWW.ChatGPT.com']);

    expect(broker.hasGrant('https://docs.google.com/drive/home')).toBe(true);
    expect(broker.hasGrant('https://chatgpt.com/')).toBe(true);

    const out = await broker.ensure('https://docs.google.com/x', 'browserNavigate');
    expect(out).toEqual({ allowed: true, decision: 'always' });
    expect(broadcast).not.toHaveBeenCalled();
  });

  it('broadcasts a request and honors respond(once) without granting', async () => {
    const events: Record<string, unknown>[] = [];
    const broker = new PermissionBroker((e) => events.push(e), 5000);

    const p = broker.ensure('https://acme.dev/pricing', 'openBrowserSurface');
    await Promise.resolve();
    const id = pendingPermissionIds(broker)[0]!;
    expect(events[0]).toMatchObject({ event: 'permission:request' });
    expect((events[0] as { data: { host: string } }).data.host).toBe('acme.dev');

    expect(broker.respond(id, 'once')).toBe(true);
    expect(await p).toEqual({ allowed: true, decision: 'once' });
    expect(broker.hasGrant('https://acme.dev/pricing')).toBe(false);
  });

  it('respond(always) grants the domain for later navigations', async () => {
    const broker = new PermissionBroker(() => {}, 5000);
    const p = broker.ensure('https://openai.com/careers', 'browserNavigate');
    await Promise.resolve();
    broker.respond(pendingPermissionIds(broker)[0]!, 'always');
    expect((await p).allowed).toBe(true);
    // subsequent navigation: no prompt
    const later = await broker.ensure('https://openai.com/login', 'browserNavigate');
    expect(later).toEqual({ allowed: true, decision: 'always' });
  });

  it('deny blocks; unknown ids and double-respond are inert', async () => {
    const broker = new PermissionBroker(() => {}, 5000);
    const p = broker.ensure('https://evil.example/x', 'browserNavigate');
    await Promise.resolve();
    const id = pendingPermissionIds(broker)[0]!;
    expect(broker.respond('nope', 'once')).toBe(false);
    expect(broker.respond(id, 'deny')).toBe(true);
    expect(broker.respond(id, 'once')).toBe(false);
    expect(await p).toEqual({ allowed: false, decision: 'deny' });
  });

  it('fails closed on timeout when nobody answers', async () => {
    const broker = new PermissionBroker(() => {}, 30);
    const out = await broker.ensure('https://quiet.example', 'openBrowserSurface');
    expect(out).toEqual({ allowed: false, decision: 'timeout' });
  });
});

describe('PermissionBroker resolution broadcast', () => {
  it('broadcasts permission:resolved so other windows dismiss', async () => {
    const events: Record<string, unknown>[] = [];
    const broker = new PermissionBroker((e) => events.push(e), 5000);
    const p = broker.ensure('https://multi.example', 'browserNavigate');
    await Promise.resolve();
    broker.respond(pendingPermissionIds(broker)[0]!, 'once');
    await p;
    expect(events.map((e) => e.event)).toEqual([
      'permission:request',
      'permission:resolved',
    ]);
  });
});
