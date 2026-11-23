import { NextResponse } from 'next/server';
import { resolveReportParts } from '@/lib/report-parts';
import { audit } from '@/lib/audit';
import { baNumber } from '@/lib/work-type';
import { requireSession, forbidden } from '@/lib/session';
import { siteScope } from '@/lib/rbac';
import { canViewReport } from '@/lib/report-access';
import { getTursoClient, ensureSchema } from '@/lib/turso';
import { renderBaPdf } from '@/lib/pdf/render';
import { baFileName } from '@/lib/pdf/ba-document';
import type { PMReport } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

function pdfResponse(report: PMReport, pdf: Buffer) {
  const name = baFileName(report);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  });
}

/** GET /api/reports/pdf?id=... — PDF of a report stored on the server */
export async function GET(req: Request) {
  try {
    const auth = requireSession(req);
    if (auth.error) return auth.error;
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: 'ID laporan wajib disertakan.' }, { status: 400 });

    await ensureSchema();
    const res = await getTursoClient().execute({ sql: 'SELECT site_id, report_data FROM pm_reports WHERE id = ? LIMIT 1;', args: [id] });
    if (!res.rows.length) return NextResponse.json({ success: false, message: 'Berita Acara belum tersimpan di server.' }, { status: 404 });

    const scope = siteScope(auth.session);
    if (scope !== null && Number(res.rows[0].site_id) !== scope) {
      return forbidden('Akses ditolak: Berita Acara ini bukan milik SPBU Anda.');
    }
    const report: PMReport = JSON.parse(String(res.rows[0].report_data));
    if (!canViewReport(report, auth.session)) {
      return forbidden('Akses ditolak: Berita Acara ini dibuat oleh teknisi lain.');
    }
    const pdf = await renderBaPdf(report);
    await audit(getTursoClient(), req, auth.session, {
      action: 'download_pdf',
      entity_type: 'report',
      entity_id: report.id,
      entity_label: `BA ${baNumber(report)} · ${report.site_code}`,
      site_id: Number(report.site_id),
      summary: 'Mengunduh PDF Berita Acara',
    });
    return pdfResponse(report, pdf);
  } catch (err: any) {
    return NextResponse.json({ success: false, message: `Gagal membuat PDF: ${err.message}` }, { status: 500 });
  }
}

/** POST /api/reports/pdf — PDF of a draft report sent in the body (technician only) */
export async function POST(req: Request) {
  try {
    const auth = requireSession(req, 'pm.perform');
    if (auth.error) return auth.error;
    const incoming: PMReport = await req.json();
    if (!incoming?.id || !incoming.site_name) {
      return NextResponse.json({ success: false, message: 'Data laporan tidak lengkap.' }, { status: 400 });
    }
    // Photos may be uploaded as chunks first (see lib/report-parts.ts); they stay for the later submit
    await ensureSchema();
    const { report } = await resolveReportParts(getTursoClient(), incoming, auth.session.id);
    return pdfResponse(report, await renderBaPdf(report));
  } catch (err: any) {
    return NextResponse.json({ success: false, message: `Gagal membuat PDF: ${err.message}` }, { status: 500 });
  }
}
