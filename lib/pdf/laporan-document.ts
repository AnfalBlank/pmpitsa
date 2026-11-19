/** pdfmake definition for the management reports (landscape A4). */
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import { LOGO_DATA_URL } from './logo';
import { LAPORAN_TITLE, LaporanRow, LaporanSiteRow, LaporanSummary, LaporanType } from '@/lib/laporan';

const NAVY = '#0B2545';
const GREY = '#F1F5F9';
const BORDER = '#CBD5E1';

const grid = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => BORDER,
  vLineColor: () => BORDER,
  paddingTop: () => 3,
  paddingBottom: () => 3,
  paddingLeft: () => 4,
  paddingRight: () => 4,
};

const th = (t: string): TableCell => ({ text: t, bold: true, fillColor: GREY, fontSize: 7.5 });
const statusCell = (s: string): TableCell => ({
  text: s,
  bold: true,
  color: s === 'Selesai (Normal)' ? '#047857' : s === 'Perlu Tindak Lanjut' ? '#B45309' : '#C8102E',
});
const fmtDate = (d: string) => {
  const t = Date.parse(d);
  return Number.isNaN(t) ? d : new Date(t).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dili' });
};

function section(title: string): Content {
  return {
    table: { widths: ['*'], body: [[{ text: title, bold: true, color: '#FFFFFF', fontSize: 8.5 }]] },
    layout: { fillColor: () => NAVY, hLineWidth: () => 0, vLineWidth: () => 0, paddingTop: () => 4, paddingBottom: () => 4 },
    margin: [0, 10, 0, 0],
  };
}

function detailTable(type: LaporanType, rows: LaporanRow[]): Content {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const T = (x: any): Content => x as Content;
  const approval = (r: LaporanRow): TableCell =>
    r.approved_by ? { text: `${r.approved_by}\n${r.approved_at ? fmtDate(r.approved_at) : ''}`, color: '#047857' } : { text: 'Menunggu', color: '#B45309' };
  const head = [th('No. BA'), th('Tanggal'), th('SPBU'), th('Teknisi / Pengawas')];
  if (type === 'PM') {
    return T({
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: [82, 52, 70, 90, 52, 30, '*', '*', 70],
        body: [
          [...head, th('Status'), th('Temuan'), th('Ringkasan temuan'), th('Rencana tindak lanjut'), th('Validasi')],
          ...rows.map((r) => [
            r.ba_number,
            fmtDate(r.date),
            `${r.site_code}\n${r.site_name}`,
            `${r.technician}\nPWS: ${r.supervisor}`,
            statusCell(r.overall_status),
            { text: String(r.issues ?? 0), alignment: 'center' as const },
            r.findings || '-',
            r.action_plan || '-',
            approval(r),
          ]),
        ],
      },
      layout: grid,
      fontSize: 7,
    });
  }
  if (type === 'CM') {
    return T({
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: [76, 48, 62, 80, 50, '*', '*', '*', 60, 34, 62],
        body: [
          [...head, th('Status'), th('Unit / keluhan'), th('Akar masalah'), th('Tindakan'), th('Sparepart'), th('Uji'), th('Validasi')],
          ...rows.map((r) => [
            `${r.ba_number}${r.ticket_number ? `\n${r.ticket_number}` : ''}`,
            fmtDate(r.date),
            `${r.site_code}\n${r.site_name}`,
            `${r.technician}\nPWS: ${r.supervisor}`,
            statusCell(r.overall_status),
            `${r.unit ? `${r.unit}\n` : ''}${r.problem || '-'}`,
            r.root_cause || '-',
            `${r.action_taken || '-'}${r.duration_min != null ? `\n(${r.duration_min} menit)` : ''}`,
            r.sparepart || '-',
            { text: r.test_result || '-', color: r.test_result === 'Baik' ? '#047857' : '#C8102E', bold: true },
            approval(r),
          ]),
        ],
      },
      layout: grid,
      fontSize: 7,
    });
  }
  return T({
    table: {
      headerRows: 1,
      dontBreakRows: true,
      widths: [82, 52, 80, 100, 60, 110, '*', 72],
      body: [
        [...head, th('Status'), th('Item rusak'), th('Catatan'), th('Validasi')],
        ...rows.map((r) => [
          r.ba_number,
          fmtDate(r.date),
          `${r.site_code}\n${r.site_name}`,
          `${r.technician}\nPWS: ${r.supervisor}`,
          statusCell(r.overall_status),
          (r.checks_bad || []).length ? { text: (r.checks_bad || []).join(', '), color: '#C8102E' } : { text: 'Tidak ada', color: '#047857' },
          r.findings || '-',
          approval(r),
        ]),
      ],
    },
    layout: grid,
    fontSize: 7,
  });
}

