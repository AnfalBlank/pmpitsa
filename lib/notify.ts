/**
 * Server-only: in-app notifications. Each event is stored once per target
 * (a specific user, or a role optionally limited to one SPBU). Failures never
 * break the action that triggered them.
 */
import type { Client } from '@libsql/client';
import type { UserRole } from './types';

export type NotificationType =
  | 'ticket.new'
  | 'ticket.update'
  | 'ticket.assigned'
  | 'plan.new'
  | 'ba.final'
  | 'ba.approved'
  | 'ba.revised'
  | 'daily.issue';

export type NotifyTarget = { userId: string } | { role: UserRole; siteId?: number };

export interface NotifyInput {
  type: NotificationType;
  title: string;
  message: string;
  link_module?: 'tickets' | 'schedule' | 'reports' | 'preview' | 'overview';
  link_id?: string;
  actor_id?: string;
}

const uid = () => `NTF-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Users whose name appears in a free-text field such as "Rizky Ramadhan (FMS-ENG-042)". */
export async function userIdsMentioned(db: Client, text: string | undefined | null, role?: UserRole): Promise<string[]> {
  if (!text) return [];
  const res = await db.execute({
    sql: `SELECT id, name FROM users WHERE ${role ? 'role = ? AND ' : ''}LOWER(?) LIKE '%' || LOWER(name) || '%';`,
    args: role ? [role, text] : [text],
  });
  return res.rows.map((r) => String(r.id));
}

export async function notify(db: Client, input: NotifyInput, targets: NotifyTarget[]): Promise<void> {
  try {
    const seen = new Set<string>();
    const now = new Date().toISOString();
    for (const t of targets) {
      const key = 'userId' in t ? `u:${t.userId}` : `r:${t.role}:${t.siteId ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if ('userId' in t && t.userId === input.actor_id) continue; // never notify yourself
      await db.execute({
        sql: `INSERT INTO notifications (id, created_at, type, title, message, link_module, link_id, target_user_id, target_role, target_site_id, actor_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          uid(),
          now,
          input.type,
          input.title.slice(0, 160),
          input.message.slice(0, 400),
          input.link_module || null,
          input.link_id || null,
          'userId' in t ? t.userId : null,
          'role' in t ? t.role : null,
          'role' in t && t.siteId !== undefined ? t.siteId : null,
          input.actor_id || null,
        ],
      });
    }
  } catch (err) {
    console.warn('notify failed:', err);
  }
}
