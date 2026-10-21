/** Human Assist — Network Status Detection.

Monitors navigator.onLine and online/offline events.
Updates the error context with appropriate network errors.

Usage:
  const { online, bannerMessage, offline } = useNetworkStatus();

  if (offline) {
    // Show offline banner
  }
*/

import { useEffect, useRef } from 'react';

import { ErrorCode, ErrorSeverity, HAError } from './error-hierarchy';
import { useErrors } from './error-context';
import { onDisconnect, onReconnect } from './offline-queue';

interface NetworkStatus {
  online: boolean;
  bannerMessage: string | null;
  offline: boolean;
}

/**
 * Network status monitoring hook.
 *
 * Automatically:
 * - Detects online/offline changes via navigator events
 * - Reports network errors to the error context
 * - Triggers offline queue replay on reconnect
 * - Manages banner messages
 *
 * Banner states:
 * - null → connected
 * - 'Connection lost — reconnecting...' → just went offline
 * - 'Working offline — queued locally' → been offline for 10s
 * - 'Reconnecting...' → just came back online
 */
export function useNetworkStatus(): NetworkStatus {
  const { report } = useErrors();
  const offlineRef = useRef(false);
  const offlineTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerRef = useRef<string | null>(null);

  // ── Online/Offline Detection ───────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      // Short delay before showing "Reconnecting" to avoid flicker
      setTimeout(() => {
        if (!offlineRef.current) return;

        offlineRef.current = false;
        bannerRef.current = 'Reconnecting...';

        // Report reconnection
        report(
          new HAError(ErrorCode.NETWORK_RECONNECTED, ErrorSeverity.P3, 'Reconnected', { showToast: false }),
        );

        // Trigger offline queue replay
        onReconnect();

        // Clear banner after 2s
        setTimeout(() => {
          bannerRef.current = null;
        }, 2000);
      }, 1000);
    };

    const handleOffline = () => {
      offlineRef.current = true;

      // Immediate banner
      bannerRef.current = 'Connection lost — reconnecting...';

      // Report network error
      const offlineError = onDisconnect();
      report(offlineError);

      // After 10s, change to "Working offline"
      offlineTimeoutRef.current = setTimeout(() => {
        if (offlineRef.current) {
          bannerRef.current = 'Working offline — queued locally';
        }
      }, 10000);
    };

    window.addEventListener('online', handleOnline, false);
    window.addEventListener('offline', handleOffline, false);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (offlineTimeoutRef.current) {
        clearTimeout(offlineTimeoutRef.current);
      }
    };
  }, [report]);

  // ── Manual Control (for testing) ───────────────────────────────────────

  /**
   * Force offline state (for testing or manual network disable).
   * exported via a separate hook: useNetworkControl()
   */

  // ── Return ───────────────────────────────────────────────────────────────

  return {
    online: !offlineRef.current,
    offline: offlineRef.current,
    bannerMessage: bannerRef.current,
  };
}
