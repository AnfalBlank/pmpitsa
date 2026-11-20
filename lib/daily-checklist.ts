/** Daily readiness checklist done by the Pengawas (PWS) before opening the shift. */
import type { TechDivision, TicketCategory } from './types';

export interface DailyCheckItemDef {
  key: string;
  label: string;
  /** Ticket category used when a problem item is turned into a ticket */
  category: TicketCategory;
  /** Division that handles a ticket for this item */
  division: TechDivision;
}

export const DAILY_CHECK_ITEMS: DailyCheckItemDef[] = [
  { key: 'dispenser', label: 'Pemeriksaan visual display dispenser & nozzle bebas tetesan BBM', category: 'Dispenser & Forecourt', division: 'TEKNIK' },
  { key: 'paper', label: 'Kertas struk printer thermal terisi cukup pada POS PINSYST dan EDC', category: 'Printer Struk & Periferal', division: 'IT' },
  { key: 'network', label: 'Konektivitas EDC dan jaringan switch forecourt beroperasi normal', category: 'EDC & Jaringan', division: 'IT' },
  { key: 'safety', label: 'Uji pompa emergency stop dan APAR pemadam api dalam radius siap pakai', category: 'Kelistrikan & Power', division: 'TEKNIK' },
  { key: 'pinsyst', label: 'Software PINSYST dan PINSYST Printer Server terbuka tanpa kendala', category: 'POS Terminal & Software', division: 'IT' },
];

export interface DailyCheckAnswer {
  key: string;
  ok: boolean;
  note?: string;
}

export interface DailyCheck {
  id: string;
  site_id: number;
  site_code: string;
  site_name: string;
  check_date: string; // YYYY-MM-DD (Timor-Leste time)
  submitted_by_id: string;
  submitted_by_name: string;
  submitted_at: string;
  status: 'OK' | 'ISSUE';
  items: DailyCheckAnswer[];
  ticket_numbers: string[];
}

/** Today's date in Timor-Leste (UTC+9), the SPBU's working day. */
export function todayDili(d = new Date()): string {
  return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
