/** BrowserSurface native-hide behavior.

The webview element must STAY MOUNTED (page stays loaded) while DOM
overlays are open; visibility is controlled via Electrobun's
toggleHidden() on the element.
*/

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';

// Stub the Electrobun custom element so toggleHidden is observable.
class FakeWebview extends HTMLElement {
  toggleHiddenCalls: boolean[] = [];
  toggleHidden(hidden?: boolean) {
    this.toggleHiddenCalls.push(Boolean(hidden));
  }
}
if (!customElements.get('electrobun-webview')) {
  customElements.define('electrobun-webview', FakeWebview);
}

import { BrowserSurface } from '@/views/components/surfaces/BrowserSurface';
import { useStore } from '@/views/store';

function getWebview(): FakeWebview {
  return document.querySelector('electrobun-webview') as FakeWebview;
}

beforeEach(() => {
  cleanup();
  document.documentElement.classList.remove('ha-native-hidden');
  useStore.setState({
    userMenuOpen: false,
    composerOpen: false,
    signInOpen: false,
    settingsOpen: false,
  });
});

afterEach(() => {
  document.documentElement.classList.remove('ha-native-hidden');
  vi.unstubAllGlobals();
});

describe('BrowserSurface', () => {
  it('renders the native webview element', () => {
    render(<BrowserSurface url="https://claude.ai" onUrlChange={() => {}} />);
    expect(getWebview()).not.toBeNull();
  });

  it('never unmounts the webview when overlays open (page stays loaded)', () => {
    render(<BrowserSurface url="https://claude.ai" onUrlChange={() => {}} />);
    const el = getWebview();

    act(() => {
      useStore.setState({ userMenuOpen: true });
    });
    expect(getWebview()).toBe(el); // same node, still in the DOM

    act(() => {
      useStore.setState({ settingsOpen: true });
    });
    expect(getWebview()).toBe(el);
  });

  it('keeps the address bar interactive', () => {
    render(<BrowserSurface url="https://claude.ai" onUrlChange={() => {}} />);
    expect(document.querySelector('.ha-browser-url-input')).not.toBeNull();
  });
});

// ── Electron mode (window.desktop bridge) ────────────────────────────────

function stubDesktop() {
  const api = {
    window: { minimize: vi.fn(), maximize: vi.fn(), close: vi.fn() },
    view: {
      create: vi.fn(),
      setBounds: vi.fn(),
      setVisible: vi.fn(),
      destroy: vi.fn(),
    },
    runtime: 'electron' as const,
  };
  vi.stubGlobal('desktop', api);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  return api;
}

describe('BrowserSurface (Electron mode)', () => {
  it('renders an Electron <webview> in the DOM (not the electrobun element, not a native view)', () => {
    const api = stubDesktop();
    render(<BrowserSurface url="https://claude.ai" onUrlChange={() => {}} />);

    expect(document.querySelector('electrobun-webview')).toBeNull();
    const wv = document.querySelector('webview');
    expect(wv).not.toBeNull();
    expect(wv!.getAttribute('src')).toBe('https://claude.ai');
    // No native-view IPC anymore — the page lives in the DOM z-order.
    expect(api.view.create).not.toHaveBeenCalled();
  });

  it('stays mounted and visible when overlays open (no hiding)', () => {
    const api = stubDesktop();
    render(<BrowserSurface url="https://claude.ai" onUrlChange={() => {}} />);

    act(() => {
      useStore.setState({ userMenuOpen: true });
    });
    expect(document.querySelector('webview')).not.toBeNull();
    expect(api.view.setVisible).not.toHaveBeenCalled();

    act(() => {
      useStore.setState({ userMenuOpen: false });
    });
    expect(document.querySelector('webview')).not.toBeNull();
  });

  it('updates the webview src when the url prop changes', () => {
    stubDesktop();
    const { rerender } = render(
      <BrowserSurface url="https://claude.ai" onUrlChange={() => {}} />,
    );
    rerender(<BrowserSurface url="https://example.com" onUrlChange={() => {}} />);

    const wv = document.querySelector('webview');
    expect(wv!.getAttribute('src')).toBe('https://example.com');
  });

  it('keeps the address bar interactive in Electron mode', () => {
    stubDesktop();
    render(<BrowserSurface url="https://claude.ai" onUrlChange={() => {}} />);
    expect(document.querySelector('.ha-browser-url-input')).not.toBeNull();
  });
});

import { useWindowMaximize } from '@/views/services/window-controls';

function MaxHarness() {
  const { toggleMaximize } = useWindowMaximize();
  return <button onClick={toggleMaximize}>max</button>;
}

describe('useWindowMaximize (Electron mode)', () => {
  it('routes to the desktop bridge', () => {
    const api = stubDesktop();
    render(<MaxHarness />);
    fireEvent.click(screen_get('max'));
    expect(api.window.maximize).toHaveBeenCalled();

    function screen_get(t: string) {
      // local helper to avoid importing screen at top while unused elsewhere
      return document.querySelector('button')!;
    }
  });
});
