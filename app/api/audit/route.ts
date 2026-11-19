import { NextResponse } from 'next/server';
import { requireSession, forbidden } from '@/lib/session';
import { can, siteScope } from '@/lib/rbac';
import { getTursoClient, ensureSchema } from '@/lib/turso';

export const runtime = 'nodejs';

/**
 * GET /api/audit
 *  - Admin: full log, filters: q, user, action, entity_type, entity_id, site_id, from, to, limit, offset, format=csv
 *  - Others: only the history of one Berita Acara they can see (entity_type=report&entity_id=...)
 */
export async function GET(req: Request) {
  try {
    const auth = requireSession(req);
    if (auth.error) return auth.error;
    const s = auth.session;
    await ensureSchema();
    const db = getTursoClient();
    const p = new URL(req.url).searchParams;

    const entityType = p.get('entity_type') || '';
    const entityId = p.get('entity_id') || '';
    const isAdmin = can(s.role, 'audit.view');

    if (!isAdmin) {
      // Per-document history only
      if (entityType !== 'report' || !entityId) return forbidden('Akses ditolak: audit log lengkap hanya untuk Admin.');
      const scope = siteScope(s);
      if (scope !== null) {
        const r = await db.execute({ sql: 'SELECT site_id FROM audit_logs WHERE entity_type = ? AND entity_id = ? LIMIT 1;', args: ['report', entityId] });
        const site = r.rows[0]?.site_id;
        if (site !== undefined && site !== null && Number(site) !== scope) return forbidden('Akses ditolak: BA ini bukan milik SPBU Anda.');
      }
    }

    const where: string[] = [];
    const args: any[] = [];
    if (entityType) {
      where.push('entity_type = ?');
      args.push(entityType);
    }
    if (entityId) {
      where.push('entity_id = ?');
      args.push(entityId);
    }
    if (isAdmin) {
      const user = p.get('user');
      const action = p.get('action');
      const site = p.get('site_id');
      const from = p.get('from');
      const to = p.get('to');
      const q = (p.get('q') || '').trim().toLowerCase();
      if (user) {
        where.push('user_id = ?');
        args.push(user);
      }
      if (action) {
        where.push('action = ?');
        args.push(action);
      }
      if (site) {
        where.push('site_id = ?');
        args.push(Number(site));
      }
      if (from) {
        where.push('at >= ?');
        args.push(`${from}T00:00:00`);
      }
      if (to) {
        where.push('at <= ?');
        args.push(`${to}T23:59:59.999Z`);
      }
      if (q) {
        where.push("(LOWER(summary) LIKE ? OR LOWER(COALESCE(entity_label,'')) LIKE ? OR LOWER(COALESCE(user_name,'')) LIKE ? OR LOWER(COALESCE(entity_id,'')) LIKE ?)");
        const t = `%${q}%`;
        args.push(t, t, t, t);
      }
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const csv = p.get('format') === 'csv' && isAdmin;
    const limit = csv ? 5000 : Math.min(200, Math.max(1, Number(p.get('limit')) || 50));
    const offset = csv ? 0 : Math.max(0, Number(p.get('offset')) || 0);

    const rows = await db.execute({
      sql: `SELECT id, at, user_id, user_name, user_role, action, entity_type, entity_id, entity_label, site_id, summary, details, ip, user_agent
            FROM audit_logs ${whereSql} ORDER BY at DESC LIMIT ? OFFSET ?;`,
      args: [...args, limit, offset],
    });
    const items = rows.rows.map((r) => ({
      id: String(r.id),
      at: String(r.at),
      user_id: r.user_id ? String(r.user_id) : null,
      user_name: r.user_name ? String(r.user_name) : null,
      user_role: r.user_role ? String(r.user_role) : null,
      action: String(r.action),
      entity_type: String(r.entity_type),
      entity_id: r.entity_id ? String(r.entity_id) : null,
      entity_label: r.entity_label ? String(r.entity_label) : null,
      site_id: r.site_id === null || r.site_id === undefined ? null : Number(r.site_id),
      summary: String(r.summary),
      details: r.details ? safeJson(String(r.details)) : null,
      // network details only for Admin
      ip: isAdmin && r.ip ? String(r.ip) : null,
      user_agent: isAdmin && r.user_agent ? String(r.user_agent) : null,
    }));

    if (csv) {
      const head = ['waktu_utc', 'pengguna', 'peran', 'aksi', 'objek', 'id_objek', 'label', 'site_id', 'ringkasan', 'ip', 'detail'];
      const esc = (v: unknown) => {
        const t = v === null || v === undefined ? '' : typeof v === 'string' ? v : JSON.stringify(v);
        return /[",\n;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
      };
      const body = [head.join(','), ...items.map((i) => [i.at, i.user_name, i.user_role, i.action, i.entity_type, i.entity_id, i.entity_label, i.site_id, i.summary, i.ip, i.details].map(esc).join(','))].join('\n');
      return new NextResponse('﻿' + body, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const total = isAdmin ? Number((await db.execute({ sql: `SELECT COUNT(*) AS c FROM audit_logs ${whereSql};`, args })).rows[0]?.c || 0) : items.length;
    return NextResponse.json({ success: true, items, total });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
