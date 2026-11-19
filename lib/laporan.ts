/** Management reports (PM / CM / Pengecekan) built from final Berita Acara. */
import type { PMReport, WorkType } from './types';
import { baNumber } from './work-type';

export type LaporanType = 'PM' | 'CM' | 'QC';

export const LAPORAN_WORK_TYPE: Record<LaporanType, WorkType> = {
  PM: 'PREVENTIVE_MAINTENANCE',
  CM: 'CORRECTIVE_REPAIR',
  QC: 'QUICK_CHECK',
};

export const LAPORAN_TITLE: Record<LaporanType, string> = {
  PM: 'Laporan Preventive Maintenance (PM)',
  CM: 'Laporan Corrective Maintenance (CM)',
  QC: 'Laporan Pengecekan (Quick Check)',
};

export interface LaporanRow {
  id: string;
  ba_number: string;
  date: string;
  site_id: number;
  site_code: string;
  site_name: string;
  terminal_id: string;
  technician: string;
  supervisor: string;
  overall_status: string;
  approved_by: string | null;
  approved_at: string | null;
  revision: number;
  findings: string;
  action_plan: string;
  ticket_number?: string;
  // PM
  issues?: number;
  next_pm?: string;
  // CM
  category?: string;
  unit?: string;
  problem?: string;
  root_cause?: string;
  action_taken?: string;
  sparepart?: string;
  test_result?: string;
  duration_min?: number | null;
  // QC
  checks_bad?: string[];
}

export interface LaporanSummary {
  total: number;
  normal: number;
  follow_up: number;
  critical: number;
  approved: number;
  pending_approval: number;
  extra: { label: string; value: string | number }[];
}

export interface LaporanSiteRow {
  site_id: number;
  site_code: string;
  site_name: string;
  total: number;
  normal: number;
  follow_up: number;
  critical: number;
  approved: number;
}

const STATUS_WORD: Record<string, string> = { B: 'Baik', R: 'Rusak', X: 'Tidak ada' };
const QC_LABEL: Record<string, string> = {
  pos_system_online: 'POS online',
  dispenser_communication: 'Komunikasi dispenser',
  edc_transaction_ready: 'EDC siap',
  atg_tank_monitor: 'Monitor ATG',
  printer_thermal_status: 'Printer thermal',
};

function minutes(a?: string, b?: string): number | null {
  if (!a || !b) return null;
  const [h1, m1] = a.split(':').map(Number);
  const [h2, m2] = b.split(':').map(Number);
  if ([h1, m1, h2, m2].some((n) => Number.isNaN(n))) return null;
  let d = h2 * 60 + m2 - (h1 * 60 + m1);
  if (d < 0) d += 24 * 60;
  return d;
}

/** Count R (rusak) answers / ISSUE features in a PM BA */
function pmIssues(r: PMReport): number {
  const vals: unknown[] = [];
  const walk = (o: any) => {
    if (!o || typeof o !== 'object') return;
    for (const v of Object.values(o)) {
      if (v && typeof v === 'object') walk(v);
      else vals.push(v);
    }
  };
  walk(r.hardware);
  walk(r.peripherals);
  walk(r.network_power);
  walk({ a: r.forecourt?.atg_controller_status, b: r.forecourt?.dispenser_interface_box, c: r.forecourt?.metrology_seal_status });
  (r.forecourt?.tanks || []).forEach(walk);
  (r.forecourt?.nozzles || []).forEach((n) => vals.push(n.status));
  (r.edc_list || []).forEach((e) => vals.push(e.physical_status, e.connection_status));
  return vals.filter((v) => v === 'R').length + (r.features_checklist || []).filter((f) => f.status === 'ISSUE').length;
}

export function toLaporanRow(r: PMReport): LaporanRow {
  const base: LaporanRow = {
    id: r.id,
    ba_number: baNumber(r),
    date: r.execution_date,
    site_id: Number(r.site_id),
    site_code: r.site_code,
    site_name: r.site_name,
    terminal_id: r.terminal_id,
    technician: r.technician_name,
    supervisor: r.supervisor_name,
    overall_status: r.overall_status,
    approved_by: r.approval?.by || null,
    approved_at: r.approval?.at || null,
    revision: r.revision || 1,
    findings: r.findings_summary || '',
    action_plan: r.action_plan || '',
    ticket_number: r.ticket_number,
  };
  if (r.work_type === 'PREVENTIVE_MAINTENANCE') {
    base.issues = pmIssues(r);
    base.next_pm = r.next_pm_recommendation_date;
  } else if (r.work_type === 'CORRECTIVE_REPAIR') {
    const d = r.repair_details;
    base.category = d?.category;
    base.unit = d?.affected_unit;
    base.problem = d?.reported_problem;
    base.root_cause = d?.root_cause;
    base.action_taken = d?.action_taken;
    base.sparepart = d?.sparepart_replaced;
    base.test_result = d?.post_repair_status ? STATUS_WORD[d.post_repair_status] || d.post_repair_status : '';
    base.duration_min = minutes(d?.work_start, d?.work_end);
  } else {
    const q: any = r.quick_check_details || {};
    base.checks_bad = Object.keys(QC_LABEL).filter((k) => q[k] === 'R').map((k) => QC_LABEL[k]);
  }
  return base;
}

