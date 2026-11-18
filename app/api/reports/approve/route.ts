import { NextResponse } from 'next/server';
import { requireSession, forbidden } from '@/lib/session';
import { siteScope } from '@/lib/rbac';
import { getTursoClient, ensureSchema } from '@/lib/turso';
import { isDriveConfigured } from '@/lib/gdrive';
import { archiveReportToDrive } from '@/lib/ba-archive';
import type { PMReport, ReportApproval } from '@/lib/types';
import { notify, userIdsMentioned } from '@/lib/notify';
import { baNumber } from '@/lib/work-type';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/reports/approve { id }
 * The Pengawas (supervisor) of the BA's own SPBU validates a final Berita Acara.
 * The approval is stored inside report_data with json_set (no need to move the
 * photos around), then the Drive PDF is refreshed so it carries the stamp.
 */
export async function POST(req: Request) {
  try {
    const auth = requireSession(req, 'report.approve');
    if (auth.error) return auth.error;
    const session = auth.session;

    const { id } = await req.json().catch(() => ({}));
    if (!id) return NextResponse.json({ success: false, message: 'ID Berita Acara wajib disertakan.' }, { status: 400 });

    await ensureSchema();
    const db = getTursoClient();
    const res = await db.execute({
      sql: `SELECT site_id,
              json_extract(report_data, '$.approval') AS approval,
              json_extract(report_data, '$.status') AS status,
              synced_to_server
            FROM pm_reports WHERE id = ? LIMIT 1;`,
      args: [id],
    });
    if (!res.rows.length) return NextResponse.json({ success: false, message: 'Berita Acara tidak ditemukan.' }, { status: 404 });
    const row = res.rows[0];

    const scope = siteScope(session);
    if (scope !== null && Number(row.site_id) !== scope) {
      return forbidden('Akses ditolak: Anda hanya dapat memvalidasi Berita Acara SPBU Anda sendiri.');
    }
    if (row.approval) {
      return NextResponse.json({
        success: true,
        alreadyApproved: true,
        message: 'Berita Acara ini sudah divalidasi.',
        approval: JSON.parse(String(row.approval)),
      });
    }

    const approval: ReportApproval = { status: 'APPROVED', by: session.name, by_id: session.id, at: new Date().toISOString() };
    await db.execute({
      sql: `UPDATE pm_reports SET report_data = json_set(report_data, '$.approval', json(?)), updated_at = ? WHERE id = ?;`,
      args: [JSON.stringify(approval), approval.at, id],
    });

    {
      const info = await db.execute({
        sql: `SELECT json_extract(report_data, '$.technician_name') AS tech, json_extract(report_data, '$.work_type') AS wt, site_code FROM pm_reports WHERE id = ?;`,
        args: [id],
      });
      const r = info.rows[0];
      const techIds = await userIdsMentioned(db, r?.tech ? String(r.tech) : '', 'TECHNICIAN');
      await notify(
        db,
        {
          type: 'ba.approved',
          title: `BA ${baNumber({ id, work_type: (r?.wt as any) || 'PREVENTIVE_MAINTENANCE' })} disetujui`,
          message: `${r?.site_code || ''} · divalidasi oleh ${session.name}`,
          link_module: 'preview',
          link_id: id,
          actor_id: session.id,
        },
        [...techIds.map((userId) => ({ userId })), { role: 'ADMIN' }]
      );
    }

    // Refresh the archived PDF so it shows the approval stamp (best effort)
    let driveUpdated = false;
    if (isDriveConfigured()) {
      try {
        const full = await db.execute({ sql: 'SELECT report_data FROM pm_reports WHERE id = ? LIMIT 1;', args: [id] });
        const report: PMReport = JSON.parse(String(full.rows[0].report_data));
        const gdrive = await archiveReportToDrive(report);
        await db.execute({
          sql: `UPDATE pm_reports SET report_data = json_set(report_data, '$.gdrive', json(?), '$.gdrive_pdf_id', ?), gdrive_pdf_id = ? WHERE id = ?;`,
          args: [JSON.stringify(gdrive), gdrive.pdf_file_id, gdrive.pdf_file_id, id],
        });
        driveUpdated = true;
      } catch {
        // approval is stored; Drive can be refreshed later from the preview
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berita Acara disetujui oleh ${session.name}.`,
      approval,
      driveUpdated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
