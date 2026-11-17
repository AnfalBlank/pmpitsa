/** Lifecycle helpers for Berita Acara (shared by UI and API). */
import type { PMReport, ReportStatus } from './types';

export function reportStatus(r: Pick<PMReport, 'status' | 'synced_to_server'> | null | undefined): ReportStatus {
  if (!r) return 'DRAFT';
  if (r.status) return r.status;
  return r.synced_to_server ? 'FINAL' : 'DRAFT';
}

/** Finalised BA can no longer be edited by the technician. */
export const isLocked = (r: Pick<PMReport, 'status' | 'synced_to_server'> | null | undefined) => reportStatus(r) !== 'DRAFT';
export const isFinal = (r: Pick<PMReport, 'status' | 'synced_to_server'> | null | undefined) => reportStatus(r) === 'FINAL';

const filled = (v?: string | null) => !!v && v.trim().length > 0;

/** Fields that must be complete before a BA may be finalised. Returns human labels of what's missing. */
export function missingForFinalize(r: PMReport): string[] {
  const miss: string[] = [];
  if (!filled(r.site_name) || !r.site_id) miss.push('Lokasi SPBU');
  if (!filled(r.terminal_id)) miss.push('Terminal POS ID');
  if (!filled(r.technician_name)) miss.push('Nama teknisi');
  if (!filled(r.supervisor_name)) miss.push('Nama pengawas SPBU');

  if (r.work_type === 'CORRECTIVE_REPAIR') {
    const d = r.repair_details;
    if (!d || !filled(d.reported_problem)) miss.push('Keluhan / kerusakan yang dilaporkan');
    if (!d || !filled(d.root_cause)) miss.push('Analisa akar masalah');
    if (!d || !filled(d.action_taken)) miss.push('Tindakan perbaikan');
    if (!d || !filled(d.test_notes)) miss.push('Hasil uji fungsi');
  } else if (r.work_type === 'QUICK_CHECK') {
    if (!r.quick_check_details) miss.push('Checklist pengecekan cepat');
    if (!filled(r.findings_summary)) miss.push('Catatan hasil pengecekan');
  } else {
    if (!filled(r.findings_summary)) miss.push('Ringkasan temuan lapangan');
    if (!filled(r.action_plan)) miss.push('Rencana tindak lanjut');
  }

  if (!filled(r.technician_signature)) miss.push('Tanda tangan teknisi');
  if (!filled(r.supervisor_signature)) miss.push('Tanda tangan pengawas SPBU');
  return miss;
}

/** Signature present (works for full reports and server list summaries). */
export const hasTechnicianSignature = (r: PMReport) => !!r.technician_signature || !!r._has_technician_signature;
export const hasSupervisorSignature = (r: PMReport) => !!r.supervisor_signature || !!r._has_supervisor_signature;

/** Final BA still waiting for the Pengawas validation. */
export const awaitingApproval = (r: PMReport) => isFinal(r) && !r.approval;
