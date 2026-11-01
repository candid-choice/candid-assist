import { createPiChatRuntime } from '../electron/main/chat-runtime';
(async () => {
  const pi = await import('@earendil-works/pi-coding-agent');
  const { session } = await pi.createAgentSession({ sessionManager: pi.SessionManager.inMemory(), cwd: process.cwd() });
  const seen = new Set<string>();
  session.subscribe((ev: any) => {
    const key = ev?.type + (ev?.assistantMessageEvent?.type ? '/' + ev.assistantMessageEvent.type : '');
    if (!seen.has(key)) { seen.add(key); console.log('[evt]', key, JSON.stringify(ev).slice(0, 220)); }
  });
  const t2 = setTimeout(() => { console.log('TIMEOUT', [...seen]); session.dispose(); process.exit(1); }, 90000);
  try { await session.prompt('Reply with exactly: CHAT-PIPELINE-OK'); } catch (e) { console.log('PROMPT ERR', (e as Error).message.slice(0, 200)); }
  console.log('LAST TEXT:', JSON.stringify(String(session.getLastAssistantText?.() ?? '').slice(0, 120)));
  clearTimeout(t2);
  session.dispose();
  process.exit(0);
  /* original path unused:
  const rt = await createPiChatRuntime({ cwd: process.cwd() });
  let text = '';
  const timer = setTimeout(() => { console.log('TIMEOUT partial:', text.slice(0, 200)); rt.abort(); rt.dispose(); process.exit(1); }, 90_000);
  try {
    await rt.prompt('Reply with exactly: CHAT-PIPELINE-OK', (e) => {
      if (e.kind === 'delta') text += e.text;
      if (e.kind === 'tool') console.log('[tool]', e.text);
    });
    console.log('REPLY:', JSON.stringify(text.slice(0, 200)));
  } catch (e) {
    console.log('ERROR:', (e as Error).message.slice(0, 300));
  } finally {
    clearTimeout(timer);
    rt.dispose();
    process.exit(0);
  }
})();
  */
})();
