'use client';

import React, { useMemo, useState } from 'react';
import { History, Search, Wrench, ClipboardCheck, ShieldCheck, ArrowRight, ChevronDown, ChevronUp, FileText, Camera, Sparkles, Fuel } from 'lucide-react';
import type { PMReport, WorkType } from '@/lib/types';
import { reportStatus } from '@/lib/report-status';
import { baNumber, WORK_TYPE_CODE, WORK_TYPE_SHORT } from '@/lib/work-type';
import { CLEANING_ITEMS } from '@/lib/cleaning';
import { mechanicalCheckBad, mechanicalIssues } from '@/lib/mechanical';

type TypeFilter = 'ALL' | WorkType;

const TYPE_STYLE: Record<WorkType, string> = {
  PREVENTIVE_MAINTENANCE: 'bg-blue-50 text-blue-800 border-blue-200',
  CORRECTIVE_REPAIR: 'bg-red-50 text-red-800 border-red-200',
  QUICK_CHECK: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  MECHANICAL_PM: 'bg-orange-50 text-orange-800 border-orange-200',
  MECHANICAL_CHECK: 'bg-amber-50 text-amber-800 border-amber-200',
};
const TYPE_ICON: Record<WorkType, React.ElementType> = {
  PREVENTIVE_MAINTENANCE: ShieldCheck,
  CORRECTIVE_REPAIR: Wrench,
  QUICK_CHECK: ClipboardCheck,
  MECHANICAL_PM: Fuel,
  MECHANICAL_CHECK: ClipboardCheck,
};
const STATUS_STYLE: Record<string, string> = {
  'Selesai (Normal)': 'text-emerald-700',
  'Perlu Tindak Lanjut': 'text-amber-700',
  'Kritis (Perbaikan Segera)': 'text-red-700',
};

