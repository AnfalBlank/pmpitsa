import { NextResponse } from 'next/server';
import { audit } from '@/lib/audit';
import { baNumber } from '@/lib/work-type';
import { requireSession, forbidden } from '@/lib/session';
import { can } from '@/lib/rbac';
import { getTursoClient, ensureSchema } from '@/lib/turso';
import { isDriveConfigured } from '@/lib/gdrive';
import { archiveReportToDrive, baFolderSegments } from '@/lib/ba-archive';
import type { PMReport } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** GET /api/reports/drive — is the Google Drive archive configured on the server? */
export async function GET(req: Request) {
  const auth = requireSession(req);
  if (auth.error) return auth.error;
  return NextResponse.json({ success: true, configured: isDriveConfigured() });
}

/**
 * POST /api/reports/drive { id } — uploads the stored BA PDF + photos to Drive
 * and saves the Drive links back into the report. Technician (after submit) or Admin (re-upload).
 */
export async function POST(req: Request) {
  try {
    const auth = requireSession(req);
    if (auth.error) return auth.error;
    if (!can(auth.session.role, 'report.sync') && !can(auth.session.role, 'report.delete')) {
      return forbidden('Akses ditolak: hanya Teknisi atau Admin yang dapat mengunggah Berita Acara ke Google Drive.');
    }
    if (!isDriveConfigured()) {
      return NextResponse.json(
        { success: false, code: 'DRIVE_NOT_CONFIGURED', message: 'Google Drive belum dikonfigurasi di server. Hubungi Admin.' },
        { status: 503 }
      );
    }

    const { id } = await req.json().catch(() => ({}));
    if (!id) return NextResponse.json({ success: false, message: 'ID laporan wajib disertakan.' }, { status: 400 });

    await ensureSchema();
    const db = getTursoClient();
    const res = await db.execute({ sql: 'SELECT report_data FROM pm_reports WHERE id = ? LIMIT 1;', args: [id] });
    if (!res.rows.length) {
      return NextResponse.json({ success: false, message: 'Berita Acara belum tersimpan di server. Sinkronkan dulu.' }, { status: 404 });
    }

    const report: PMReport = JSON.parse(String(res.rows[0].report_data));
    const gdrive = await archiveReportToDrive(report);
    const updated: PMReport = { ...report, gdrive, gdrive_pdf_id: gdrive.pdf_file_id };

    await db.execute({
      sql: 'UPDATE pm_reports SET report_data = ?, gdrive_pdf_id = ?, updated_at = ? WHERE id = ?;',
      args: [JSON.stringify(updated), gdrive.pdf_file_id, new Date().toISOString(), id],
    });

    await audit(db, req, auth.session, {
      action: 'archive_drive',
      entity_type: 'report',
      entity_id: id,
      entity_label: `BA ${baNumber(report)} · ${report.site_code}`,
      site_id: Number(report.site_id),
      summary: `Mengarsipkan BA ke Google Drive (${gdrive.folder_path})`,
      details: { pdf: gdrive.pdf_file_name, photos: Object.keys(gdrive.photos || {}).length, folder: gdrive.folder_url },
    });

    return NextResponse.json({
      success: true,
      message: `Berita Acara tersimpan di Google Drive: ${baFolderSegments(report).join(' / ')}`,
      gdrive,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
