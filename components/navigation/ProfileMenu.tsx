'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LogOut, ChevronDown, Building2, BadgeCheck, Phone, IdCard, Check, X } from 'lucide-react';
import { Site, UserSession } from '@/lib/types';
import { can, ROLE_LABEL } from '@/lib/rbac';

interface ProfileMenuProps {
  currentUser: UserSession;
  assignedSite?: Site;
  onLogout: () => void;
  /** compact = avatar only (mobile), otherwise avatar + name pill (desktop) */
  compact?: boolean;
}

const ACCESS_ITEMS: { label: string; check: (role: UserSession['role']) => boolean }[] = [
  { label: 'Melaksanakan PM / Pengecekan / Perbaikan', check: (r) => can(r, 'pm.perform') },
  { label: 'Membuat tiket kendala', check: (r) => can(r, 'ticket.create') },
  { label: 'Memperbarui status tiket', check: (r) => can(r, 'ticket.update') },
  { label: 'Mengelola jadwal PM', check: (r) => can(r, 'plan.create') },
  { label: 'Master data & manajemen user', check: (r) => can(r, 'user.manage') },
];

/**
 * Profile button + popover. Replaces the old behaviour where tapping the
 * user chip opened the login form.
 */
export const ProfileMenu: React.FC<ProfileMenuProps> = ({ currentUser, assignedSite, onLogout, compact }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
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

  const isScoped = !can(currentUser.role, 'data.allSites');

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Profil ${currentUser.name}`}
        className={`min-h-[40px] flex items-center gap-2 rounded-lg border transition-colors ${
          open ? 'bg-slate-100 border-slate-300' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
        } ${compact ? 'px-1.5' : 'pl-1.5 pr-2.5'}`}
      >
        <span className="w-7 h-7 rounded-full bg-[#0B2545] text-white font-black text-xs flex items-center justify-center flex-shrink-0">
          {currentUser.name.charAt(0)}
        </span>
        {!compact && (
          <span className="flex flex-col items-start leading-tight text-left">
            <span className="text-xs font-bold text-slate-900 max-w-[160px] truncate" title={currentUser.name}>{currentUser.name}</span>
            <span className="text-[10px] font-semibold text-slate-500">{ROLE_LABEL[currentUser.role]}</span>
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 z-40 bg-black/40 sm:hidden" aria-hidden="true" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Profil pengguna"
            className="fixed sm:absolute z-50 left-3 right-3 top-[72px] sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="bg-[#0B2545] text-white px-4 py-4 flex items-start gap-3">
              <span className="w-11 h-11 rounded-full bg-white text-[#0B2545] font-black text-base flex items-center justify-center flex-shrink-0">
                {currentUser.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm truncate">{currentUser.name}</div>
                <div className="text-[11px] text-slate-300 truncate">{currentUser.roleTitle}</div>
                <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold bg-red-600 px-2 py-0.5 rounded">
                  <BadgeCheck className="w-3 h-3" />
                  {ROLE_LABEL[currentUser.role]}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup profil"
                className="min-h-[36px] min-w-[36px] -mr-1 -mt-1 flex items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 sm:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-3 space-y-2 text-xs text-slate-700 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <IdCard className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="font-mono">{currentUser.employeeId}</span>
              </div>
              {currentUser.phone && currentUser.phone !== '-' && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>{currentUser.phone}</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <span>
                  {isScoped ? (
                    <>
                      SPBU ditugaskan: <strong>{assignedSite ? `${assignedSite.site_code} · ${assignedSite.site_name}` : `Site #${currentUser.assignedSiteId}`}</strong>
                    </>
                  ) : (
                    'Akses data seluruh SPBU'
                  )}
                </span>
              </div>
            </div>

            <div className="px-4 py-3 border-b border-slate-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Hak Akses</div>
              <ul className="space-y-1">
                {ACCESS_ITEMS.map((item) => {
                  const ok = item.check(currentUser.role);
                  return (
                    <li key={item.label} className={`flex items-center gap-2 text-xs ${ok ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                      {ok ? <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" /> : <X className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />}
                      <span>{item.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="p-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className="w-full min-h-[48px] px-3 rounded-xl flex items-center gap-2.5 text-sm font-bold text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                Keluar dari Akun
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
