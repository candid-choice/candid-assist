/** BrowserSurface native-hide behavior.

The webview element must STAY MOUNTED (page stays loaded) while DOM
overlays are open; visibility is controlled via Electrobun's
toggleHidden() on the element.
*/

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';

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

  it('calls toggleHidden(true) when an overlay opens and (false) when it closes', () => {
    render(<BrowserSurface url="https://claude.ai" onUrlChange={() => {}} />);
    const el = getWebview();

    act(() => {
      useStore.setState({ userMenuOpen: true });
    });
    expect(el.toggleHiddenCalls).toContain(true);

    act(() => {
      useStore.setState({ userMenuOpen: false });
    });
    expect(el.toggleHiddenCalls).toContain(false);
  });

  it('stays hidden while any overlay remains open', () => {
    render(<BrowserSurface url="https://claude.ai" onUrlChange={() => {}} />);
    const el = getWebview();

    act(() => {
      useStore.setState({ userMenuOpen: true, composerOpen: true });
    });
    act(() => {
      useStore.setState({ userMenuOpen: false });
    });
    // Last call must still be hidden=true (composer remains open)
    expect(el.toggleHiddenCalls.at(-1)).toBe(true);

    act(() => {
      useStore.setState({ composerOpen: false });
    });
    expect(el.toggleHiddenCalls.at(-1)).toBe(false);
  });

  it('keeps the address bar interactive', () => {
    render(<BrowserSurface url="https://claude.ai" onUrlChange={() => {}} />);
    expect(document.querySelector('.ha-browser-url-input')).not.toBeNull();
  });
});
