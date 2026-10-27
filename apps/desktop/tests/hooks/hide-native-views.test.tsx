/** useHideNativeViews — root class toggling while overlays are open. */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';

import { useHideNativeViews } from '@/views/hooks/use-hide-native-views';
import { useStore } from '@/views/store';

function Harness() {
  useHideNativeViews({});
  return null;
}

beforeEach(() => {
  cleanup();
  document.documentElement.classList.remove('ha-native-hidden');
  useStore.setState({
    userMenuOpen: false,
    composerOpen: false,
    signInOpen: false,
  });
});

afterEach(() => {
  document.documentElement.classList.remove('ha-native-hidden');
});

describe('useHideNativeViews', () => {
  it('adds ha-native-hidden when user menu opens', () => {
    render(<Harness />);
    expect(document.documentElement.classList.contains('ha-native-hidden')).toBe(false);

    act(() => {
      useStore.setState({ userMenuOpen: true });
    });
    expect(document.documentElement.classList.contains('ha-native-hidden')).toBe(true);
  });

  it('removes it again when all overlays close', () => {
    render(<Harness />);
    act(() => {
      useStore.setState({ composerOpen: true });
    });
    expect(document.documentElement.classList.contains('ha-native-hidden')).toBe(true);

    act(() => {
      useStore.setState({ composerOpen: false });
    });
    expect(document.documentElement.classList.contains('ha-native-hidden')).toBe(false);
  });

  it('stays hidden while any overlay remains open', () => {
    render(<Harness />);
    act(() => {
      useStore.setState({ userMenuOpen: true, signInOpen: true });
    });
    act(() => {
      useStore.setState({ userMenuOpen: false });
    });
    expect(document.documentElement.classList.contains('ha-native-hidden')).toBe(true);
  });

  it('cleans up on unmount', () => {
    const { unmount } = render(<Harness />);
    act(() => {
      useStore.setState({ userMenuOpen: true });
    });
    unmount();
    expect(document.documentElement.classList.contains('ha-native-hidden')).toBe(false);
  });
});
