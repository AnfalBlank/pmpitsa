'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bell, Ticket, CalendarPlus, FileCheck2, BadgeCheck, PencilLine, UserCheck, X, BellRing, CheckCheck } from 'lucide-react';
import type { AppNotification } from '@/lib/api-client';

const ICON: Record<string, { icon: React.ElementType; cls: string }> = {
  'ticket.new': { icon: Ticket, cls: 'bg-red-100 text-red-700' },
  'ticket.update': { icon: Ticket, cls: 'bg-blue-100 text-blue-700' },
  'ticket.assigned': { icon: UserCheck, cls: 'bg-amber-100 text-amber-800' },
  'plan.new': { icon: CalendarPlus, cls: 'bg-indigo-100 text-indigo-700' },
  'ba.final': { icon: FileCheck2, cls: 'bg-amber-100 text-amber-800' },
  'ba.approved': { icon: BadgeCheck, cls: 'bg-emerald-100 text-emerald-700' },
  'ba.revised': { icon: PencilLine, cls: 'bg-slate-200 text-slate-700' },
};

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} hari lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

const Item: React.FC<{ n: AppNotification; onClick: () => void }> = ({ n, onClick }) => {
  const meta = ICON[n.type] || { icon: Bell, cls: 'bg-slate-100 text-slate-700' };
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none border-b border-slate-100 ${n.read ? '' : 'bg-blue-50/50'}`}
    >
      <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${meta.cls}`}>
        <Icon className="w-4 h-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm leading-snug ${n.read ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>{n.title}</span>
        <span className="block text-xs text-slate-600 mt-0.5 break-words">{n.message}</span>
        <span className="block text-[11px] text-slate-400 mt-1">{timeAgo(n.created_at)}</span>
      </span>
      {!n.read && <span className="w-2.5 h-2.5 rounded-full bg-red-600 mt-1.5 flex-shrink-0" aria-label="Belum dibaca" />}
    </button>
  );
};

export const NotificationBell: React.FC<{
  items: AppNotification[];
  unread: number;
  permission: NotificationPermission | 'unsupported';
  onOpen: (n: AppNotification) => void;
  onMarkAll: () => void;
  onRequestPermission: () => void;
}> = ({ items, unread, permission, onOpen, onMarkAll, onRequestPermission }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi'}
        className={`relative min-h-[40px] min-w-[40px] rounded-lg border flex items-center justify-center transition-colors ${
          open ? 'bg-slate-100 border-slate-300' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
        }`}
      >
        <Bell className={`w-[18px] h-[18px] text-slate-700 ${unread ? 'pm-bell-ring' : ''}`} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 sm:hidden" aria-hidden="true" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Notifikasi"
            className="fixed sm:absolute z-50 left-3 right-3 top-[72px] sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[75vh]"
          >
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-200">
              <div>
                <h2 className="text-sm font-extrabold text-[#0B2545]">Notifikasi</h2>
                <p className="text-[11px] text-slate-500">{unread ? `${unread} belum dibaca` : 'Semua sudah dibaca'}</p>
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button type="button" onClick={onMarkAll} className="min-h-[36px] px-2.5 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-50 flex items-center gap-1">
                    <CheckCheck className="w-4 h-4" /> Tandai dibaca
                  </button>
                )}
                <button type="button" onClick={() => setOpen(false)} aria-label="Tutup notifikasi" className="min-h-[36px] min-w-[36px] rounded-lg hover:bg-slate-100 flex items-center justify-center sm:hidden">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {permission === 'default' && (
              <button
                type="button"
                onClick={onRequestPermission}
                className="mx-3 mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-left text-xs text-blue-900 flex items-center gap-2 hover:bg-blue-100"
              >
                <BellRing className="w-4 h-4 flex-shrink-0" />
                <span>
                  <strong>Aktifkan notifikasi perangkat</strong> agar pemberitahuan tetap muncul saat aplikasi tidak dibuka.
                </span>
              </button>
            )}

            <div className="overflow-y-auto mt-1">
              {items.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700 mt-2">Belum ada notifikasi</p>
                  <p className="text-xs text-slate-500 mt-1">Tugas, tiket dan persetujuan BA untuk Anda akan muncul di sini.</p>
                </div>
              ) : (
                items.map((n) => (
                  <Item
                    key={n.id}
                    n={n}
                    onClick={() => {
                      setOpen(false);
                      onOpen(n);
                    }}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/** Pop-up for notifications that arrive while the app is open */
export const NotificationToasts: React.FC<{
  toasts: AppNotification[];
  onOpen: (n: AppNotification) => void;
  onDismiss: (id: string) => void;
}> = ({ toasts, onOpen, onDismiss }) => {
  if (!toasts.length) return null;
  return (
    <div className="fixed z-[65] top-[72px] right-3 left-3 sm:left-auto sm:w-96 space-y-2" aria-live="polite">
      {toasts.map((n) => {
        const meta = ICON[n.type] || { icon: Bell, cls: 'bg-slate-100 text-slate-700' };
        const Icon = meta.icon;
        return (
          <div key={n.id} className="pm-fade-in bg-white rounded-xl shadow-2xl border border-slate-200 flex items-start gap-3 p-3">
            <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${meta.cls}`}>
              <Icon className="w-4 h-4" />
            </span>
            <button type="button" onClick={() => onOpen(n)} className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-bold text-slate-900">{n.title}</span>
              <span className="block text-xs text-slate-600 mt-0.5 break-words">{n.message}</span>
            </button>
            <button type="button" onClick={() => onDismiss(n.id)} aria-label="Tutup" className="min-h-[32px] min-w-[32px] rounded-lg hover:bg-slate-100 flex items-center justify-center flex-shrink-0">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
