import type { WorkType } from './types';

export const WORK_TYPE_TITLE: Record<WorkType, string> = {
  PREVENTIVE_MAINTENANCE: 'BERITA ACARA PREVENTIVE MAINTENANCE (PM)',
  QUICK_CHECK: 'BERITA ACARA PENGECEKAN (QUICK CHECK)',
  CORRECTIVE_REPAIR: 'BERITA ACARA CORRECTIVE MAINTENANCE (CM / PERBAIKAN)',
  MECHANICAL_PM: 'BERITA ACARA PM TEKNIK (DISPENSER & TANGKI)',
  MECHANICAL_CHECK: 'BERITA ACARA PENGECEKAN TEKNIK (FORECOURT & TANGKI)',
};

export const WORK_TYPE_SHORT: Record<WorkType, string> = {
  PREVENTIVE_MAINTENANCE: 'PM Rutin',
  QUICK_CHECK: 'Pengecekan',
  CORRECTIVE_REPAIR: 'CM Perbaikan',
  MECHANICAL_PM: 'PM Teknik',
  MECHANICAL_CHECK: 'Pengecekan Teknik',
};

/** Human label used in lists, badges and buttons */
export const WORK_TYPE_LABEL: Record<WorkType, string> = {
  PREVENTIVE_MAINTENANCE: 'Preventive Maintenance (PM)',
  MECHANICAL_PM: 'PM Teknik (Dispenser & Tangki)',
  MECHANICAL_CHECK: 'Pengecekan Teknik (Forecourt & Tangki)',
  QUICK_CHECK: 'Pengecekan (Quick Check)',
  CORRECTIVE_REPAIR: 'Corrective Maintenance (CM)',
};

/** Short code per work type used in BA numbers and Drive names */
export const WORK_TYPE_CODE: Record<WorkType, string> = {
  PREVENTIVE_MAINTENANCE: 'PM',
  CORRECTIVE_REPAIR: 'CM',
  QUICK_CHECK: 'QC',
  MECHANICAL_PM: 'PMT',
  MECHANICAL_CHECK: 'QCT',
};

/**
 * Human BA number, e.g. "PM-20261116-K3F9QX", "CM-20261116-K3F9QX", "QC-...".
 * Derived from the internal id so it never changes after finalisation.
 */
export function baNumber(r: { id: string; work_type: WorkType }): string {
  const core = r.id.replace(/^(PMT|QCT|PM|CM|QC)-/i, '');
  return `${WORK_TYPE_CODE[r.work_type] || 'PM'}-${core}`;
}

/** Work types a technician of a division may perform (Admin/PWS see all). */
export function workTypesForDivision(division?: 'IT' | 'TEKNIK'): WorkType[] {
  return division === 'TEKNIK'
    ? ['MECHANICAL_PM', 'MECHANICAL_CHECK', 'CORRECTIVE_REPAIR']
    : ['PREVENTIVE_MAINTENANCE', 'QUICK_CHECK', 'CORRECTIVE_REPAIR'];
}
