'use client';

import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';

/** Small animated ring spinner (Pertamina colours). */
export const Spinner: React.FC<{ size?: number; className?: string; label?: string }> = ({ size = 28, className = '', label = 'Memuat' }) => (
  <span role="status" aria-label={label} className={`pm-spinner inline-block flex-shrink-0 ${className}`} style={{ width: size, height: size }} />
);

/** Centered block used while a page section is loading. */
export const LoadingBlock: React.FC<{ title?: string; message?: string; className?: string }> = ({
  title = 'Memuat data...',
  message,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center text-center py-14 px-6 ${className}`} aria-live="polite" aria-busy="true">
    <div className="relative w-16 h-16 mb-4">
      <span className="pm-spinner absolute inset-0" style={{ width: 64, height: 64 }} />
      <span className="absolute inset-[10px] rounded-full bg-white shadow-inner flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-pertamina-timor.png" alt="" className="w-7 h-7 object-contain pm-breathe" />
      </span>
    </div>
    <p className="text-sm font-bold text-[#0B2545]">{title}</p>
    {message && <p className="text-xs text-slate-500 mt-1 max-w-xs">{message}</p>}
    <span className="pm-dots mt-3" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  </div>
);

export type LoadStepState = 'pending' | 'done' | 'error';

/** Full-screen loader shown until the first sync after login has finished. */
export const LoadingScreen: React.FC<{
  title?: string;
  subtitle?: string;
  steps?: { key: string; label: string; state: LoadStepState }[];
}> = ({ title = 'Menyiapkan Portal PM', subtitle = 'Pertamina International Timor, S.A.', steps = [] }) => {
  const done = steps.filter((s) => s.state !== 'pending').length;
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0;
  return (
    <div className="min-h-screen pm-loading-bg flex flex-col items-center justify-center p-6 text-white" aria-busy="true" aria-live="polite">
      <div className="relative w-28 h-28 mb-6">
        <span className="pm-ring absolute inset-0 rounded-full" />
        <span className="pm-ring pm-ring--slow absolute inset-[-10px] rounded-full opacity-40" />
        <span className="absolute inset-[12px] rounded-full bg-white shadow-2xl flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-pertamina-timor.png" alt="Pertamina International Timor" className="w-14 h-14 object-contain pm-breathe" />
        </span>
      </div>

      <h1 className="text-lg font-extrabold tracking-tight">{title}</h1>
      <p className="text-xs text-slate-300 mt-0.5">{subtitle}</p>

      {steps.length > 0 && (
        <div className="mt-6 w-full max-w-xs">
          <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
            <div className="h-full rounded-full pm-progress transition-all duration-500 ease-out" style={{ width: `${Math.max(6, pct)}%` }} />
          </div>
          <ul className="mt-4 space-y-2">
            {steps.map((s) => (
              <li key={s.key} className="flex items-center gap-2.5 text-xs">
                <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {s.state === 'pending' && <Spinner size={16} label={`Memuat ${s.label}`} />}
                  {s.state === 'done' && (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center pm-pop">
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    </span>
                  )}
                  {s.state === 'error' && (
                    <span className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center pm-pop">
                      <AlertTriangle className="w-3 h-3 text-white" />
                    </span>
                  )}
                </span>
                <span className={s.state === 'pending' ? 'text-slate-200' : 'text-white font-semibold'}>
                  {s.label}
                  {s.state === 'error' && <span className="text-amber-300 font-normal"> · memakai data tersimpan</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
