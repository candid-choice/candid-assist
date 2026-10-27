/** Human Assist — Network Banner.

Displays when network connection status changes:
- "Connection lost — reconnecting..." (immediate)
- "Working offline — queued locally" (after 10s offline)
- "Reconnecting..." (when coming back)

Auto-dismisses when connection is restored.

Usage:
  <NetworkBanner />
*/

import { useNetworkStatus } from '../errors/use-network-status';
import './network-banner.css';

function NetworkBanner() {
  const { bannerMessage, online } = useNetworkStatus();

  if (!bannerMessage || online) return null;

  return (
    <div className="ha-network-banner">
      <span className="ha-network-banner-icon">
        {bannerMessage.includes('offline') ? (
          // Offline icon
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M16 16l-8-8" />
          </svg>
        ) : (
          // Sync icon
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 2v6h-6M3 12a9 9 0 1 1 15.36 5.36" />
            <path d="M3 22v-6h6" />
          </svg>
        )}
      </span>
      <span className="ha-network-banner-text">{bannerMessage}</span>
    </div>
  );
}

export { NetworkBanner };
