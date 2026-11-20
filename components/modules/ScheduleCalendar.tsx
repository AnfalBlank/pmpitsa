'use client';

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Wrench, User, ShieldCheck, CalendarDays } from 'lucide-react';
import type { MaintenancePlan, Site, WorkType } from '@/lib/types';

interface Props {
  plans: MaintenancePlan[];
  sites: Site[];
  canExecute?: boolean;
  onExecute?: (site: Site, workType: WorkType, terminalId: string) => void;
}

/** Distinct, colour-blind friendlier palette; one colour per SPBU */
const PALETTE = [
  { bg: '#DBEAFE', fg: '#1E3A8A', dot: '#2563EB' },
  { bg: '#DCFCE7', fg: '#14532D', dot: '#16A34A' },
  { bg: '#FEF3C7', fg: '#78350F', dot: '#D97706' },
  { bg: '#FCE7F3', fg: '#831843', dot: '#DB2777' },
  { bg: '#EDE9FE', fg: '#4C1D95', dot: '#7C3AED' },
  { bg: '#CFFAFE', fg: '#164E63', dot: '#0891B2' },
  { bg: '#FFE4E6', fg: '#881337', dot: '#E11D48' },
  { bg: '#ECFCCB', fg: '#365314', dot: '#65A30D' },
  { bg: '#FFEDD5', fg: '#7C2D12', dot: '#EA580C' },
  { bg: '#E0E7FF', fg: '#312E81', dot: '#4F46E5' },
];

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const TYPE_SHORT: Record<WorkType, string> = { PREVENTIVE_MAINTENANCE: 'PM', CORRECTIVE_REPAIR: 'CM', QUICK_CHECK: 'QC', MECHANICAL_PM: 'PMT' };
const TYPE_LONG: Record<WorkType, string> = {
  PREVENTIVE_MAINTENANCE: 'Preventive Maintenance',
  CORRECTIVE_REPAIR: 'Corrective Maintenance',
  MECHANICAL_PM: 'PM Teknik (Dispenser & Tangki)',
  QUICK_CHECK: 'Pengecekan',
};

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const shortName = (s: string) => s.replace(/\s*\(.*\)\s*$/, '').split(' ').slice(0, 2).join(' ');

/**
 * Monthly calendar of PM plans: each day with a visit is coloured with the
 * SPBU's colour (split when several SPBU are visited that day) and lists who
 * is on duty. Tapping a day shows its plans below the grid.
 */
