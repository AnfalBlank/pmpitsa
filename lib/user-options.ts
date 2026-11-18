/** Dropdown options for people, taken from Manajemen User (+ the SPBU's registered PIC). */
import type { Site } from './types';

export interface UserLite {
  name: string;
  role: string;
  employeeId?: string;
  phone?: string;
  assignedSiteId?: number;
}

export function technicianOptions(users: UserLite[]) {
  return users
    .filter((u) => u.role === 'TECHNICIAN')
    .map((u) => ({ value: u.employeeId ? `${u.name} (${u.employeeId})` : u.name, phone: u.phone }));
}

/** Pengawas of this SPBU first, then other Pengawas, plus the PIC stored on the SPBU. */
export function supervisorOptions(users: UserLite[], site?: Site) {
  const pic = site?.contact_person ? site.contact_person.split(' (')[0] : '';
  const spv = users
    .filter((u) => u.role === 'SUPERVISOR')
    .sort((a, b) => Number(b.assignedSiteId === site?.id) - Number(a.assignedSiteId === site?.id))
    .map((u) => ({ value: u.name, group: u.assignedSiteId === site?.id ? 'Pengawas SPBU ini' : 'Pengawas SPBU lain' }));
  return [...spv, ...(pic && !spv.some((o) => o.value === pic) ? [{ value: pic, group: 'PIC terdaftar di Data SPBU' }] : [])];
}
