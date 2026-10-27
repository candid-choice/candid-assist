import { describe, it, expect } from 'vitest';
import {
  parseShortcut,
  eventMatchesKey,
  isMacPlatform,
} from '@/views/hooks/use-keyboard-shortcuts';

describe('parseShortcut', () => {
  it('should parse simple shortcut', () => {
    const key = parseShortcut('A');
    expect(key.key).toBe('a');
    expect(key.shift).toBe(false);
    expect(key.alt).toBe(false);
    expect(key.ctrl).toBe(false);
    expect(key.meta).toBe(false);
  });

  it('should parse shortcut with shift', () => {
    const key = parseShortcut('S');
    expect(key.key).toBe('s');
    expect(key.shift).toBe(false);
  });

  it('should parse Mac shortcut (⌘+N)', () => {
    const key = parseShortcut('⌘+N');
    expect(key.key).toBe('n');
    expect(key.meta).toBe(true);
    expect(key.ctrl).toBe(false);
  });

  it('should parse Windows shortcut (Ctrl+N)', () => {
    const key = parseShortcut('Ctrl+N');
    expect(key.key).toBe('n');
    expect(key.ctrl).toBe(true);
  });

  it('should parse shortcut with Alt', () => {
    const key = parseShortcut('Alt+F');
    expect(key.key).toBe('f');
    expect(key.alt).toBe(true);
  });

  it('should parse complex shortcut', () => {
    const key = parseShortcut('Cmd+Shift+R');
    expect(key.key).toBe('r');
    expect(key.shift).toBe(true);
    expect(key.meta).toBe(true);
  });

  it('should ignore modifier keywords when extracting key', () => {
    const key = parseShortcut('Cmd+Shift+S');
    expect(key.key).toBe('s');
    expect(key.shift).toBe(true);
    expect(key.meta).toBe(true);
  });
});

describe('eventMatchesKey', () => {
  const mockKeyboardEvent = (
    key: string,
    metaKey = false,
    ctrlKey = false,
    shiftKey = false,
    altKey = false,
    code?: string,
  ): KeyboardEvent => {
    const event = {
      key,
      metaKey,
      ctrlKey,
      shiftKey,
      altKey,
      code: code || `Key${key.toUpperCase()}`,
    } as KeyboardEvent;
    return event;
  };

  it('should match basic key', () => {
    const event = mockKeyboardEvent('a');
    const key = parseShortcut('A');
    expect(eventMatchesKey(event, key)).toBe(true);
  });

  it('should match Mac meta key', () => {
    const event = mockKeyboardEvent('n', true);
    const key = parseShortcut('⌘+N');
    expect(eventMatchesKey(event, key)).toBe(true);
  });

  it('should not match when meta key mismatch', () => {
    const event = mockKeyboardEvent('n', false);
    const key = parseShortcut('⌘+N');
    expect(eventMatchesKey(event, key)).toBe(false);
  });

  it('should match shift key', () => {
    const event = mockKeyboardEvent('S', true, false, true);
    const key = parseShortcut('⌘+Shift+S');
    expect(eventMatchesKey(event, key)).toBe(true);
  });

  it('should not match when shift key mismatch', () => {
    const event = mockKeyboardEvent('S', false, false, false);
    const key = parseShortcut('⌘+Shift+S');
    expect(eventMatchesKey(event, key)).toBe(false);
  });
});

describe('isMacPlatform', () => {
  it('should return boolean', () => {
    const result = isMacPlatform();
    expect(typeof result).toBe('boolean');
  });
});

describe('Shortcut Parser Edge Cases', () => {
  it('should handle multiple spaces', () => {
    const key = parseShortcut('  ⌘  +  N  ');
    expect(key.key).toBe('n');
    expect(key.meta).toBe(true);
  });

  it('should handle lowercase modifiers', () => {
    const key = parseShortcut('cmd+n');
    expect(key.key).toBe('n');
    expect(key.meta).toBe(true);
  });

  it('should handle mixed case', () => {
    const key = parseShortcut('⌘+Shift+k');
    expect(key.key).toBe('k');
    expect(key.shift).toBe(true);
  });
});
