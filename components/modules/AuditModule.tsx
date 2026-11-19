'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Download, RotateCcw, ShieldCheck } from 'lucide-react';
import type { Site } from '@/lib/types';
import { AuditItem, fetchAuditApi } from '@/lib/api-client';
import { ACTION_META, AuditRow, ENTITY_LABEL } from '@/components/audit/AuditTimeline';
import { LoadingBlock, Spinner } from '@/components/ui/Loading';

const PAGE = 50;

interface Props {
  sites: Site[];
  usersList: any[];
}

const inputCls =
  'w-full min-h-[44px] px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none';

/** Admin: complete audit trail of every action in the portal. */
export const AuditModule: React.FC<Props> = ({ sites, usersList }) => {
  const [q, setQ] = useState('');
  const [user, setUser] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [site, setSite] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [items, setItems] = useState<AuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<'loading' | 'idle' | 'error' | 'more'>('loading');

  const params = useMemo(
    () => ({ q: q.trim(), user, action, entity_type: entity, site_id: site, from, to }),
    [q, user, action, entity, site, from, to]
  );

  const load = useCallback(
    async (offset = 0) => {
      setState(offset ? 'more' : 'loading');
      const res = await fetchAuditApi({ ...params, limit: PAGE, offset });
      if (!res) {
        setState('error');
        return;
      }
      setItems((prev) => (offset ? [...prev, ...res.items] : res.items));
      setTotal(res.total);
      setState('idle');
    },
    [params]
  );

  // Debounced reload when filters change
  useEffect(() => {
    const t = setTimeout(() => load(0), 350);
    return () => clearTimeout(t);
  }, [load]);

  const reset = () => {
    setQ('');
    setUser('');
    setAction('');
    setEntity('');
    setSite('');
    setFrom('');
    setTo('');
  };
  const filtered = !!(q || user || action || entity || site || from || to);
  const csvHref = `/api/audit?${new URLSearchParams(Object.entries({ ...params, format: 'csv' }).filter(([, v]) => v) as [string, string][]).toString()}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          Catatan permanen setiap aktivitas: siapa, kapan, dari mana dan apa yang berubah. Log tidak dapat diubah atau dihapus dari aplikasi.
        </p>
        <a
          href={csvHref}
          className="min-h-[44px] px-4 rounded-lg bg-[#0B2545] hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Download className="w-4 h-4" /> Export CSV
        </a>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nomor BA, tiket, SPBU, nama pengguna, keterangan..."
            aria-label="Cari audit log"
            className={`${inputCls} pl-9`}
          />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <select aria-label="Pengguna" value={user} onChange={(e) => setUser(e.target.value)} className={inputCls}>
            <option value="">Semua pengguna</option>
            {usersList.map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select aria-label="Aksi" value={action} onChange={(e) => setAction(e.target.value)} className={inputCls}>
            <option value="">Semua aksi</option>
            {Object.entries(ACTION_META).map(([k, m]) => (
              <option key={k} value={k}>
                {m.label}
              </option>
            ))}
          </select>
          <select aria-label="Objek" value={entity} onChange={(e) => setEntity(e.target.value)} className={inputCls}>
            <option value="">Semua objek</option>
            {Object.entries(ENTITY_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <select aria-label="SPBU" value={site} onChange={(e) => setSite(e.target.value)} className={inputCls}>
            <option value="">Semua SPBU</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.site_code}
              </option>
            ))}
          </select>
          <label className="text-[11px] font-semibold text-slate-600">
            Dari tanggal
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${inputCls} mt-1`} />
          </label>
          <label className="text-[11px] font-semibold text-slate-600">
            Sampai tanggal
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${inputCls} mt-1`} />
          </label>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
          <span>{state === 'loading' ? 'Memuat...' : `${total.toLocaleString('id-ID')} aktivitas`}</span>
          {filtered && (
            <button type="button" onClick={reset} className="min-h-[36px] px-3 rounded-lg border border-slate-300 hover:bg-slate-50 font-semibold text-slate-700 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Reset filter
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs">
        {state === 'loading' ? (
          <LoadingBlock title="Memuat audit log..." />
        ) : state === 'error' ? (
          <div className="p-8 text-center text-sm text-red-600">
            Audit log belum dapat dimuat.{' '}
            <button type="button" onClick={() => load(0)} className="font-bold underline">
              Coba lagi
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">Tidak ada aktivitas yang cocok.</p>
        ) : (
          <>
            <ul className="px-3 sm:px-4">
              {items.map((i) => (
                <AuditRow key={i.id} item={i} showEntity showNetwork />
              ))}
            </ul>
            {items.length < total && (
              <div className="p-3 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => load(items.length)}
                  disabled={state === 'more'}
                  className="min-h-[44px] px-5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-800 inline-flex items-center gap-2 disabled:opacity-60"
                >
                  {state === 'more' && <Spinner size={16} />} Tampilkan lebih banyak ({total - items.length} lagi)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
