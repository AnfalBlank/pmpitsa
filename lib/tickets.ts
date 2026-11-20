/** Ticket divisions (IT / Teknik) and the damage categories offered for each. */
import type { SPBUTicket, TechDivision, TicketCategory } from './types';

export const DIVISION_LABEL: Record<TechDivision, string> = {
  IT: 'IT (POS, EDC, Jaringan)',
  TEKNIK: 'Teknik (Dispenser, Tangki)',
};

export const DIVISION_SHORT: Record<TechDivision, string> = { IT: 'IT', TEKNIK: 'Teknik' };

export const TICKET_CATEGORIES: Record<TechDivision, { value: TicketCategory; label: string }[]> = {
  IT: [
    { value: 'POS Terminal & Software', label: 'POS Terminal PINSYST & Software' },
    { value: 'Printer Struk & Periferal', label: 'Printer Struk / Printer Laporan / Monitor' },
    { value: 'EDC & Jaringan', label: 'Mesin EDC & Access Point Wi-Fi' },
    { value: 'Dispenser & Forecourt', label: 'Komunikasi Dispenser / FMS / Interface' },
    { value: 'ATG & Tangki Pendam', label: 'Console / Sensor ATG' },
    { value: 'Kelistrikan & Power', label: 'Kelistrikan & UPS' },
    { value: 'Lainnya', label: 'Lainnya' },
  ],
  TEKNIK: [
    { value: 'Dispenser & Forecourt', label: 'Dispenser: nozzle, selang, swivel, breakaway, kebocoran' },
    { value: 'ATG & Tangki Pendam', label: 'Tangki, STP, PV vent, sump' },
    { value: 'Kelistrikan & Power', label: 'Kelistrikan forecourt / pompa' },
    { value: 'Lainnya', label: 'Lainnya (drainase, separator, sipil)' },
  ],
};

export const asDivision = (v: unknown): TechDivision | null => (v === 'IT' || v === 'TEKNIK' ? v : null);

/** Division of a ticket; tickets created before divisions existed are IT. */
export const ticketDivision = (t: Pick<SPBUTicket, 'division'>): TechDivision => t.division || 'IT';

export const categoryAllowed = (division: TechDivision, category: string) =>
  TICKET_CATEGORIES[division].some((c) => c.value === category);
