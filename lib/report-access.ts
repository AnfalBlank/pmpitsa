/**
 * Who may see a Berita Acara (shared by API routes and the UI):
 *  - ADMIN: every BA
 *  - SUPERVISOR (Pengawas): BA of their own SPBU (needed to validate them)
 *  - TECHNICIAN: only the BA they made themselves
 */
import type { PMReport, UserRole } from './types';

interface Viewer {
  id: string;
  name: string;
  role: UserRole | string;
  assignedSiteId?: number;
}

/** BA made by this user. Older BA have no created_by_id: fall back to the technician name. */
export function isReportOwner(r: Pick<PMReport, 'created_by_id' | 'technician_name'>, user: Pick<Viewer, 'id' | 'name'>): boolean {
  if (r.created_by_id) return r.created_by_id === user.id;
  return !!user.name && String(r.technician_name || '').toLowerCase().includes(user.name.toLowerCase());
}

export function canViewReport(r: Pick<PMReport, 'created_by_id' | 'technician_name' | 'site_id'>, user: Viewer): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'SUPERVISOR') return Number(r.site_id) === Number(user.assignedSiteId);
  return isReportOwner(r, user);
}

/** SQL condition (on pm_reports) limiting a technician to their own BA. */
export const OWN_REPORT_SQL =
  "(json_extract(report_data, '$.created_by_id') = ? OR (json_extract(report_data, '$.created_by_id') IS NULL AND LOWER(technician_name) LIKE ?))";
export const ownReportArgs = (user: Pick<Viewer, 'id' | 'name'>) => [user.id, `%${user.name.toLowerCase()}%`];
