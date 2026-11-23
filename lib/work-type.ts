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

/** Wording of the shared form / BA parts, so each work type reads as its own activity. */
export const WORK_TYPE_COPY: Record<
  WorkType,
  { siteTitle: string; siteSubtitle: string; terminalLabel: string; terminalPlaceholder: string; terminalRequired: boolean; dateLabel: string; statusSubtitle: string; statusLabel: string; note: string }
> = {
  PREVENTIVE_MAINTENANCE: {
    siteTitle: 'Informasi Site SPBU & Terminal POS',
    siteSubtitle: 'Lokasi pemeliharaan rutin sistem POS PINSYST & FMS',
    terminalLabel: 'ID Terminal / POS',
    terminalPlaceholder: 'Contoh: POS-01',
    terminalRequired: true,
    dateLabel: 'Tanggal Pemeliharaan',
    statusSubtitle: 'Klasifikasi kondisi terminal POS setelah pemeliharaan rutin',
    statusLabel: 'Klasifikasi Kondisi Hasil PM',
    note: 'Data ini menjadi identitas Berita Acara PM. Pastikan ID terminal sesuai stiker fisik pada PC POS.',
  },
  QUICK_CHECK: {
    siteTitle: 'Informasi Site SPBU & Terminal POS',
    siteSubtitle: 'Lokasi pengecekan cepat kesiapan operasional kasir',
    terminalLabel: 'ID Terminal / POS',
    terminalPlaceholder: 'Contoh: POS-01',
    terminalRequired: true,
    dateLabel: 'Tanggal Pengecekan',
    statusSubtitle: 'Kesimpulan kesiapan operasional setelah pengecekan',
    statusLabel: 'Kesimpulan Hasil Pengecekan',
    note: 'Pengecekan tidak menggantikan PM rutin. Temuan yang perlu perbaikan dibuatkan tiket / CM.',
  },
  CORRECTIVE_REPAIR: {
    siteTitle: 'Informasi Site & Perangkat yang Diperbaiki',
    siteSubtitle: 'Lokasi penanganan kerusakan',
    terminalLabel: 'Posisi / Lokasi Perangkat',
    terminalPlaceholder: 'Contoh: POS-01, EDC kasir 2, Dispenser 3',
    terminalRequired: true,
    dateLabel: 'Tanggal Perbaikan',
    statusSubtitle: 'Kondisi perangkat setelah perbaikan selesai',
    statusLabel: 'Status Setelah Perbaikan',
    note: 'Pilih "Perlu Tindak Lanjut" bila perangkat belum normal penuh (mis. menunggu sparepart).',
  },
  MECHANICAL_PM: {
    siteTitle: 'Informasi Site SPBU & Area Forecourt',
    siteSubtitle: 'Lokasi pemeliharaan mekanikal dispenser & tangki',
    terminalLabel: 'Area / Pulau Pompa',
    terminalPlaceholder: 'Contoh: Seluruh forecourt / Pulau pompa 1-2',
    terminalRequired: false,
    dateLabel: 'Tanggal Pemeliharaan',
    statusSubtitle: 'Klasifikasi kondisi dispenser & area tangki setelah pemeliharaan',
    statusLabel: 'Klasifikasi Kondisi Hasil PM Teknik',
    note: 'Data ini menjadi identitas Berita Acara PM Teknik. Dispenser yang diperiksa diambil dari konfigurasi SPBU.',
  },
  MECHANICAL_CHECK: {
    siteTitle: 'Informasi Site SPBU & Area Forecourt',
    siteSubtitle: 'Lokasi pengecekan forecourt & area tangki',
    terminalLabel: 'Area / Pulau Pompa',
    terminalPlaceholder: 'Contoh: Seluruh forecourt',
    terminalRequired: false,
    dateLabel: 'Tanggal Pengecekan',
    statusSubtitle: 'Kesimpulan kesiapan forecourt & area tangki',
    statusLabel: 'Kesimpulan Hasil Pengecekan Teknik',
    note: 'Pengecekan tidak menggantikan PM Teknik. Temuan yang perlu perbaikan dibuatkan tiket / CM.',
  },
};
