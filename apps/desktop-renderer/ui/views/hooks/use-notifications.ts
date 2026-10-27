/** Human Assist — macOS Notifications.

Native macOS notifications using Web Notifications API with fallback.
Handles:
- Permission requests (always grant for desktop apps)
- Notification display with sound, icon, and actions
- Toast integration (error, success, info, warning)
- Surface notifications (pending, active, responding, complete)

Usage:
  const notifications = useNotifications()
  
  notifications.show('New Surface', 'Browser surface ready', {
    type: 'info',
    icon: '/icon.png',
    click: () => navigate('/surface/browser-123'),
  })
*/

import { useState, useCallback, useEffect } from 'react';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationOptions {
  type?: NotificationType;
  icon?: string;
  silent?: boolean;
  duration?: number;
  click?: () => void;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  timestamp: number;
  dismissed?: boolean;
}

export interface NotificationState {
  permission: 'default' | 'granted' | 'denied';
  toasts: Notification[];
  history: Notification[];
}

export function useNotifications() {
  const [state, setState] = useState<NotificationState>({
    permission: 'default',
    toasts: [],
    history: [],
  });

  // Request permission on mount
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      permission: Notification.permission,
    }));
  }, []);

  const requestPermission = useCallback(() => {
    if (typeof Notification === 'undefined') return;

    Notification.requestPermission().then((permission) => {
      setState((prev) => ({
        ...prev,
        permission,
      }));
    });
  }, []);

  const show = useCallback(
    (title: string, body: string, options?: NotificationOptions) => {
      const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const type = options?.type ?? 'info';
      const silent = options?.silent ?? false;

      // Add to current toasts
      setState((prev) => ({
        ...prev,
        toasts: [...prev.toasts.slice(-5), { id, title, body, type, timestamp: Date.now() }],
      }));

      // Show native notification if permission granted
      if (options?.click || typeof Notification !== 'undefined') {
        const notif = new Notification(title, {
          body,
          icon: options?.icon,
          silent,
          tag: id,
        });

        // Auto-dismiss after duration
        setTimeout(() => {
          notif.close();
          setState((prev) => ({
            ...prev,
            toasts: prev.toasts.filter((t) => t.id !== id),
            history: [...prev.history, { id, title, body, type, timestamp: Date.now() }],
          }));
        }, options?.duration ?? 5000);
      }

      return id;
    },
    [],
  );

  const showSurfaceNotification = useCallback(
    (type: string, status: string, details?: string) => {
      const messages: Record<string, Record<string, string>> = {
        browser: {
          pending: 'Opening browser surface...',
          active: 'Browser surface ready',
          responding: 'Browser responding...',
          complete: 'Browser surface closed',
        },
        canvas: {
          pending: 'Generating canvas...',
          active: 'Canvas ready',
          responding: 'Updating canvas...',
          complete: 'Canvas exported',
        },
        image: {
          pending: 'Loading image...',
          active: 'Image ready',
          responding: 'Processing image...',
          complete: 'Image saved',
        },
        screen: {
          pending: 'Capturing screen...',
          active: 'Screenshot ready',
          responding: 'Processing...',
          complete: 'Screenshot saved',
        },
        'code-diff': {
          pending: 'Generating diff...',
          active: 'Code diff ready',
          responding: 'Updating diff...',
          complete: 'Diff saved',
        },
        terminal: {
          pending: 'Opening terminal...',
          active: 'Terminal ready',
          responding: 'Capturing output...',
          complete: 'Terminal closed',
        },
      };

      const message = messages[type]?.[status] || `${type}: ${status}`;
      show(message, details ?? '', { type: 'info' });
    },
    [show],
  );

  const dismissAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      toasts: [],
    }));
  }, []);

  const dismiss = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      toasts: prev.toasts.filter((t) => t.id !== id),
    }));
  }, []);

  const clearHistory = useCallback(() => {
    setState((prev) => ({
      ...prev,
      history: [],
    }));
  }, []);

  return {
    ...state,
    show,
    showSurfaceNotification,
    requestPermission,
    dismissAll,
    dismiss,
    clearHistory,
  };
}
