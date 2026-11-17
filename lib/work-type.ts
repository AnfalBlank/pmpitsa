import type { WorkType } from './types';

export const WORK_TYPE_TITLE: Record<WorkType, string> = {
  PREVENTIVE_MAINTENANCE: 'BERITA ACARA PREVENTIVE MAINTENANCE (PM)',
  QUICK_CHECK: 'BERITA ACARA PENGECEKAN (QUICK CHECK)',
  CORRECTIVE_REPAIR: 'BERITA ACARA CORRECTIVE MAINTENANCE (CM / PERBAIKAN)',
};

export const WORK_TYPE_SHORT: Record<WorkType, string> = {
  PREVENTIVE_MAINTENANCE: 'PM Rutin',
  QUICK_CHECK: 'Pengecekan',
  CORRECTIVE_REPAIR: 'CM Perbaikan',
};

/** Short code per work type used in BA numbers and Drive names */
export const WORK_TYPE_CODE: Record<WorkType, string> = {
  PREVENTIVE_MAINTENANCE: 'PM',
  CORRECTIVE_REPAIR: 'CM',
  QUICK_CHECK: 'QC',
};

/**
 * Human BA number, e.g. "PM-20261116-K3F9QX", "CM-20261116-K3F9QX", "QC-...".
 * Derived from the internal id so it never changes after finalisation.
 */
export function baNumber(r: { id: string; work_type: WorkType }): string {
  const core = r.id.replace(/^(PM|CM|QC)-/i, '');
  return `${WORK_TYPE_CODE[r.work_type] || 'PM'}-${core}`;
}