const fmtDate = (d?: string) => {
  const t = Date.parse(d || '');
  return Number.isNaN(t) ? d || '-' : new Date(t).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** All text of a BA that a user may search for, incl. serial numbers of swapped parts. */
function haystack(r: PMReport): string {
  const d = r.repair_details;
  return [
    baNumber(r),
    r.technician_name,
    r.supervisor_name,
    r.findings_summary,
    r.action_plan,
    d?.affected_unit,
    d?.affected_serial,
    d?.reported_problem,
    d?.action_taken,
    d?.sparepart_replaced,
    ...(d?.parts_replaced || []).flatMap((p) => [p.name, p.old_serial, p.new_serial]),
    ...(r.edc_list || []).map((e) => e.serial_number),
    ...(r.mechanical?.dispensers || []).flatMap((d) => [d.label, d.model, d.serial_number]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

interface Props {
  /** BA of one SPBU (any order); drafts are ignored. */
  reports: PMReport[];
  siteLabel?: string;
  /** Open the BA (archive only; omitted inside the form so a draft is never lost). */
  onOpen?: (r: PMReport) => void;
  /** Start collapsed behind a toggle (used inside the form). */
  collapsible?: boolean;
}

/** PM / CM / Pengecekan timeline of one SPBU: what was done, by whom, and which parts were swapped. */
export const MaintenanceHistory: React.FC<Props> = ({ reports, siteLabel, onOpen, collapsible }) => {
  const [open, setOpen] = useState(!collapsible);
  const [type, setType] = useState<TypeFilter>('ALL');
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);

  const done = useMemo(
    () =>
      reports
        .filter((r) => reportStatus(r) !== 'DRAFT')
        .sort((a, b) => (b.execution_date || '').localeCompare(a.execution_date || '') || (b.created_at || '').localeCompare(a.created_at || '')),
    [reports]
  );
  const counts = useMemo(() => {
    const c: Record<WorkType, number> = { PREVENTIVE_MAINTENANCE: 0, CORRECTIVE_REPAIR: 0, QUICK_CHECK: 0, MECHANICAL_PM: 0, MECHANICAL_CHECK: 0 };
    done.forEach((r) => (c[r.work_type] = (c[r.work_type] || 0) + 1));
    return c;
  }, [done]);
  const last = (t: WorkType) => done.find((r) => r.work_type === t)?.execution_date;

  const term = q.trim().toLowerCase();
  const list = done.filter((r) => (type === 'ALL' || r.work_type === type) && (!term || haystack(r).includes(term)));

  const header = (
    <div className="flex items-start gap-2">
      <History className="w-5 h-5 text-blue-800 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <h3 className="text-sm font-extrabold text-[#0B2545]">Riwayat PM, PM Teknik, CM & Pengecekan{siteLabel ? ` · ${siteLabel}` : ''}</h3>
        <p className="text-xs text-slate-500">
          {done.length} BA · PM terakhir {fmtDate(last('PREVENTIVE_MAINTENANCE'))} · PM Teknik terakhir {fmtDate(last('MECHANICAL_PM'))} · CM terakhir {fmtDate(last('CORRECTIVE_REPAIR'))}
        </p>
      </div>
    </div>
  );

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3">
      {collapsible ? (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full flex items-start justify-between gap-2 text-left min-h-[44px]">
          {header}
          {open ? <ChevronUp className="w-5 h-5 text-slate-500 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-500 flex-shrink-0" />}
        </button>
      ) : (
        header
      )}

      {open && (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter jenis pekerjaan">
            {(['ALL', 'PREVENTIVE_MAINTENANCE', 'MECHANICAL_PM', 'CORRECTIVE_REPAIR', 'QUICK_CHECK', 'MECHANICAL_CHECK'] as TypeFilter[]).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={type === t}
                onClick={() => setType(t)}
                className={`min-h-[36px] px-3 rounded-full border text-xs font-bold ${type === t ? 'bg-[#0B2545] text-white border-[#0B2545]' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
              >
                {t === 'ALL' ? `Semua (${done.length})` : `${WORK_TYPE_CODE[t]} (${counts[t]})`}
              </button>
            ))}
          </div>
          <label className="relative block">
            <span className="sr-only">Cari riwayat</span>
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari no. BA, teknisi, temuan, nama barang, serial number…"
              className="w-full min-h-[44px] pl-9 pr-3 bg-white border border-slate-300 rounded-lg text-sm"
            />
          </label>

          {list.length === 0 ? (
            <p className="text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg px-3 py-6 text-center">
              {done.length ? 'Tidak ada riwayat yang cocok dengan filter.' : 'Belum ada riwayat BA final untuk SPBU ini.'}
            </p>
          ) : (
            <ol className="relative border-l-2 border-slate-200 ml-2 space-y-3">
              {list.slice(0, limit).map((r) => {
                const Icon = TYPE_ICON[r.work_type] || FileText;
                const d = r.repair_details;
                const parts = d?.parts_replaced || [];
                const isOpen = expanded === r.id;
                const cleaned = r.cleaning ? CLEANING_ITEMS.filter((c) => r.cleaning?.[c.key]).length : null;
                const summary =
                  r.work_type === 'CORRECTIVE_REPAIR'
                    ? [d?.affected_unit, d?.reported_problem].filter(Boolean).join(' — ')
                    : r.findings_summary;
                return (
                  <li key={r.id} className="ml-4">
                    <span className={`absolute -left-[11px] w-5 h-5 rounded-full border flex items-center justify-center ${TYPE_STYLE[r.work_type]}`}>
                      <Icon className="w-3 h-3" />
                    </span>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                      <button type="button" onClick={() => setExpanded(isOpen ? null : r.id)} aria-expanded={isOpen} className="w-full text-left">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${TYPE_STYLE[r.work_type]}`}>{WORK_TYPE_SHORT[r.work_type]}</span>
                          <span className="text-xs font-bold text-slate-900">{fmtDate(r.execution_date)}</span>
                          <span className="text-[11px] font-mono text-slate-500">{baNumber(r)}</span>
                          <span className={`text-[11px] font-bold ${STATUS_STYLE[r.overall_status] || 'text-slate-600'}`}>{r.overall_status}</span>
                        </div>
                        <p className="text-xs text-slate-700 mt-1 line-clamp-2">{summary || '-'}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {r.technician_name || '-'}
                          {parts.length > 0 && ` · ${parts.length} barang diganti`}
                          {r.work_type === 'MECHANICAL_PM' && ` · ${(r.mechanical?.dispensers || []).length} dispenser · ${mechanicalIssues(r.mechanical)} temuan R/X`}
                          {r.work_type === 'MECHANICAL_CHECK' && ` · ${mechanicalCheckBad(r.mechanical_check).length} temuan R/X`}
                          {cleaned != null && r.work_type === 'PREVENTIVE_MAINTENANCE' && ` · pembersihan ${cleaned}/${CLEANING_ITEMS.length}`}
                        </p>
                      </button>

                      {isOpen && (
                        <div className="mt-2 pt-2 border-t border-slate-200 space-y-2 text-xs text-slate-700">
                          <p>
                            <strong>Pengawas:</strong> {r.supervisor_name || '-'}
                            {r.approval ? ` · divalidasi ${fmtDate(r.approval.at)}` : ''}
                          </p>
                          {r.work_type === 'CORRECTIVE_REPAIR' ? (
                            <>
                              {d?.root_cause && <p><strong>Akar masalah:</strong> {d.root_cause}</p>}
                              {d?.action_taken && <p><strong>Tindakan:</strong> {d.action_taken}</p>}
                              {parts.length > 0 && (
                                <ul className="space-y-1">
                                  {parts.map((p) => (
                                    <li key={p.id} className="rounded-md bg-white border border-slate-200 px-2 py-1.5">
                                      <span className="font-semibold">{p.name || '-'}</span>
                                      <span className="flex flex-wrap items-center gap-1 font-mono text-[11px] mt-0.5">
                                        <span className="text-red-700">{p.old_serial || '-'}</span>
                                        <ArrowRight className="w-3 h-3 text-slate-400" aria-label="diganti dengan" />
                                        <span className="text-emerald-700 font-bold">{p.new_serial || '-'}</span>
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {d?.sparepart_replaced && <p><strong>Catatan sparepart:</strong> {d.sparepart_replaced}</p>}
                            </>
                          ) : (
                            <>
                              {r.action_plan && <p><strong>Tindak lanjut:</strong> {r.action_plan}</p>}
                              {r.work_type === 'MECHANICAL_PM' && (r.mechanical?.dispensers || []).length > 0 && (
                                <p>
                                  <strong>Dispenser:</strong>{' '}
                                  {(r.mechanical?.dispensers || []).map((d) => `${d.label} (${d.model || '-'}, SN ${d.serial_number || '-'})`).join('; ')}
                                </p>
                              )}
                              {r.work_type === 'PREVENTIVE_MAINTENANCE' && r.cleaning && (
                                <p className="flex items-start gap-1">
                                  <Sparkles className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                                  <span>
                                    Pembersihan: {CLEANING_ITEMS.filter((c) => r.cleaning?.[c.key]).map((c) => c.label.split(' (')[0]).join(', ') || 'tidak ada'}
                                  </span>
                                </p>
                              )}
                            </>
                          )}
                          <p className="flex items-center gap-1 text-slate-500">
                            <Camera className="w-3.5 h-3.5" /> {r._attachments_count ?? r.attachments?.length ?? 0} foto dokumentasi
                          </p>
                          {onOpen && (
                            <button
                              type="button"
                              onClick={() => onOpen(r)}
                              className="min-h-[40px] px-3 rounded-lg bg-[#0B2545] hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5"
                            >
                              <FileText className="w-3.5 h-3.5" /> Buka Berita Acara
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          {list.length > limit && (
            <button type="button" onClick={() => setLimit((l) => l + 20)} className="w-full min-h-[44px] rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50">
              Tampilkan lebih banyak ({list.length - limit} lagi)
            </button>
          )}
        </>
      )}
    </section>
  );
};
