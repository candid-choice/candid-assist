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
  it('hosts a WebContentsView instead of the electrobun element', () => {
    const api = stubDesktop();
    render(<BrowserSurface url="https://claude.ai" onUrlChange={() => {}} />);

    expect(document.querySelector('electrobun-webview')).toBeNull();
    expect(document.querySelector('.ha-webview-host')).not.toBeNull();
    expect(api.view.create).toHaveBeenCalledTimes(1);
    const [id, url] = api.view.create.mock.calls[0]!;
    expect(String(id)).toMatch(/^ha-view-/);
    expect(url).toBe('https://claude.ai');
  });

  it('hides the native view while overlays are open, restores after', () => {
    const api = stubDesktop();
    render(<BrowserSurface url="https://claude.ai" onUrlChange={() => {}} />);

    act(() => {
      useStore.setState({ settingsOpen: true });
    });
    expect(api.view.setVisible).toHaveBeenLastCalledWith(expect.stringMatching(/^ha-view-/), false);

    act(() => {
      useStore.setState({ settingsOpen: false });
    });
    expect(api.view.setVisible).toHaveBeenLastCalledWith(expect.stringMatching(/^ha-view-/), true);
  });

  it('destroys the view on unmount', () => {
    const api = stubDesktop();
    const { unmount } = render(
      <BrowserSurface url="https://example.com" onUrlChange={() => {}} />,
    );
    unmount();
    expect(api.view.destroy).toHaveBeenCalledTimes(1);
  });

  it('reloadURL when the url prop changes', () => {
    const api = stubDesktop();
    const { rerender } = render(
      <BrowserSurface url="https://claude.ai" onUrlChange={() => {}} />,
    );
    rerender(<BrowserSurface url="https://example.com" onUrlChange={() => {}} />);

    // destroy (cleanup) then create with the new URL
    expect(api.view.destroy).toHaveBeenCalled();
    const urls = api.view.create.mock.calls.map((c) => c[1]);
    expect(urls).toContain('https://example.com');
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