export function buildLaporanDoc(opts: {
  type: LaporanType;
  periodLabel: string;
  siteLabel: string;
  generatedBy: string;
  rows: LaporanRow[];
  summary: LaporanSummary;
  bySite: LaporanSiteRow[];
}): TDocumentDefinitions {
  const { type, periodLabel, siteLabel, generatedBy, rows, summary, bySite } = opts;
  const generatedAt = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Dili', dateStyle: 'medium', timeStyle: 'short' });

  const boxes: [string, string | number][] = [
    ['Total BA', summary.total],
    ['Selesai (Normal)', summary.normal],
    ['Perlu Tindak Lanjut', summary.follow_up],
    ['Kritis', summary.critical],
    ['Disetujui Pengawas', summary.approved],
    ['Menunggu validasi', summary.pending_approval],
  ];

  const body: Content[] = [
    {
      table: {
        widths: ['*', '*', '*', '*', '*', '*'],
        body: [
          boxes.map(([label]) => ({ text: label, fontSize: 7, color: '#475569', fillColor: GREY })),
          boxes.map(([, v]) => ({ text: String(v), fontSize: 14, bold: true, color: NAVY })),
        ],
      },
      layout: grid,
      margin: [0, 6, 0, 0],
    },
  ];
  if (summary.extra.length) {
    body.push({
      table: { widths: ['*', 120], body: summary.extra.map((e) => [{ text: e.label, fillColor: GREY }, { text: String(e.value), bold: true }]) },
      layout: grid,
      fontSize: 8,
      margin: [0, 6, 0, 0],
    });
  }
  body.push(section('REKAP PER SPBU'));
  body.push({
    table: {
      headerRows: 1,
      widths: [70, '*', 50, 70, 80, 50, 70],
      body: [
        [th('Kode'), th('Nama SPBU'), th('Total'), th('Normal'), th('Tindak lanjut'), th('Kritis'), th('Disetujui')],
        ...(bySite.length
          ? bySite.map((s) => [s.site_code, s.site_name, String(s.total), String(s.normal), String(s.follow_up), String(s.critical), String(s.approved)])
          : [[{ text: 'Tidak ada data pada periode ini', colSpan: 7, italics: true, color: '#64748B' }, '', '', '', '', '', '']]),
      ],
    },
    layout: grid,
    fontSize: 8,
  });
  body.push(section(`RINCIAN BERITA ACARA (${rows.length})`));
  body.push(rows.length ? detailTable(type, rows) : { text: 'Tidak ada Berita Acara final pada periode / SPBU ini.', italics: true, color: '#64748B', margin: [0, 6, 0, 0] });

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [28, 74, 28, 36],
    info: { title: `${LAPORAN_TITLE[type]} - ${periodLabel}`, author: 'Pertamina International Timor, S.A.' },
    header: () => ({
      margin: [28, 18, 28, 0],
      stack: [
        {
          columns: [
            { image: LOGO_DATA_URL, width: 36 },
            {
              width: '*',
              margin: [8, 0, 0, 0],
              stack: [
                { text: 'PERTAMINA INTERNATIONAL TIMOR, S.A.', bold: true, fontSize: 8.5, color: NAVY },
                { text: LAPORAN_TITLE[type].toUpperCase(), bold: true, fontSize: 11 },
                { text: `Periode: ${periodLabel}  ·  SPBU: ${siteLabel}`, fontSize: 7.5, color: '#475569' },
              ],
            },
            { width: 200, alignment: 'right', fontSize: 7, color: '#475569', stack: [{ text: `Dibuat: ${generatedAt}` }, { text: `Oleh: ${generatedBy}` }] },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 6, x2: 786, y2: 6, lineWidth: 1.2, lineColor: NAVY }] },
      ],
    }),
    footer: (page, pages) => ({
      margin: [28, 10, 28, 0],
      columns: [
        { text: `${LAPORAN_TITLE[type]} · ${periodLabel}`, fontSize: 7, color: '#64748B' },
        { text: `Halaman ${page} dari ${pages}`, alignment: 'right', fontSize: 7, color: '#64748B' },
      ],
    }),
    content: body,
    defaultStyle: { font: 'Roboto', fontSize: 8, lineHeight: 1.12, color: '#0F172A' },
  };
}
