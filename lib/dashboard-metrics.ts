/** Dashboard figures computed from real tickets and Berita Acara (no placeholders). */
import type { PMReport, SPBUTicket, TicketPriority } from './types';
import { isFinal } from './report-status';

/**
 * Resolution target per priority (hours). Used for "Kepatuhan SLA".
 * Adjust here if Pertamina's service agreement uses other targets.
 */
export const SLA_TARGET_HOURS: Record<TicketPriority, number> = {
  Darurat: 4,
  Tinggi: 8,
  Sedang: 24,
  Rendah: 72,
};

/** Ticket timestamps are stored as UTC "YYYY-MM-DD HH:MM" (or ISO). */
export function parseTicketTime(s?: string): number | null {
  if (!s) return null;
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s) ? `${s.replace(' ', 'T')}${s.length === 16 ? ':00' : ''}Z` : s;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

export interface SlaStats {
  /** % of measured tickets handled within target, null when nothing to measure yet */
  compliance: number | null;
  met: number;
  breached: number;
  /** average hours from report to resolution (resolved tickets only) */
  avgResolutionHours: number | null;
  resolvedCount: number;
  /** open tickets already past their target */
  overdueOpen: number;
}

export function ticketSla(tickets: SPBUTicket[], now = Date.now()): SlaStats {
  let met = 0;
  let breached = 0;
  let overdueOpen = 0;
  let totalHours = 0;
  let resolvedCount = 0;

  for (const t of tickets) {
    const reported = parseTicketTime(t.reported_at);
    if (reported === null) continue;
    const target = (SLA_TARGET_HOURS[t.priority] ?? 24) * 3_600_000;
    if (t.status === 'Selesai (Resolved)') {
      const resolved = parseTicketTime(t.resolved_at);
      if (resolved === null) continue;
      const took = Math.max(0, resolved - reported);
      totalHours += took / 3_600_000;
      resolvedCount++;
      if (took <= target) met++;
      else breached++;
    } else if (now - reported > target) {
      // still open and already late: counts against the SLA
      breached++;
      overdueOpen++;
    }
  }

  const measured = met + breached;
  return {
    compliance: measured ? Math.round((met / measured) * 1000) / 10 : null,
    met,
    breached,
    avgResolutionHours: resolvedCount ? Math.round((totalHours / resolvedCount) * 10) / 10 : null,
    resolvedCount,
    overdueOpen,
  };
}

export function formatHours(h: number | null): string {
  if (h === null) return '-';
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} menit`;
  if (h < 48) return `${h.toLocaleString('id-ID', { maximumFractionDigits: 1 })} jam`;
  return `${Math.round(h / 24).toLocaleString('id-ID')} hari`;
}

/** Latest final BA of a site (optionally of one work type), newest execution date first. */
export function latestSiteReport(reports: PMReport[], siteId: number, workType?: PMReport['work_type']): PMReport | undefined {
  return reports
    .filter((r) => r.site_id === siteId && isFinal(r) && (!workType || r.work_type === workType))
    .sort((a, b) => `${b.execution_date} ${b.execution_time || ''}`.localeCompare(`${a.execution_date} ${a.execution_time || ''}`))[0];
}

export interface WaterStatus {
  total: number;
  withWater: string[]; // tank labels where the water sensor reported a problem
  reportDate?: string;
}

/** Water-sensor result per tank from the latest PM BA of the site. */
export function tankWaterStatus(reports: PMReport[], siteId: number): WaterStatus | null {
  const r = latestSiteReport(reports, siteId, 'PREVENTIVE_MAINTENANCE');
  const tanks = r?.forecourt?.tanks || [];
  if (!r || !tanks.length) return null;
  return {
    total: tanks.length,
    withWater: tanks.filter((t) => t.water_sensor_status === 'R').map((t) => `${t.tank_number} (${t.product_name})`),
    reportDate: r.execution_date,
  };
}

export const STATUS_WORD: Record<string, string> = { B: 'Baik', R: 'Rusak', X: 'Tidak ada' };
