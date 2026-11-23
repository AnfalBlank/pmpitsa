'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { Spinner } from '@/components/ui/Loading';

export type FeedbackVariant = 'success' | 'error' | 'warning' | 'info' | 'forbidden';

export interface NotifyOptions {
  variant: FeedbackVariant;
  title: string;
  message?: React.ReactNode;
  /** Extra technical detail (e.g. server error) shown in small text */
  detail?: string;
  okLabel?: string;
}

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface RunOptions<T> {
  /** Text shown in the blocking progress dialog while the action runs */
  pending: string;
  success: { title: string; message?: React.ReactNode } | ((result: T) => { title: string; message?: React.ReactNode });
  error: { title: string; message?: React.ReactNode } | ((result: any) => { title: string; message?: React.ReactNode; hideDetail?: boolean });
}

interface FeedbackApi {
  notify: (opts: NotifyOptions) => Promise<void>;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  /**
   * Runs an API action that resolves to `{ success, message }`, shows a progress
   * dialog, then a success or error modal. Resolves to the action result.
   */
  run: <T extends { success: boolean; message?: string; code?: string }>(
    action: () => Promise<T>,
    opts: RunOptions<T>
  ) => Promise<T>;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside <FeedbackProvider>');
  return ctx;
}

type DialogState =
  | { kind: 'notify'; opts: NotifyOptions; resolve: () => void }
  | { kind: 'confirm'; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: 'pending'; text: string };

const VARIANT_STYLE: Record<FeedbackVariant, { icon: React.ElementType; ring: string; iconColor: string; button: string }> = {
  success: { icon: CheckCircle2, ring: 'bg-emerald-50 border-emerald-200', iconColor: 'text-emerald-600', button: 'bg-emerald-600 hover:bg-emerald-700' },
  error: { icon: XCircle, ring: 'bg-red-50 border-red-200', iconColor: 'text-red-600', button: 'bg-red-600 hover:bg-red-700' },
  warning: { icon: AlertTriangle, ring: 'bg-amber-50 border-amber-200', iconColor: 'text-amber-600', button: 'bg-[#0B2545] hover:bg-slate-800' },
  info: { icon: Info, ring: 'bg-blue-50 border-blue-200', iconColor: 'text-blue-600', button: 'bg-[#0B2545] hover:bg-slate-800' },
  forbidden: { icon: ShieldAlert, ring: 'bg-red-50 border-red-200', iconColor: 'text-red-600', button: 'bg-[#0B2545] hover:bg-slate-800' },
};

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<DialogState[]>([]);
  const current = queue[0];

  const push = useCallback((d: DialogState) => setQueue((q) => [...q, d]), []);
  const shift = useCallback(() => setQueue((q) => q.slice(1)), []);

  const notify = useCallback(
    (opts: NotifyOptions) => new Promise<void>((resolve) => push({ kind: 'notify', opts, resolve })),
    [push]
  );

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => push({ kind: 'confirm', opts, resolve })),
    [push]
  );

  const run = useCallback<FeedbackApi['run']>(
    async (action, opts) => {
      const pendingItem: DialogState = { kind: 'pending', text: opts.pending };
      setQueue((q) => [pendingItem, ...q]);
      let result: any;
      try {
        result = await action();
      } catch (err: any) {
        result = { success: false, message: err?.message || 'Terjadi kesalahan tak terduga.' };
      }
      setQueue((q) => q.filter((d) => d !== pendingItem));
      if (result?.success) {
        const s = typeof opts.success === 'function' ? opts.success(result) : opts.success;
        await notify({ variant: 'success', title: s.title, message: s.message });
      } else if (result?.code === 'FORBIDDEN') {
        await notify({ variant: 'forbidden', title: 'Akses Ditolak', message: result.message });
      } else if (result?.code === 'UNAUTHENTICATED') {
        // Session-expired dialog is raised globally by page.tsx
      } else {
        const e = typeof opts.error === 'function' ? opts.error(result) : opts.error;
        await notify({
          variant: 'error',
          title: e.title,
          message: e.message,
          detail: 'hideDetail' in e && e.hideDetail ? undefined : result?.message,
        });
      }
      return result;
    },
    [notify]
  );

  return (
    <FeedbackContext.Provider value={{ notify, confirm, run }}>
      {children}
      {current && <FeedbackDialog state={current} onDone={shift} />}
    </FeedbackContext.Provider>
  );
};

const FeedbackDialog: React.FC<{ state: DialogState; onDone: () => void }> = ({ state, onDone }) => {
  const primaryRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    primaryRef.current?.focus();
  }, [state]);

  const close = (value?: boolean) => {
    if (state.kind === 'notify') state.resolve();
    if (state.kind === 'confirm') state.resolve(!!value);
    onDone();
  };

  useEffect(() => {
    if (state.kind === 'pending') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (state.kind === 'pending') {
    return (
      <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-xs flex items-center justify-center p-6" role="alertdialog" aria-modal="true" aria-busy="true" aria-label={state.text}>
        <div className="bg-white rounded-2xl shadow-2xl px-6 py-5 flex items-center gap-3 max-w-xs w-full">
          <Spinner size={28} label={state.text} />
          <span className="text-sm font-semibold text-slate-800">{state.text}</span>
        </div>
      </div>
    );
  }

  const isConfirm = state.kind === 'confirm';
  const variant: FeedbackVariant = isConfirm ? (state.opts.danger ? 'warning' : 'info') : state.opts.variant;
  const style = VARIANT_STYLE[variant];
  const Icon = style.icon;
  const titleId = 'feedback-title';

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4"
      role={isConfirm ? 'alertdialog' : 'dialog'}
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) close(false);
      }}
    >
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-50 pb-safe-2 sm:pb-0">
        <div className="px-5 pt-6 pb-4 text-center">
          <div className={`w-14 h-14 mx-auto rounded-full border flex items-center justify-center ${style.ring}`}>
            <Icon className={`w-7 h-7 ${style.iconColor}`} />
          </div>
          <h2 id={titleId} className="mt-3 text-base font-bold text-[#0B2545]">
            {state.opts.title}
          </h2>
          {state.opts.message && <div className="mt-1.5 text-sm text-slate-600 leading-relaxed">{state.opts.message}</div>}
          {!isConfirm && state.opts.detail && (
            <p className="mt-2 text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-1 break-words">
              {state.opts.detail}
            </p>
          )}
        </div>
        <div className={`px-5 pb-5 grid gap-2 ${isConfirm ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {isConfirm && (
            <button
              type="button"
              onClick={() => close(false)}
              className="min-h-[48px] rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold"
            >
              {state.opts.cancelLabel || 'Batal'}
            </button>
          )}
          <button
            ref={primaryRef}
            type="button"
            onClick={() => close(true)}
            className={`min-h-[48px] rounded-xl text-white text-sm font-bold ${
              isConfirm ? (state.opts.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0B2545] hover:bg-slate-800') : style.button
            }`}
          >
            {isConfirm ? state.opts.confirmLabel || 'Ya, Lanjutkan' : state.opts.okLabel || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
};
