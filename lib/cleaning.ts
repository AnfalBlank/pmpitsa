import type { CleaningChecklist } from './types';

export const CLEANING_ITEMS: { key: keyof Omit<CleaningChecklist, 'notes'>; label: string }[] = [
  { key: 'pc', label: 'Pembersihan hardware PC PINSYST (casing, kipas, ventilasi)' },
  { key: 'printer', label: 'Pembersihan printer (thermal head, roller, auto-cutter)' },
  { key: 'monitor', label: 'Pembersihan monitor PC POS PINSYST' },
  { key: 'disk_cleanup', label: 'Disk cleanup (file sementara, log, recycle bin)' },
  { key: 'pos_area', label: 'Pembersihan debu area POS PINSYST (meja kasir, kabel, perangkat)' },
];

export const EMPTY_CLEANING: CleaningChecklist = { pc: false, printer: false, monitor: false, disk_cleanup: false, pos_area: false, notes: '' };
