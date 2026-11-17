import { NextResponse } from 'next/server';
import { requireSession, forbidden } from '@/lib/session';
import { can, siteScope } from '@/lib/rbac';
import { missingForFinalize } from '@/lib/report-status';
import { getTursoClient, ensureSchema } from '@/lib/turso';
import { PMReport } from '@/lib/types';

export async function GET(req: Request) {
  try {
    const auth = requireSession(req);
    if (auth.error) return auth.error;
    const session = auth.session;
    const scope = siteScope(session);
    await ensureSchema();
    const db = getTursoClient();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const siteId = searchParams.get('site_id');

    if (id) {
      const res = await db.execute({
        sql: 'SELECT * FROM pm_reports WHERE id = ? LIMIT 1;',
        args: [id],
      });

      if (res.rows.length === 0) {
        return NextResponse.json({ success: false, message: 'Laporan tidak ditemukan' }, { status: 404 });
      }

      const row = res.rows[0];
      if (scope !== null && Number(row.site_id) !== scope) {
        return forbidden('Akses ditolak: Berita Acara ini bukan milik SPBU Anda.');
      }
      const parsedData: PMReport = JSON.parse(String(row.report_data));
      return NextResponse.json({ success: true, report: parsedData });
    }

    // List = light summaries. Photos and signatures (often hundreds of KB per BA)
    // are stripped inside the database so the list stays fast; the full BA is
    // loaded with ?id=... when it is opened.
    let query = `SELECT id, work_type, site_id, site_code, site_name, terminal_id, execution_date,
        technician_name, technician_phone, supervisor_name, overall_status, findings_summary,
        action_plan_summary, gdrive_pdf_id, created_at, updated_at,
        CASE WHEN json_valid(report_data)
          THEN json_remove(report_data, '$.attachments', '$.technician_signature', '$.supervisor_signature') END AS summary,
        CASE WHEN json_valid(report_data) THEN COALESCE(json_array_length(report_data, '$.attachments'), 0) ELSE 0 END AS att_count,
        (COALESCE(technician_signature, '') <> '') AS has_ts,
        (COALESCE(supervisor_signature, '') <> '') AS has_ss
      FROM pm_reports WHERE 1=1`;
    const args: any[] = [];

    if (scope !== null) {
      // Supervisor: always restricted to own SPBU regardless of query params
      query += ' AND site_id = ?';
      args.push(scope);
    } else if (siteId && siteId !== 'ALL') {
      query += ' AND site_id = ?';
      args.push(Number(siteId));
    }

    query += ' ORDER BY execution_date DESC, created_at DESC;';

    const res = await db.execute({ sql: query, args });

    const reports: PMReport[] = res.rows.map((row) => {
      let base: PMReport;
      try {
        base = JSON.parse(String(row.summary));
      } catch {
        base = {
          id: String(row.id),
          work_type: row.work_type as any,
          site_id: Number(row.site_id),
          site_code: String(row.site_code),
          site_name: String(row.site_name),
          terminal_id: String(row.terminal_id),
          execution_date: String(row.execution_date),
          technician_name: String(row.technician_name),
          technician_phone: String(row.technician_phone),
          supervisor_name: String(row.supervisor_name),
          overall_status: row.overall_status as any,
          findings_summary: String(row.findings_summary || ''),
          action_plan: String(row.action_plan_summary || ''),
          synced_to_server: true,
          created_at: String(row.created_at),
          updated_at: String(row.updated_at),
        } as unknown as PMReport;
      }
      return {
        ...base,
        attachments: [],
        technician_signature: undefined,
        supervisor_signature: undefined,
        synced_to_server: true,
        _summary: true,
        _attachments_count: Number(row.att_count || 0),
        _has_technician_signature: Number(row.has_ts) === 1 || !!base.technician_signed_at,
        _has_supervisor_signature: Number(row.has_ss) === 1 || !!base.supervisor_signed_at,
      };
    });

    return NextResponse.json({ success: true, reports });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = requireSession(req);
    if (auth.error) return auth.error;
    const session = auth.session;
    await ensureSchema();
    const db = getTursoClient();

    const report: PMReport = await req.json();

    if (!report.id || !report.site_name) {
      return NextResponse.json(
        { success: false, message: 'Data laporan tidak lengkap (ID & Site Name wajib ada).' },
        { status: 400 }
      );
    }
    if (report._summary) {
      // A list summary has no photos/signatures; saving it would wipe them
      return NextResponse.json(
        { success: false, code: 'INCOMPLETE', message: 'Data Berita Acara belum termuat lengkap. Muat ulang dokumen lalu coba lagi.' },
        { status: 400 }
      );
    }

    const prev = await db.execute({ sql: 'SELECT report_data FROM pm_reports WHERE id = ? LIMIT 1;', args: [report.id] });
    let existing: PMReport | null = null;
    if (prev.rows.length) {
      try {
        existing = JSON.parse(String(prev.rows[0].report_data));
      } catch {
        existing = { id: report.id } as PMReport;
      }
    }

    const now = new Date().toISOString();
    let updatedReport: PMReport;

    if (!existing) {
      // First finalisation: technician only, and the BA must be complete
      if (!can(session.role, 'report.sync')) {
        return forbidden('Akses ditolak: hanya Teknisi yang dapat memfinalisasi Berita Acara.');
      }
      const missing = missingForFinalize(report);
      if (missing.length) {
        return NextResponse.json(
          { success: false, code: 'INCOMPLETE', message: `Berita Acara belum lengkap: ${missing.join(', ')}.` },
          { status: 400 }
        );
      }
      updatedReport = {
        ...report,
        status: 'FINAL',
        synced_to_server: true,
        finalized_at: now,
        finalized_by: session.name,
        revision: 1,
        revision_log: [],
        approval: undefined,
        updated_at: now,
        gdrive: undefined,
        gdrive_pdf_id: undefined,
      };
    } else if (can(session.role, 'report.edit')) {
      // Admin revision of a finalised BA
      const revision = (existing.revision || 1) + 1;
      updatedReport = {
        ...report,
        status: 'FINAL',
        synced_to_server: true,
        finalized_at: existing.finalized_at || existing.created_at || now,
        finalized_by: existing.finalized_by || existing.technician_name,
        revision,
        revision_log: [
          ...(existing.revision_log || []),
          {
            at: now,
            by: session.name,
            note: `Revisi ${revision} oleh Admin${existing.approval ? ' (validasi Pengawas direset, perlu disetujui ulang)' : ''}`,
          },
        ],
        approval: undefined,
        updated_at: now,
        gdrive: existing.gdrive,
        gdrive_pdf_id: existing.gdrive?.pdf_file_id || existing.gdrive_pdf_id,
      };
    } else if (
      can(session.role, 'report.sync') &&
      (Number(existing.site_id) !== Number(report.site_id) || existing.created_at !== report.created_at)
    ) {
      return NextResponse.json(
        { success: false, code: 'ID_CONFLICT', message: 'Nomor Berita Acara bentrok dengan dokumen lain. Buat Berita Acara baru lalu kirim ulang.' },
        { status: 409 }
      );
    } else if (can(session.role, 'report.sync')) {
      // Technician re-sending an already stored BA (e.g. retry after a timeout):
      // never overwrite, just confirm what is on the server.
      return NextResponse.json({
        success: true,
        alreadyFinal: true,
        message: 'Berita Acara ini sudah difinalisasi dan tersimpan di server. Perubahan hanya dapat dilakukan oleh Admin.',
        report: { ...existing, status: 'FINAL', synced_to_server: true },
      });
    } else {
      return forbidden('Akses ditolak: Berita Acara yang sudah difinalisasi hanya dapat diubah oleh Admin.');
    }

    const reportJson = JSON.stringify(updatedReport);

    await db.execute({
      sql: `INSERT INTO pm_reports (
              id, work_type, site_id, site_code, site_name, terminal_id,
              execution_date, technician_name, technician_phone, supervisor_name,
              overall_status, findings_summary, action_plan_summary,
              technician_signature, technician_signed_at, supervisor_signature,
              supervisor_signed_at, report_data, synced_to_server, gdrive_pdf_id,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              work_type = excluded.work_type,
              site_id = excluded.site_id,
              site_code = excluded.site_code,
              site_name = excluded.site_name,
              terminal_id = excluded.terminal_id,
              execution_date = excluded.execution_date,
              technician_name = excluded.technician_name,
              technician_phone = excluded.technician_phone,
              supervisor_name = excluded.supervisor_name,
              overall_status = excluded.overall_status,
              findings_summary = excluded.findings_summary,
              action_plan_summary = excluded.action_plan_summary,
              technician_signature = excluded.technician_signature,
              technician_signed_at = excluded.technician_signed_at,
              supervisor_signature = excluded.supervisor_signature,
              supervisor_signed_at = excluded.supervisor_signed_at,
              report_data = excluded.report_data,
              synced_to_server = 1,
              gdrive_pdf_id = excluded.gdrive_pdf_id,
              updated_at = excluded.updated_at;`,
      args: [
        updatedReport.id,
        updatedReport.work_type,
        updatedReport.site_id,
        updatedReport.site_code,
        updatedReport.site_name,
        updatedReport.terminal_id,
        updatedReport.execution_date,
        updatedReport.technician_name,
        updatedReport.technician_phone,
        updatedReport.supervisor_name,
        updatedReport.overall_status,
        updatedReport.findings_summary,
        updatedReport.action_plan,
        updatedReport.technician_signature || null,
        updatedReport.technician_signed_at || null,
        updatedReport.supervisor_signature || null,
        updatedReport.supervisor_signed_at || null,
        reportJson,
        1,
        updatedReport.gdrive_pdf_id || null,
        updatedReport.created_at || now,
        now,
      ],
    });

    return NextResponse.json({
      success: true,
      message: existing ? 'Revisi Berita Acara tersimpan.' : 'Berita Acara difinalisasi dan tersimpan di server.',
      report: updatedReport,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = requireSession(req, 'report.delete');
    if (auth.error) return auth.error;
    const session = auth.session;
    await ensureSchema();
    const db = getTursoClient();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID laporan wajib disertakan.' }, { status: 400 });
    }

    await db.execute({
      sql: 'DELETE FROM pm_reports WHERE id = ?;',
      args: [id],
    });

    return NextResponse.json({ success: true, message: `Laporan #${id} berhasil dihapus dari database.` });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
