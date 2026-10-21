/** Human Assist — Error module.

Exported as a single import:
  import { useErrors, ErrorProvider, useNetworkStatus } from '../errors';
*/

export {
  ErrorProvider,
  useErrors,
} from './error-context';

export {
  useNetworkStatus,
} from './use-network-status';

export {
  NetworkBanner,
} from './network-banner';

export {
  ErrorBoundary,
} from './error-boundary';

export {
  Errors,
  ErrorCode,
  ErrorSeverity,
  HAError,
  shouldToast,
  isBlocking,
  defaultSeverity,
} from './error-hierarchy';

export {
  queueAction,
  replayQueue,
  flushQueue,
  onReconnect,
  getQueueSize,
  clearQueue,
  getPendingActions,
  isIndexedDBAvailable,
  type QueuedAction,
} from './offline-queue';
