import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { getTursoClient, ensureSchema } from '@/lib/turso';

export const runtime = 'nodejs';

/** Rows visible to this user: sent to them, or to their role (and, for site-bound targets, their SPBU). */
const VISIBLE = `(n.target_user_id = ? OR (n.target_role = ? AND (n.target_site_id IS NULL OR n.target_site_id = ?)))
  AND (n.actor_id IS NULL OR n.actor_id <> ?)
  AND n.created_at >= ?`;

/** GET /api/notifications — latest 30 for the logged-in user + unread count */
export async function GET(req: Request) {
  try {
    const auth = requireSession(req);
    if (auth.error) return auth.error;
    const s = auth.session;
    await ensureSchema();
    const db = getTursoClient();
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const args = [s.id, s.id, s.role, Number(s.assignedSiteId || 0), s.id, since];

    const list = await db.execute({
      sql: `SELECT n.id, n.created_at, n.type, n.title, n.message, n.link_module, n.link_id,
                   (r.notification_id IS NOT NULL) AS is_read
            FROM notifications n
            LEFT JOIN notification_reads r ON r.notification_id = n.id AND r.user_id = ?
            WHERE ${VISIBLE}
            ORDER BY n.created_at DESC LIMIT 30;`,
      args,
    });
    const unread = await db.execute({
      sql: `SELECT COUNT(*) AS c FROM notifications n
            LEFT JOIN notification_reads r ON r.notification_id = n.id AND r.user_id = ?
            WHERE ${VISIBLE} AND r.notification_id IS NULL;`,
      args,
    });

    return NextResponse.json({
      success: true,
      unread: Number(unread.rows[0]?.c || 0),
      notifications: list.rows.map((r) => ({
        id: String(r.id),
        created_at: String(r.created_at),
        type: String(r.type),
        title: String(r.title),
        message: String(r.message),
        link_module: r.link_module ? String(r.link_module) : undefined,
        link_id: r.link_id ? String(r.link_id) : undefined,
        read: Number(r.is_read) === 1,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/** POST /api/notifications { ids: string[] } or { all: true } — mark as read for this user */
export async function POST(req: Request) {
  try {
    const auth = requireSession(req);
    if (auth.error) return auth.error;
    const s = auth.session;
    await ensureSchema();
    const db = getTursoClient();
    const body = await req.json().catch(() => ({}));
    const now = new Date().toISOString();

    let ids: string[] = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 100) : [];
    if (body.all) {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const res = await db.execute({
        sql: `SELECT n.id FROM notifications n WHERE ${VISIBLE};`,
        args: [s.id, s.role, Number(s.assignedSiteId || 0), s.id, since],
      });
      ids = res.rows.map((r) => String(r.id));
    }
    for (const id of ids) {
      await db.execute({
        sql: 'INSERT OR IGNORE INTO notification_reads (notification_id, user_id, read_at) VALUES (?, ?, ?);',
        args: [id, s.id, now],
      });
    }
    return NextResponse.json({ success: true, marked: ids.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
