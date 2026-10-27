/** Human Assist — useHideNativeViews.

Electrobun renders `<electrobun-webview>` as a NATIVE subview composited
above all DOM content — CSS z-index cannot place DOM overlays on top of
it. While modals/dropdowns are open we therefore hide the webview
elements entirely (via the `ha-native-hidden` root class), which also
lets outside-click close work over that region.

Usage (in App):
  useHideNativeViews({ settingsOpen });
*/

import { useEffect } from "react";

import { useStore } from "../store";

const ROOT_CLASS = "ha-native-hidden";

export function useHideNativeViews(extra: { settingsOpen?: boolean } = {}): void {
  const userMenuOpen = useStore((s) => s.userMenuOpen);
  const composerOpen = useStore((s) => s.composerOpen);
  const signInOpen = useStore((s) => s.signInOpen);
  const { settingsOpen = false } = extra;

  const anyOverlay = userMenuOpen || composerOpen || signInOpen || settingsOpen;

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
