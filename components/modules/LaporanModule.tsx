'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, FileDown, ShieldCheck, Wrench, Activity, ChevronRight, Fuel } from 'lucide-react';
import type { Site } from '@/lib/types';
import type { LaporanRow, LaporanSiteRow, LaporanSummary, LaporanType } from '@/lib/laporan';
import { apiFetch } from '@/lib/api-client';
import { LoadingBlock } from '@/components/ui/Loading';

const TABS: { key: LaporanType; label: string; short: string; icon: React.ElementType }[] = [
  { key: 'PM', label: 'Preventive (PM)', short: 'PM', icon: ShieldCheck },
  { key: 'PMT', label: 'PM Teknik', short: 'PM Teknik', icon: Fuel },
  { key: 'CM', label: 'Corrective (CM)', short: 'CM', icon: Wrench },
  { key: 'QC', label: 'Pengecekan', short: 'Pengecekan', icon: Activity },
];

type Preset = 'this_month' | 'last_month' | 'last_3' | 'this_year' | 'all' | 'custom';

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function presetRange(p: Preset): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (p === 'this_month') return { from: ymd(new Date(y, m, 1)), to: ymd(new Date(y, m + 1, 0)) };
  if (p === 'last_month') return { from: ymd(new Date(y, m - 1, 1)), to: ymd(new Date(y, m, 0)) };
  if (p === 'last_3') return { from: ymd(new Date(y, m - 2, 1)), to: ymd(new Date(y, m + 1, 0)) };
  if (p === 'this_year') return { from: `${y}-01-01`, to: `${y}-12-31` };
  return { from: '', to: '' };
}

const inputCls =
  'w-full min-h-[44px] px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none';

const statusCls = (s: string) =>
  s === 'Selesai (Normal)' ? 'bg-emerald-100 text-emerald-900' : s === 'Perlu Tindak Lanjut' ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-900';

interface Data {
  periodLabel: string;
  siteLabel: string;
  summary: LaporanSummary;
  bySite: LaporanSiteRow[];
  rows: LaporanRow[];
}