export function summarise(type: LaporanType, rows: LaporanRow[]): { summary: LaporanSummary; bySite: LaporanSiteRow[] } {
  const count = (pred: (r: LaporanRow) => boolean) => rows.filter(pred).length;
  const summary: LaporanSummary = {
    total: rows.length,
    normal: count((r) => r.overall_status === 'Selesai (Normal)'),
    follow_up: count((r) => r.overall_status === 'Perlu Tindak Lanjut'),
    critical: count((r) => r.overall_status === 'Kritis (Perbaikan Segera)'),
    approved: count((r) => !!r.approved_by),
    pending_approval: count((r) => !r.approved_by),
    extra: [],
  };
  if (type === 'PM') {
    summary.extra.push({ label: 'Total temuan (item rusak / fitur bermasalah)', value: rows.reduce((n, r) => n + (r.issues || 0), 0) });
  } else if (type === 'CM') {
    const parts = count((r) => !!r.sparepart && !/^tidak/i.test(r.sparepart.trim()) && r.sparepart.trim() !== '-');
    const unresolved = count((r) => !!r.test_result && r.test_result !== 'Baik');
    const durs = rows.map((r) => r.duration_min).filter((d): d is number => typeof d === 'number');
    summary.extra.push({ label: 'Perbaikan dengan penggantian sparepart', value: parts });
    summary.extra.push({ label: 'Belum normal setelah perbaikan', value: unresolved });
    summary.extra.push({ label: 'Rata-rata durasi pengerjaan', value: durs.length ? `${Math.round(durs.reduce((a, b) => a + b, 0) / durs.length)} menit` : '-' });
    summary.extra.push({ label: 'Berasal dari tiket', value: count((r) => !!r.ticket_number) });
  } else {
    summary.extra.push({ label: 'Pengecekan dengan item rusak', value: count((r) => (r.checks_bad || []).length > 0) });
  }

  const map = new Map<number, LaporanSiteRow>();
  for (const r of rows) {
    const s = map.get(r.site_id) || { site_id: r.site_id, site_code: r.site_code, site_name: r.site_name, total: 0, normal: 0, follow_up: 0, critical: 0, approved: 0 };
    s.total++;
    if (r.overall_status === 'Selesai (Normal)') s.normal++;
    else if (r.overall_status === 'Perlu Tindak Lanjut') s.follow_up++;
    else s.critical++;
    if (r.approved_by) s.approved++;
    map.set(r.site_id, s);
  }
  return { summary, bySite: Array.from(map.values()).sort((a, b) => a.site_code.localeCompare(b.site_code)) };
}

/** CSV columns per report type */
export function csvColumns(type: LaporanType): { key: string; label: string; get: (r: LaporanRow) => unknown }[] {
  const common = [
    { key: 'ba_number', label: 'No. BA', get: (r: LaporanRow) => r.ba_number },
    { key: 'date', label: 'Tanggal', get: (r: LaporanRow) => r.date },
    { key: 'site_code', label: 'Kode SPBU', get: (r: LaporanRow) => r.site_code },
    { key: 'site_name', label: 'Nama SPBU', get: (r: LaporanRow) => r.site_name },
    { key: 'terminal', label: 'Terminal', get: (r: LaporanRow) => r.terminal_id },
    { key: 'technician', label: 'Teknisi', get: (r: LaporanRow) => r.technician },
    { key: 'supervisor', label: 'Pengawas', get: (r: LaporanRow) => r.supervisor },
    { key: 'status', label: 'Status Akhir', get: (r: LaporanRow) => r.overall_status },
  ];
  const tail = [
    { key: 'approved_by', label: 'Disetujui Oleh', get: (r: LaporanRow) => r.approved_by || 'Menunggu validasi' },
    { key: 'approved_at', label: 'Tanggal Validasi', get: (r: LaporanRow) => (r.approved_at ? r.approved_at.slice(0, 10) : '') },
    { key: 'revision', label: 'Revisi', get: (r: LaporanRow) => r.revision },
  ];
  if (type === 'PM')
    return [
      ...common,
      { key: 'issues', label: 'Jumlah Temuan', get: (r) => r.issues },
      { key: 'findings', label: 'Ringkasan Temuan', get: (r) => r.findings },
      { key: 'action_plan', label: 'Rencana Tindak Lanjut', get: (r) => r.action_plan },
      { key: 'next_pm', label: 'PM Berikutnya', get: (r) => r.next_pm },
      ...tail,
    ];
  if (type === 'CM')
    return [
      ...common,
      { key: 'ticket', label: 'No. Tiket', get: (r) => r.ticket_number || '' },
      { key: 'category', label: 'Kategori', get: (r) => r.category },
      { key: 'unit', label: 'Unit', get: (r) => r.unit },
      { key: 'problem', label: 'Keluhan', get: (r) => r.problem },
      { key: 'root_cause', label: 'Akar Masalah', get: (r) => r.root_cause },
      { key: 'action_taken', label: 'Tindakan', get: (r) => r.action_taken },
      { key: 'sparepart', label: 'Sparepart', get: (r) => r.sparepart },
      { key: 'test', label: 'Hasil Uji', get: (r) => r.test_result },
      { key: 'duration', label: 'Durasi (menit)', get: (r) => r.duration_min ?? '' },
      ...tail,
    ];
  return [
    ...common,
    { key: 'bad', label: 'Item Rusak', get: (r) => (r.checks_bad || []).join('; ') || 'Tidak ada' },
    { key: 'findings', label: 'Catatan', get: (r) => r.findings },
    ...tail,
  ];
}
