'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppNotification, fetchNotificationsApi, markNotificationsReadApi } from '@/lib/api-client';

const POLL_MS = 15_000;

/**
 * Near-real-time notifications for the logged-in user: polls every 15 s while
 * the app is visible (and right away when it comes back), raises a toast and a
 * device notification for anything new.
 */
export function useNotifications(userId: string | undefined, onNew?: (fresh: AppNotification[]) => void) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const known = useRef<Set<string> | null>(null);
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  useEffect(() => {
    setPermission(typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported');
  }, []);

  const load = useCallback(async () => {
    if (!userId || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    const res = await fetchNotificationsApi();
    if (!res) return;
    setItems(res.notifications);
    setUnread(res.unread);
    const ids = new Set(res.notifications.map((n) => n.id));
    if (known.current) {
      const fresh = res.notifications.filter((n) => !known.current!.has(n.id) && !n.read);
      if (fresh.length) {
        setToasts((t) => [...fresh.slice(0, 3), ...t].slice(0, 3));
        fresh.slice(0, 3).forEach((n) => {
          setTimeout(() => setToasts((t) => t.filter((x) => x.id !== n.id)), 7000);
        });
        // Device / browser notification (shown by the OS, also when the tab is in the background)
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          fresh.slice(0, 3).forEach((n) => {
            try {
              new Notification(n.title, { body: n.message, icon: '/icon.png', tag: n.id });
            } catch {}
          });
        }
        onNewRef.current?.(fresh);
      }
    }
    known.current = ids; // first load only fills the baseline (no toast flood after login)
  }, [userId]);

  useEffect(() => {
    known.current = null;
    setItems([]);
    setUnread(0);
    if (!userId) return;
    load();
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', load);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', load);
    };
  }, [userId, load]);

  const markRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setItems((list) => list.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    setUnread((u) => Math.max(0, u - ids.length));
    await markNotificationsReadApi({ ids });
  }, []);

  const markAll = useCallback(async () => {
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await markNotificationsReadApi({ all: true });
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    const p = await Notification.requestPermission();
    setPermission(p);
  }, []);

  const dismissToast = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  return { items, unread, toasts, permission, markRead, markAll, requestPermission, dismissToast, reload: load };
}
