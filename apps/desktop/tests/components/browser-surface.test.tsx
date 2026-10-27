/** BrowserSurface native-webview unmount behavior. */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';

import { BrowserSurface } from '@/views/components/surfaces/BrowserSurface';
import { useStore } from '@/views/store';

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

function webviewCount() {
  return document.querySelectorAll('electrobun-webview').length;
}

describe('BrowserSurface', () => {
  it('renders the native webview element by default', () => {
    render(<BrowserSurface url="https://claude.ai" onUrlChange={() => {}} />);
    expect(webviewCount()).toBe(1);
  });

  it('unmounts the webview when an overlay opens (native views ignore display:none)', () => {
    render(<BrowserSurface url="https://claude.ai" onUrlChange={() => {}} />);
    expect(webviewCount()).toBe(1);

    act(() => {
      useStore.setState({ settingsOpen: true });
    });

    expect(webviewCount()).toBe(0);
    expect(document.querySelector('.ha-webview-hidden')).not.toBeNull();
  });

  it('restores the webview when overlays close', () => {
    render(<BrowserSurface url="https://claude.ai" onUrlChange={() => {}} />);

    act(() => {
      useStore.setState({ userMenuOpen: true });
    });
    expect(webviewCount()).toBe(0);

    act(() => {
      useStore.setState({ userMenuOpen: false });
    });
    expect(webviewCount()).toBe(1);
  });

  it('keeps the address bar interactive while hidden', () => {
    render(<BrowserSurface url="https://claude.ai" onUrlChange={() => {}} />);
    act(() => {
      useStore.setState({ composerOpen: true });
    });
    expect(screen_has_url_input()).toBe(true);

    function screen_has_url_input() {
      return !!document.querySelector('.ha-browser-url-input');
    }
  });
});
