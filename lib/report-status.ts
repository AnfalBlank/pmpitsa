/** Lifecycle helpers for Berita Acara (shared by UI and API). */
import type { PMAttachment, PMReport, ReportStatus } from './types';

export function reportStatus(r: Pick<PMReport, 'status' | 'synced_to_server'> | null | undefined): ReportStatus {
  if (!r) return 'DRAFT';
  if (r.status) return r.status;
  return r.synced_to_server ? 'FINAL' : 'DRAFT';
}

/** Finalised BA can no longer be edited by the technician. */
export const isLocked = (r: Pick<PMReport, 'status' | 'synced_to_server'> | null | undefined) => reportStatus(r) !== 'DRAFT';
export const isFinal = (r: Pick<PMReport, 'status' | 'synced_to_server'> | null | undefined) => reportStatus(r) === 'FINAL';

const filled = (v?: string | null) => !!v && v.trim().length > 0;

/** Before/after documentation is mandatory for PM and CM. */
export const REQUIRED_PHOTOS: Partial<Record<PMReport['work_type'], PMAttachment['category'][]>> = {
  PREVENTIVE_MAINTENANCE: ['Sebelum Pemeliharaan', 'Sesudah Pemeliharaan'],
  CORRECTIVE_REPAIR: ['Sebelum Perbaikan', 'Sesudah Perbaikan'],
  MECHANICAL_PM: ['Sebelum Pemeliharaan', 'Sesudah Pemeliharaan'],
};
/** "Lainnya" photos must say what they show (shown as caption in the BA PDF). */
export const needsCaption = (c: PMAttachment['category']) => c === 'Lainnya';
export const hasOwnCaption = (a: Pick<PMAttachment, 'caption' | 'category'>) =>
  filled(a.caption) && a.caption.trim() !== `Foto dokumentasi ${a.category}`;
const hasPhoto = (r: PMReport, c: PMAttachment['category']) => (r.attachments || []).some((a) => a.category === c);

/** Fields that must be complete before a BA may be finalised. Returns human labels of what's missing. */
export function missingForFinalize(r: PMReport): string[] {
  const miss: string[] = [];
  if (!filled(r.site_name) || !r.site_id) miss.push('Lokasi SPBU');
  if (r.work_type !== 'MECHANICAL_PM' && !filled(r.terminal_id)) miss.push('Terminal POS ID');
  if (!filled(r.technician_name)) miss.push('Nama teknisi');
  if (!filled(r.supervisor_name)) miss.push('Nama pengawas SPBU');

  if (r.work_type === 'CORRECTIVE_REPAIR') {
    const d = r.repair_details;
    if (!d || !filled(d.reported_problem)) miss.push('Keluhan / kerusakan yang dilaporkan');
    if (!d || !filled(d.root_cause)) miss.push('Analisa akar masalah');
    if (!d || !filled(d.action_taken)) miss.push('Tindakan perbaikan');
    if (!d || !filled(d.test_notes)) miss.push('Hasil uji fungsi');
    const parts = d?.parts_replaced || [];
    if (parts.some((p) => !filled(p.name) || !filled(p.old_serial) || !filled(p.new_serial)))
      miss.push('Nama barang + SN lama + SN baru untuk setiap barang yang diganti');
    if (!hasPhoto(r, 'Sebelum Perbaikan')) miss.push('Foto sebelum perbaikan');
    if (!hasPhoto(r, 'Sesudah Perbaikan')) miss.push('Foto sesudah perbaikan');
  } else if (r.work_type === 'QUICK_CHECK') {
    if (!r.quick_check_details) miss.push('Checklist pengecekan cepat');
    if (!filled(r.findings_summary)) miss.push('Catatan hasil pengecekan');
  } else {
    if (!filled(r.findings_summary)) miss.push('Ringkasan temuan lapangan');
    if (!filled(r.action_plan)) miss.push('Rencana tindak lanjut');
    if (!hasPhoto(r, 'Sebelum Pemeliharaan')) miss.push('Foto sebelum pemeliharaan');
    if (!hasPhoto(r, 'Sesudah Pemeliharaan')) miss.push('Foto sesudah pemeliharaan');
    if (r.work_type === 'MECHANICAL_PM') {
      const m = r.mechanical;
      const units = m?.dispensers || [];
      if (!units.length) miss.push('Minimal 1 dispenser diperiksa');
      if (units.some((d) => !filled(d.model) || !filled(d.serial_number))) miss.push('Model & serial number setiap dispenser');
      const noNote = [
        ...units.flatMap((d) => Object.values(d.items || {})),
        ...Object.values(m?.tank_items || {}),
      ].filter((c) => c.status !== 'B' && !filled(c.notes)).length;
      if (noNote) miss.push(`Catatan untuk ${noNote} item berstatus R/X`);
    }
  }

  const noCaption = (r.attachments || []).filter((a) => needsCaption(a.category) && !hasOwnCaption(a)).length;
  if (noCaption) miss.push(`Keterangan untuk ${noCaption} foto kategori Lainnya`);

  if (!filled(r.technician_signature)) miss.push('Tanda tangan teknisi');
  if (!filled(r.supervisor_signature)) miss.push('Tanda tangan pengawas SPBU');
  return miss;
}

/** Signature present (works for full reports and server list summaries). */
export const hasTechnicianSignature = (r: PMReport) => !!r.technician_signature || !!r._has_technician_signature;
export const hasSupervisorSignature = (r: PMReport) => !!r.supervisor_signature || !!r._has_supervisor_signature;

/** Final BA still waiting for the Pengawas validation. */
export const awaitingApproval = (r: PMReport) => isFinal(r) && !r.approval;
