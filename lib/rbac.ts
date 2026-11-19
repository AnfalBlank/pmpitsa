/**
 * Single source of truth for Role-Based Access Control.
 * Used by the UI (to show/hide/disable actions) AND by the API routes
 * (to reject requests), so both always agree.
 *
 * Matrix:
 *  - ADMIN       : full management (master data, users, schedule, delete), views all sites.
 *                  Does NOT perform field work (PM / quick check / repair).
 *  - SUPERVISOR  : read-only, limited to their own assigned SPBU.
 *                  May only create tickets for their own SPBU.
 *  - TECHNICIAN  : the only role that performs PM / quick check / repair and
 *                  submits Berita Acara. Can create tickets and update ticket status.
 */
import type { UserRole } from './types';

export type Permission =
  | 'pm.perform' // open PM form, start PM/quick check/repair, save draft, submit BA
  | 'report.sync' // save / sync Berita Acara to the server
  | 'report.edit' // revise a finalised Berita Acara
  | 'report.approve' // Pengawas validates a final BA of their own SPBU
  | 'report.delete'
  | 'ticket.create'
  | 'ticket.update' // change status / notes / assignee
  | 'ticket.delete'
  | 'plan.create'
  | 'plan.delete'
  | 'site.manage'
  | 'config.manage'
  | 'user.manage'
  | 'audit.view' // full audit log
  | 'daily.submit' // Pengawas daily readiness checklist
  | 'report.export' // management reports (PM / CM / Pengecekan)
  | 'data.allSites'; // may see data of every SPBU (otherwise only own site)

const MATRIX: Record<UserRole, Permission[]> = {
  ADMIN: [
    'report.edit',
    'report.delete',
    'ticket.create',
    'ticket.update',
    'ticket.delete',
    'plan.create',
    'plan.delete',
    'site.manage',
    'config.manage',
    'user.manage',
    'audit.view',
    'report.export',
    'data.allSites',
  ],
  SUPERVISOR: ['ticket.create', 'report.approve', 'daily.submit'],
  TECHNICIAN: ['pm.perform', 'report.sync', 'ticket.create', 'ticket.update', 'data.allSites'],
};

export function can(role: UserRole | string | undefined | null, perm: Permission): boolean {
  if (!role) return false;
  const list = MATRIX[role as UserRole];
  return !!list && list.includes(perm);
}

/** Site ids this user is restricted to, or null when the user can see every site. */
export function siteScope(user: { role: UserRole | string; assignedSiteId?: number } | null | undefined): number | null {
  if (!user) return -1;
  if (can(user.role, 'data.allSites')) return null;
  return Number(user.assignedSiteId || 0);
}

export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Admin IT Central',
  SUPERVISOR: 'Pengawas SPBU (PWS)',
  TECHNICIAN: 'Teknisi Lapangan POS',
};
