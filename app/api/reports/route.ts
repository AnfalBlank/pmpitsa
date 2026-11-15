import { NextResponse } from 'next/server';
import { getTursoClient, initTursoDatabase } from '@/lib/turso';
import { PMReport } from '@/lib/types';

export async function GET(req: Request) {
  try {
    await initTursoDatabase();
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
      const parsedData: PMReport = JSON.parse(String(row.report_data));
      return NextResponse.json({ success: true, report: parsedData });
    }

    let query = 'SELECT * FROM pm_reports WHERE 1=1';
    const args: any[] = [];

    if (siteId && siteId !== 'ALL') {
      query += ' AND site_id = ?';
      args.push(Number(siteId));
    }

    query += ' ORDER BY execution_date DESC, created_at DESC;';

    const res = await db.execute({ sql: query, args });

    const reports: PMReport[] = res.rows.map(row => {
      try {
        const full: PMReport = JSON.parse(String(row.report_data));
        return full;
      } catch {
        return {
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
          gdrive_pdf_id: row.gdrive_pdf_id ? String(row.gdrive_pdf_id) : undefined,
          created_at: String(row.created_at),
          updated_at: String(row.updated_at),
        } as unknown as PMReport;
      }
    });

    return NextResponse.json({ success: true, reports });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await initTursoDatabase();
    const db = getTursoClient();

    const report: PMReport = await req.json();

    if (!report.id || !report.site_name) {
      return NextResponse.json(
        { success: false, message: 'Data laporan tidak lengkap (ID & Site Name wajib ada).' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const updatedReport: PMReport = {
      ...report,
      synced_to_server: true,
      updated_at: now,
      gdrive_pdf_id: report.gdrive_pdf_id || `GDRIVE-PDF-PITL-${Date.now().toString().slice(-6)}`,
    };

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
      message: 'Berita Acara berhasil disinkronkan ke Database Turso.',
      report: updatedReport,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await initTursoDatabase();
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