export const ScheduleCalendar: React.FC<Props> = ({ plans, sites, canExecute, onExecute }) => {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(ymd(today));

  // SPBU code / name always from Data SPBU (by id); plan copy only as fallback
  const codeOf = (p: MaintenancePlan) => sites.find((x) => x.id === p.site_id)?.site_code || p.site_code;
  const nameOf = (p: MaintenancePlan) => sites.find((x) => x.id === p.site_id)?.site_name || p.site_name;

  const colorOf = useMemo(() => {
    const ids = Array.from(new Set([...sites.map((s) => s.id), ...plans.map((p) => p.site_id)])).sort((a, b) => a - b);
    return (siteId: number) => PALETTE[Math.max(0, ids.indexOf(siteId)) % PALETTE.length];
  }, [sites, plans]);

  const byDay = useMemo(() => {
    const m = new Map<string, MaintenancePlan[]>();
    for (const p of plans) {
      const k = (p.scheduled_date || '').slice(0, 10);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    return m;
  }, [plans]);

  // Grid: weeks starting Monday
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7) cells.push(null);

  const monthKey = `${year}-${pad(month + 1)}`;
  const monthPlans = plans.filter((p) => (p.scheduled_date || '').startsWith(monthKey));
  const techCount = new Map<string, number>();
  monthPlans.forEach((p) => techCount.set(shortName(p.assigned_technician || '-'), (techCount.get(shortName(p.assigned_technician || '-')) || 0) + 1));
  const sitesThisMonth = Array.from(new Set(monthPlans.map((p) => p.site_id)));
  const selectedPlans = byDay.get(selected) || [];
  const monthLabel = first.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const move = (delta: number) => setCursor(new Date(year, month + delta, 1));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-3 border-b border-slate-100">
        <button type="button" onClick={() => move(-1)} aria-label="Bulan sebelumnya" className="min-h-[44px] min-w-[44px] rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center min-w-0">
          <h3 className="text-sm sm:text-base font-extrabold text-[#0B2545] capitalize">{monthLabel}</h3>
          <button
            type="button"
            onClick={() => {
              setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
              setSelected(ymd(today));
            }}
            className="text-[11px] font-semibold text-blue-700 hover:underline"
          >
            Hari ini
          </button>
        </div>
        <button type="button" onClick={() => move(1)} aria-label="Bulan berikutnya" className="min-h-[44px] min-w-[44px] rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Month summary: who is on duty */}
      <div className="px-3 sm:px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-[11px] text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
        <span>
          <strong className="text-slate-900">{monthPlans.length}</strong> jadwal · <strong className="text-slate-900">{sitesThisMonth.length}</strong> SPBU
        </span>
        {techCount.size > 0 && (
          <span className="flex flex-wrap gap-x-2">
            Bertugas:
            {Array.from(techCount.entries()).map(([t, n]) => (
              <strong key={t} className="text-slate-900">
                {t} ({n})
              </strong>
            ))}
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="p-2 sm:p-4">
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center mb-1">
          {DAY_NAMES.map((d, i) => (
            <div key={d} className={`text-[10px] sm:text-xs font-bold uppercase ${i >= 5 ? 'text-red-600' : 'text-slate-500'}`}>
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5" role="grid" aria-label={`Kalender jadwal ${monthLabel}`}>
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} aria-hidden="true" />;
            const key = ymd(d);
            const dayPlans = byDay.get(key) || [];
            const colors = Array.from(new Set(dayPlans.map((p) => p.site_id))).map(colorOf);
            const isToday = key === ymd(today);
            const isSel = key === selected;
            // One colour fills the day; several SPBU split the background into stripes
            const background = colors.length
              ? colors.length === 1
                ? colors[0].bg
                : `linear-gradient(135deg, ${colors.map((c, j) => `${c.bg} ${(j / colors.length) * 100}% ${((j + 1) / colors.length) * 100}%`).join(', ')})`
              : undefined;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                aria-pressed={isSel}
                aria-label={`${d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}${dayPlans.length ? `, ${dayPlans.length} jadwal: ${dayPlans.map((p) => `${codeOf(p)} ${shortName(p.assigned_technician)}`).join(', ')}` : ', tidak ada jadwal'}`}
                style={background ? { background } : undefined}
                className={`relative min-h-[52px] sm:min-h-[92px] rounded-lg border text-left p-1 sm:p-1.5 flex flex-col transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2545] ${
                  isSel ? 'border-[#0B2545] ring-2 ring-[#0B2545]/30' : dayPlans.length ? 'border-transparent' : 'border-slate-100 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`text-[11px] sm:text-xs font-bold leading-none ${
                    isToday ? 'bg-red-600 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center' : 'text-slate-800'
                  }`}
                >
                  {d.getDate()}
                </span>
                {/* Mobile: dots per plan */}
                {dayPlans.length > 0 && (
                  <span className="sm:hidden mt-auto flex flex-wrap gap-0.5">
                    {dayPlans.slice(0, 4).map((p) => (
                      <span key={p.id} className="w-1.5 h-1.5 rounded-full" style={{ background: colorOf(p.site_id).dot }} />
                    ))}
                  </span>
                )}
                {/* Desktop: chips with SPBU + technician */}
                <span className="hidden sm:flex flex-col gap-0.5 mt-1 min-w-0">
                  {dayPlans.slice(0, 3).map((p) => {
                    const c = colorOf(p.site_id);
                    return (
                      <span key={p.id} className="block truncate rounded px-1 py-0.5 text-[10px] font-semibold bg-white/80" style={{ color: c.fg }}>
                        {TYPE_SHORT[p.plan_type]} {codeOf(p)} · {shortName(p.assigned_technician)}
                      </span>
                    );
                  })}
                  {dayPlans.length > 3 && <span className="text-[10px] font-bold text-slate-600">+{dayPlans.length - 3} lagi</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend: colour per SPBU */}
      <div className="px-3 sm:px-5 pb-3 flex flex-wrap gap-x-3 gap-y-1.5">
        {sites.map((s) => {
          const c = colorOf(s.id);
          return (
            <span key={s.id} className="inline-flex items-center gap-1.5 text-[11px] text-slate-700">
              <span className="w-3 h-3 rounded" style={{ background: c.bg, border: `2px solid ${c.dot}` }} />
              {s.site_code}
            </span>
          );
        })}
      </div>

      {/* Selected day */}
      <div className="border-t border-slate-100 px-3 sm:px-5 py-3 space-y-2">
        <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-slate-500" />
          {new Date(`${selected}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </h4>
        {selectedPlans.length === 0 ? (
          <p className="text-xs text-slate-500">Tidak ada jadwal pada tanggal ini.</p>
        ) : (
          selectedPlans.map((p) => {
            const c = colorOf(p.site_id);
            const site = sites.find((s) => s.id === p.site_id);
            return (
              <div key={p.id} className="rounded-lg border border-slate-200 p-3 text-xs flex flex-col sm:flex-row sm:items-center gap-2" style={{ borderLeft: `5px solid ${c.dot}` }}>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="font-bold text-slate-900 break-words">
                    {codeOf(p)} · {nameOf(p)}
                  </div>
                  <div className="text-slate-600">
                    {TYPE_LONG[p.plan_type]} · {p.terminal_id} · <span className="font-semibold">{p.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 text-slate-700">
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-500" /> {p.assigned_technician}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-500" /> {p.supervisor_pws}
                    </span>
                  </div>
                </div>
                {canExecute && onExecute && site && p.status !== 'Selesai' && (
                  <button
                    type="button"
                    onClick={() => onExecute(site, p.plan_type, p.terminal_id)}
                    className="min-h-[40px] px-3 rounded-lg bg-[#0B2545] hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-1.5 flex-shrink-0"
                  >
                    <Wrench className="w-3.5 h-3.5" /> Mulai Eksekusi
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
