'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Clock, ClipboardCheck, RefreshCw } from 'lucide-react';
import type { Site } from '@/lib/types';
import { DAILY_CHECK_ITEMS, DailyCheck, todayDili } from '@/lib/daily-checklist';
import { fetchDailyChecksApi } from '@/lib/api-client';
import { Spinner } from '@/components/ui/Loading';

/** Admin overview: today's Pengawas checklist result for every SPBU. */
export const DailyChecklistAdminPanel: React.FC<{ sites: Site[]; refreshKey?: number }> = ({ sites, refreshKey }) => {
  const [date, setDate] = useState(todayDili());
  const [checks, setChecks] = useState<DailyCheck[] | null>(null);

  const load = async () => {
    setChecks(null);
    const res = await fetchDailyChecksApi(date);
    setChecks(res?.checks || []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, refreshKey]);

  const byId = new Map((checks || []).map((c) => [c.site_id, c]));
  const submitted = checks?.length || 0;
  const withIssue = (checks || []).filter((c) => c.status === 'ISSUE').length;
  const label = (key: string) => DAILY_CHECK_ITEMS.find((d) => d.key === key)?.label || key;

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
      <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-[#0B2545] flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-slate-500" /> Checklist Kesiapan Harian SPBU
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {checks ? `${submitted}/${sites.length} SPBU sudah submit · ${withIssue} dengan temuan` : 'Memuat...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="Tanggal checklist"
            value={date}
            max={todayDili()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="min-h-[40px] px-3 bg-white border border-slate-300 rounded-lg text-sm"
          />
          <button type="button" onClick={load} aria-label="Muat ulang" className="min-h-[40px] min-w-[40px] rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center">
            <RefreshCw className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {!checks ? (
        <div className="flex items-center gap-2 p-5 text-xs text-slate-500">
          <Spinner size={18} /> Memuat checklist...
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-3 sm:p-4">
          {sites.map((s) => {
            const c = byId.get(s.id);
            const bad = c ? c.items.filter((i) => !i.ok) : [];
            return (
              <li
                key={s.id}
                className={`rounded-lg border p-3 flex flex-col gap-2 ${
                  !c ? 'border-slate-200 bg-white' : c.status === 'OK' ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-300 bg-amber-50/40'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">{s.site_code}</div>
                  <div className="text-[11px] text-slate-500 break-words">{s.site_name}</div>
                </div>
                <div className="flex-1 min-w-0 text-xs">
                  {!c ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-500">
                      <Clock className="w-4 h-4" /> Belum submit
                    </span>
                  ) : c.status === 'OK' ? (
                    <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" /> Semua baik
                    </span>
                  ) : (
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 font-bold text-amber-700">
                        <AlertTriangle className="w-4 h-4" /> {bad.length} item bermasalah
                      </span>
                      <ul className="list-disc pl-5 text-slate-700 space-y-0.5">
                        {bad.map((b) => (
                          <li key={b.key}>
                            {label(b.key)}
                            {b.note && <span className="text-slate-500"> — {b.note}</span>}
                          </li>
                        ))}
                      </ul>
                      {c.ticket_numbers.length > 0 && <div className="text-[11px] text-slate-600">Tiket: {c.ticket_numbers.join(', ')}</div>}
                    </div>
                  )}
                  {c && (
                    <div className="text-[11px] text-slate-500 mt-1">
                      {c.submitted_by_name} · {new Date(c.submitted_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
