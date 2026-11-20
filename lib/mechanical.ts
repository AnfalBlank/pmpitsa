/** PM Teknik (mekanikal) checklist: per dispenser + tank/STP area. Shared by form, PDF, laporan. */
import type { MechanicalDispenserCheck, MechanicalPMDetails, MechCheck, SiteDispenserUnit } from './types';

export interface MechItemDef {
  key: string;
  label: string;
  hint: string;
  /** Item includes cleaning (shows a "Sudah dibersihkan" toggle) */
  cleaning?: boolean;
}

export const DISPENSER_ITEMS: MechItemDef[] = [
  { key: 'nozzle', label: 'Nozzle: kondisi & pembersihan', hint: 'Spout tidak penyok, auto shut-off berfungsi, tidak menetes, dibersihkan.', cleaning: true },
  { key: 'swivel', label: 'Swivel: kondisi & pembersihan', hint: 'Berputar lancar, tidak bocor / rembes, dibersihkan.', cleaning: true },
  { key: 'hose', label: 'Selang (hose)', hint: 'Tidak retak, menggelembung, atau terkelupas; panjang & posisi aman.' },
  { key: 'breakaway', label: 'Breakaway coupling', hint: 'Terpasang benar, tidak bocor, belum pernah terlepas / sudah di-reset.' },
  { key: 'check_valve', label: 'Check valve', hint: 'Menahan aliran balik, tekanan stabil, tidak ada kebocoran.' },
  { key: 'filter', label: 'Filter dispenser', hint: 'Tidak tersumbat, aliran normal; ganti bila flow rate turun.' },
  { key: 'sump', label: 'Dispenser sump & area dispenser: pengecekan & pembersihan', hint: 'Sump kering, bebas BBM/air/sampah; area pulau pompa bersih.', cleaning: true },
  { key: 'shear_valve', label: 'Shear / impact valve', hint: 'Terpasang kuat di bawah dispenser, tuas bebas bergerak.' },
  { key: 'leak', label: 'Kebocoran hidraulik & sambungan pipa', hint: 'Pompa, meter, solenoid, dan fitting tidak rembes.' },
];

export const TANK_ITEMS: MechItemDef[] = [
  { key: 'stp', label: 'STP (Submersible Turbine Pump) berfungsi baik', hint: 'Start/stop normal, tekanan line stabil, tidak bising / panas berlebih.' },
  { key: 'leak_detector', label: 'Leak detector line STP', hint: 'Mechanical / electronic leak detector bekerja, tidak ada alarm.' },
  { key: 'tank_sump', label: 'Tank sump / manhole', hint: 'Kering, bebas air & BBM, tutup rapat dan tidak retak.', cleaning: true },
  { key: 'fill_point', label: 'Fill point & spill bucket', hint: 'Tutup rapat, gasket baik, spill bucket bersih dan kering.', cleaning: true },
  { key: 'pv_vent', label: 'Fungsi PV vent (pressure vacuum vent)', hint: 'Katup membuka/menutup normal, tidak tersumbat, pipa vent kokoh.' },
  { key: 'grounding', label: 'Grounding / bonding area tangki & bongkar muat', hint: 'Kabel & klem grounding utuh, tersambung baik.' },
  { key: 'separator', label: 'Oil catcher / separator & drainase', hint: 'Tidak penuh, bebas minyak berlebih, saluran tidak tersumbat.', cleaning: true },
];

const blank = (defs: MechItemDef[]): Record<string, MechCheck> =>
  Object.fromEntries(defs.map((d) => [d.key, { status: 'B', ...(d.cleaning ? { cleaned: false } : {}), notes: '' } as MechCheck]));

export function dispenserCheckFrom(unit: SiteDispenserUnit): MechanicalDispenserCheck {
  return { id: unit.id, label: unit.label, model: unit.model, serial_number: unit.serial_number, items: blank(DISPENSER_ITEMS), notes: '' };
}

export function emptyMechanical(units: SiteDispenserUnit[] = []): MechanicalPMDetails {
  return { dispensers: units.map(dispenserCheckFrom), tank_items: blank(TANK_ITEMS), tank_notes: '' };
}

/** Fill in items added after a draft was created. */
export function normalizeMechanical(m?: MechanicalPMDetails): MechanicalPMDetails {
  const base = emptyMechanical();
  if (!m) return base;
  return {
    ...m,
    dispensers: (m.dispensers || []).map((d) => ({ ...d, items: { ...blank(DISPENSER_ITEMS), ...(d.items || {}) } })),
    tank_items: { ...base.tank_items, ...(m.tank_items || {}) },
  };
}

/** Number of R/X results (for status & laporan). */
export function mechanicalIssues(m?: MechanicalPMDetails): number {
  if (!m) return 0;
  const bad = (c?: MechCheck) => (c && c.status !== 'B' ? 1 : 0);
  return (
    (m.dispensers || []).reduce((n, d) => n + DISPENSER_ITEMS.reduce((k, it) => k + bad(d.items?.[it.key]), 0), 0) +
    TANK_ITEMS.reduce((k, it) => k + bad(m.tank_items?.[it.key]), 0)
  );
}