/** Admin: PM / CM / Pengecekan reports with period & SPBU filters, Excel and PDF export. */
export const LaporanModule: React.FC<{ sites: Site[]; onOpenReport: (id: string) => void }> = ({ sites, onOpenReport }) => {
  const [type, setType] = useState<LaporanType>('PM');
  const [preset, setPreset] = useState<Preset>('this_month');
  const [custom, setCustom] = useState(() => presetRange('this_month'));
  const [siteId, setSiteId] = useState('');
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<'loading' | 'idle' | 'error'>('loading');

  const range = preset === 'custom' ? custom : presetRange(preset);
  const query = useMemo(() => {
    const q = new URLSearchParams({ type });
    if (range.from) q.set('from', range.from);
    if (range.to) q.set('to', range.to);
    if (siteId) q.set('site_id', siteId);
    return q.toString();
  }, [type, range.from, range.to, siteId]);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    apiFetch(`/api/laporan?${query}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.success) {
          setData(j);
          setState('idle');
        } else setState('error');
      })
      .catch(() => !cancelled && setState('error'));
    return () => {
      cancelled = true;
    };
  }, [query]);

  const s = data?.summary;

  return (
    <div className="space-y-5">
      {/* Report type */}
      <div role="tablist" aria-label="Jenis laporan" className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-white border border-slate-200 rounded-xl p-1.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = type === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setType(t.key)}
              className={`min-h-[44px] rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${
                active ? 'bg-[#0B2545] text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="sm:hidden">{t.short}</span>
              <span className="hidden sm:inline truncate">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters + export */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-[11px] font-semibold text-slate-600">
            Periode
            <select value={preset} onChange={(e) => setPreset(e.target.value as Preset)} className={`${inputCls} mt-1`}>
              <option value="this_month">Bulan ini</option>
              <option value="last_month">Bulan lalu</option>
              <option value="last_3">3 bulan terakhir</option>
              <option value="this_year">Tahun ini</option>
              <option value="all">Semua waktu</option>
              <option value="custom">Pilih tanggal…</option>
            </select>
          </label>
          <label className="text-[11px] font-semibold text-slate-600">
            SPBU
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className={`${inputCls} mt-1`}>
              <option value="">Semua SPBU</option>
              {sites.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.site_code} · {x.site_name}
                </option>
              ))}
            </select>
          </label>
          {preset === 'custom' && (
            <>
              <label className="text-[11px] font-semibold text-slate-600">
                Dari tanggal
                <input type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className={`${inputCls} mt-1`} />
              </label>
              <label className="text-[11px] font-semibold text-slate-600">
                Sampai tanggal
                <input type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className={`${inputCls} mt-1`} />
              </label>
            </>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <span className="text-xs text-slate-500">{data ? `${data.periodLabel} · ${data.siteLabel}` : ' '}</span>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <a
              href={`/api/laporan?${query}&format=csv`}
              className="min-h-[44px] px-4 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Excel
            </a>
            <a
              href={`/api/laporan?${query}&format=pdf`}
              className="min-h-[44px] px-4 rounded-lg bg-[#0B2545] hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2"
            >
              <FileDown className="w-4 h-4" /> Unduh PDF
            </a>
          </div>
        </div>
      </div>

      {state === 'loading' ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <LoadingBlock title="Menyusun laporan..." />
        </div>
      ) : state === 'error' || !data || !s ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-red-600">Laporan belum dapat dimuat. Periksa koneksi lalu coba lagi.</div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {(
              [
                ['Total BA', s.total, 'text-[#0B2545]'],
                ['Normal', s.normal, 'text-emerald-700'],
                ['Tindak lanjut', s.follow_up, 'text-amber-700'],
                ['Kritis', s.critical, 'text-red-700'],
                ['Disetujui PWS', s.approved, 'text-emerald-700'],
                ['Menunggu validasi', s.pending_approval, 'text-amber-700'],
              ] as [string, number, string][]
            ).map(([label, v, cls]) => (
              <div key={label} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">{label}</span>
                <span className={`text-2xl font-extrabold ${cls}`}>{v}</span>
              </div>
            ))}
          </div>
          {s.extra.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {s.extra.map((e) => (
                <div key={e.label} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-600">{e.label}</span>
                  <strong className="text-slate-900">{e.value}</strong>
                </div>
              ))}
            </div>
          )}

          {/* Per SPBU */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <h3 className="px-4 py-3 border-b border-slate-100 text-sm font-extrabold text-[#0B2545]">Rekap per SPBU</h3>
            {data.bySite.length === 0 ? (
              <p className="p-4 text-xs text-slate-500">Tidak ada data pada periode ini.</p>
            ) : (
              <>
              <ul className="md:hidden divide-y divide-slate-100">
                {data.bySite.map((x) => (
                  <li key={x.site_id} className="px-4 py-3 text-xs">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-bold text-slate-900">{x.site_code}</span>
                      <span className="font-extrabold text-[#0B2545]">{x.total} BA</span>
                    </div>
                    <div className="text-[11px] text-slate-500 break-words">{x.site_name}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800">Normal {x.normal}</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800">Tindak lanjut {x.follow_up}</span>
                      <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-800">Kritis {x.critical}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">Disetujui {x.approved}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left p-3">SPBU</th>
                      <th className="p-3">Total</th>
                      <th className="p-3">Normal</th>
                      <th className="p-3">Tindak lanjut</th>
                      <th className="p-3">Kritis</th>
                      <th className="p-3">Disetujui</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bySite.map((x) => (
                      <tr key={x.site_id} className="border-t border-slate-100 text-center">
                        <td className="p-3 text-left">
                          <div className="font-bold text-slate-900">{x.site_code}</div>
                          <div className="text-[11px] text-slate-500">{x.site_name}</div>
                        </td>
                        <td className="p-3 font-bold">{x.total}</td>
                        <td className="p-3 text-emerald-700">{x.normal}</td>
                        <td className="p-3 text-amber-700">{x.follow_up}</td>
                        <td className="p-3 text-red-700">{x.critical}</td>
                        <td className="p-3">{x.approved}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>

          {/* Details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="px-4 py-3 border-b border-slate-100 text-sm font-extrabold text-[#0B2545]">Rincian Berita Acara ({data.rows.length})</h3>
            {data.rows.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500">Tidak ada Berita Acara final pada periode / SPBU ini.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.rows.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => onOpenReport(r.id)} className="w-full text-left p-4 hover:bg-slate-50 flex items-start gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[11px] font-bold bg-slate-100 px-1.5 py-0.5 rounded">{r.ba_number}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusCls(r.overall_status)}`}>{r.overall_status}</span>
                          {r.ticket_number && <span className="text-[10px] font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded">{r.ticket_number}</span>}
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.approved_by ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}
                          >
                            {r.approved_by ? `Disetujui ${r.approved_by}` : 'Menunggu validasi'}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900">
                          {r.site_code} · {r.site_name} <span className="font-normal text-slate-500">· {r.date}</span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Teknisi: {r.technician} · PWS: {r.supervisor}
                        </div>
                        {type === 'PM' && (
                          <div className="text-[11px] text-slate-700">
                            {r.issues ? `${r.issues} temuan` : 'Tanpa temuan'}
                            {r.findings ? ` · ${r.findings}` : ''}
                          </div>
                        )}
                        {type === 'PMT' && (
                          <div className="text-[11px] text-slate-700 space-y-0.5">
                            <div className="whitespace-pre-line">{r.dispensers || 'Tanpa data dispenser'}</div>
                            <div>
                              {(r.mech_bad || []).length ? <span className="text-red-700">R/X: {(r.mech_bad || []).join(', ')}</span> : 'Semua item baik'}
                            </div>
                          </div>
                        )}
                        {type === 'CM' && (
                          <div className="text-[11px] text-slate-700 space-y-0.5">
                            <div>
                              <strong>Keluhan:</strong> {r.unit ? `${r.unit} — ` : ''}
                              {r.problem || '-'}
                            </div>
                            <div>
                              <strong>Tindakan:</strong> {r.action_taken || '-'} · <strong>Sparepart:</strong> {r.sparepart || '-'} · <strong>Uji:</strong>{' '}
                              {r.test_result || '-'}
                              {r.duration_min != null ? ` · ${r.duration_min} menit` : ''}
                            </div>
                          </div>
                        )}
                        {type === 'QC' && (
                          <div className="text-[11px] text-slate-700">
                            {(r.checks_bad || []).length ? <span className="text-red-700">Rusak: {(r.checks_bad || []).join(', ')}</span> : 'Semua item baik'}
                            {r.findings ? ` · ${r.findings}` : ''}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};
