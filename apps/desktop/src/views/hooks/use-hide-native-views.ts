/** Human Assist — useHideNativeViews / useNativeViewsHidden.

Electrobun renders `<electrobun-webview>` as a NATIVE subview composited
above all DOM content. CSS z-index can't lift DOM overlays above it, and
the native layer does not honor `display:none` (it tracks layout bounds
only). So while modals/dropdowns are open we:

  1. Unmount the `<electrobun-webview>` elements entirely (components
     consult `useNativeViewsHidden()`) — removing the element reliably
     destroys the native subview.
  2. Also toggle the `ha-native-hidden` root class (CSS belt & braces).

Usage (in App):
  useHideNativeViews();

Usage (in webview-hosting components):
  const hidden = useNativeViewsHidden();
  ... hidden ? <placeholder/> : <electrobun-webview src={url} />
*/

import { useEffect } from "react";

import { useStore } from "../store";

const ROOT_CLASS = "ha-native-hidden";

/** True while any DOM overlay (user menu / composer / settings /
 *  sign-in) is open and native webviews must not be visible. */
export function useNativeViewsHidden(): boolean {
  return useStore(
    (s) => s.userMenuOpen || s.composerOpen || s.signInOpen || s.settingsOpen,
  );
}

/** Toggles the root-level `ha-native-hidden` class while overlays are open. */
export function useHideNativeViews(): void {
  const anyOverlay = useNativeViewsHidden();

  useEffect(() => {
    const root = document.documentElement;
    if (anyOverlay) {
      root.classList.add(ROOT_CLASS);
    } else {
      root.classList.remove(ROOT_CLASS);
    }
    return () => root.classList.remove(ROOT_CLASS);
  }, [anyOverlay]);
}
