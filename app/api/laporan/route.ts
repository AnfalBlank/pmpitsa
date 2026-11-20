import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { getTursoClient, ensureSchema } from '@/lib/turso';
import type { PMReport } from '@/lib/types';
import { csvColumns, LAPORAN_TITLE, LAPORAN_WORK_TYPE, LaporanType, summarise, toLaporanRow } from '@/lib/laporan';
import { buildLaporanDoc } from '@/lib/pdf/laporan-document';
import { renderPdf } from '@/lib/pdf/render';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/laporan?type=PM|CM|QC&from=YYYY-MM-DD&to=YYYY-MM-DD&site_id=&format=json|csv|pdf
 * Admin management report built from final Berita Acara.
 */
export async function GET(req: Request) {
  try {
    const auth = requireSession(req, 'report.export');
    if (auth.error) return auth.error;
    await ensureSchema();
    const db = getTursoClient();
    const p = new URL(req.url).searchParams;
    const type = (['PM', 'PMT', 'CM', 'QC', 'QCT'].includes(String(p.get('type'))) ? p.get('type') : 'PM') as LaporanType;
    const from = p.get('from') || '';
    const to = p.get('to') || '';
    const siteId = p.get('site_id') ? Number(p.get('site_id')) : null;
    const format = p.get('format') || 'json';

    const where = ['work_type = ?'];
    const args: any[] = [LAPORAN_WORK_TYPE[type]];
    if (from) {
      where.push('execution_date >= ?');
      args.push(from);
    }
    if (to) {
      where.push('execution_date <= ?');
      args.push(to);
    }
    if (siteId) {
      where.push('site_id = ?');
      args.push(siteId);
    }
    // Photos and signatures are stripped inside the database (fast, small)
    const res = await db.execute({
      sql: `SELECT CASE WHEN json_valid(report_data)
                THEN json_remove(report_data, '$.attachments', '$.technician_signature', '$.supervisor_signature') END AS data
            FROM pm_reports WHERE ${where.join(' AND ')}
            ORDER BY execution_date DESC, created_at DESC;`,
      args,
    });
    const reports: PMReport[] = res.rows
      .map((r) => {
        try {
          return JSON.parse(String(r.data));
        } catch {
          return null;
        }
      })
      .filter((r): r is PMReport => !!r && (r.status === 'FINAL' || (!r.status && r.synced_to_server !== false)));
    const rows = reports.map(toLaporanRow);
    const { summary, bySite } = summarise(type, rows);

    let siteLabel = 'Semua SPBU';
    if (siteId) {
      const s = await db.execute({ sql: 'SELECT site_code, site_name FROM sites WHERE id = ?;', args: [siteId] });
      if (s.rows[0]) siteLabel = `${s.rows[0].site_code} · ${s.rows[0].site_name}`;
    }
    const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const periodLabel = from && to ? `${fmt(from)} – ${fmt(to)}` : from ? `sejak ${fmt(from)}` : to ? `s.d. ${fmt(to)}` : 'Semua waktu';
    const fileBase = `Laporan-${type}_${from || 'awal'}_${to || 'akhir'}${siteId ? `_SPBU-${siteId}` : ''}`;

    if (format === 'csv' || format === 'pdf') {
      await audit(db, req, auth.session, {
        action: 'download_pdf',
        entity_type: 'system',
        entity_label: `${LAPORAN_TITLE[type]} (${format.toUpperCase()})`,
        site_id: siteId,
        summary: `Mengekspor ${LAPORAN_TITLE[type]} ${format.toUpperCase()} · ${periodLabel} · ${siteLabel} · ${rows.length} BA`,
      });
    }

    if (format === 'csv') {
      const cols = csvColumns(type);
      const esc = (v: unknown) => {
        const t = v === null || v === undefined ? '' : String(v);
        return /[",\n;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
      };
      const csv = [
        `${LAPORAN_TITLE[type]};Periode: ${periodLabel};SPBU: ${siteLabel}`,
        '',
        cols.map((c) => esc(c.label)).join(','),
        ...rows.map((r) => cols.map((c) => esc(c.get(r))).join(',')),
      ].join('\n');
      return new NextResponse('﻿' + csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileBase}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    if (format === 'pdf') {
      const pdf = await renderPdf(buildLaporanDoc({ type, periodLabel, siteLabel, generatedBy: auth.session.name, rows, summary, bySite }));
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileBase}.pdf"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    return NextResponse.json({ success: true, type, periodLabel, siteLabel, summary, bySite, rows });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
