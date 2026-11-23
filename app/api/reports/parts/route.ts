import { NextResponse } from 'next/server';
import { requireSession, forbidden } from '@/lib/session';
import { can } from '@/lib/rbac';
import { getTursoClient, ensureSchema } from '@/lib/turso';

export const dynamic = 'force-dynamic';

/** Max characters per chunk accepted (client sends ~240 KB). */
const MAX_CHUNK = 400_000;

/**
 * POST /api/reports/parts { report_id, part_id, idx, total, data }
 * One small chunk of a BA photo / signature (see lib/report-parts.ts).
 */
export async function POST(req: Request) {
  try {
    const auth = requireSession(req);
    if (auth.error) return auth.error;
    const s = auth.session;
    if (!can(s.role, 'report.sync') && !can(s.role, 'report.edit') && !can(s.role, 'pm.perform')) {
      return forbidden('Akses ditolak: hanya Teknisi atau Admin yang dapat mengunggah dokumentasi BA.');
    }
    const body = await req.json().catch(() => null);
    const reportId = String(body?.report_id || '');
    const partId = String(body?.part_id || '');
    const idx = Number(body?.idx);
    const total = Number(body?.total);
    const data = typeof body?.data === 'string' ? body.data : '';
    if (!reportId || !partId || !Number.isInteger(idx) || !Number.isInteger(total) || idx < 0 || total < 1 || idx >= total || total > 200) {
      return NextResponse.json({ success: false, message: 'Potongan dokumentasi tidak valid.' }, { status: 400 });
    }
    if (!data || data.length > MAX_CHUNK) {
      return NextResponse.json({ success: false, message: 'Ukuran potongan dokumentasi tidak valid.' }, { status: 400 });
    }
    await ensureSchema();
    const db = getTursoClient();
    if (idx === 0) {
      // A new upload of this photo starts: forget chunks of an earlier (possibly differently sized) attempt
      await db.execute({ sql: 'DELETE FROM report_parts WHERE report_id = ? AND part_id = ? AND user_id = ?;', args: [reportId, partId, s.id] });
    }
    await db.execute({
      sql: `INSERT INTO report_parts (report_id, part_id, idx, total, data, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(report_id, part_id, idx, user_id) DO UPDATE SET data = excluded.data, total = excluded.total, created_at = excluded.created_at;`,
      args: [reportId, partId, idx, total, data, s.id, new Date().toISOString()],
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
