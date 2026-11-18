/**
 * Builds the pdfmake document definition for an official Berita Acara (BA).
 * Pure function (no I/O) so it can be rendered on the server.
 */
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { ChecklistStatus, PMReport, WorkType } from '@/lib/types';
import { LOGO_DATA_URL } from './logo';
import { WORK_TYPE_TITLE, WORK_TYPE_SHORT, baNumber } from '@/lib/work-type';

const NAVY = '#0B2545';
const RED = '#C8102E';
const GREY = '#F1F5F9';
const BORDER = '#94A3B8';

export { WORK_TYPE_TITLE, WORK_TYPE_SHORT };

const WORK_TYPE_CODE: Record<WorkType, string> = {
  PREVENTIVE_MAINTENANCE: 'BA-PM',
  QUICK_CHECK: 'BA-QC',
  CORRECTIVE_REPAIR: 'BA-CR',
};

export function baDocNumber(report: PMReport): string {
  const year = new Date(report.execution_date).getFullYear() || new Date().getFullYear();
  return `${WORK_TYPE_CODE[report.work_type] || 'BA-PM'}/PITL-PINSYST-FMS/${year}/${baNumber(report)}`;
}

/** BA file base name (no extension), e.g. BA_CM-20261116-K3F9QX_PITL-001_2026-11-16 */
export function baFileBase(report: PMReport): string {
  return ['BA', baNumber(report), report.site_code, report.execution_date]
    .filter(Boolean)
    .join('_')
    .replace(/[^A-Za-z0-9._-]+/g, '-');
}

export function baFileName(report: PMReport): string {
  return `${baFileBase(report)}.pdf`;
}

const STATUS_TEXT: Record<string, string> = { B: 'Baik', R: 'Rusak', X: 'Tidak Ada' };
const STATUS_COLOR: Record<string, string> = { B: '#047857', R: RED, X: '#475569' };

function st(status: ChecklistStatus | string | undefined): TableCell {
  const s = status || '-';
  return {
    text: STATUS_TEXT[s] ? `${s} · ${STATUS_TEXT[s]}` : s,
    bold: true,
    color: STATUS_COLOR[s] || '#0F172A',
    alignment: 'center',
  };
}

const v = (x: unknown, fallback = '-') => (x === undefined || x === null || x === '' ? fallback : String(x));

function sectionTitle(text: string): Content {
  return {
    table: { widths: ['*'], body: [[{ text, style: 'sectionTitle' }]] },
    layout: { fillColor: () => NAVY, hLineWidth: () => 0, vLineWidth: () => 0, paddingTop: () => 4, paddingBottom: () => 4 },
    margin: [0, 10, 0, 0],
  };
}

const gridLayout = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => BORDER,
  vLineColor: () => BORDER,
  paddingTop: () => 3,
  paddingBottom: () => 3,
  paddingLeft: () => 4,
  paddingRight: () => 4,
};

/** 4-column label/value grid */
function kvTable(rows: [string, unknown, string, unknown][]): Content {
  return {
    table: {
      widths: ['22%', '28%', '22%', '28%'],
      body: rows.map(([l1, v1, l2, v2]) => [
        { text: l1, style: 'label' },
        { text: v(v1) },
        { text: l2, style: 'label' },
        { text: v(v2) },
      ]),
    },
    layout: gridLayout,
  };
}

/** Checklist table: component / status / notes */
function checkTable(rows: [string, ChecklistStatus | string | undefined, string][]): Content {
  return {
    table: {
      headerRows: 1,
      widths: ['30%', '16%', '54%'],
      body: [
        [
          { text: 'Komponen / Parameter', style: 'th' },
          { text: 'Status', style: 'th', alignment: 'center' },
          { text: 'Spesifikasi & Catatan', style: 'th' },
        ],
        ...rows.map(([label, status, note]) => [{ text: label, bold: true }, st(status), { text: v(note) }]),
      ],
    },
    layout: gridLayout,
  };
}

function headerTable(headers: string[], widths: (string | number)[], body: TableCell[][]): Content {
  return {
    table: {
      headerRows: 1,
      widths,
      body: [headers.map((h) => ({ text: h, style: 'th' })), ...body],
      dontBreakRows: true,
    },
    layout: gridLayout,
  };
}

/** JPEG/PNG data URL whose bytes really are JPEG/PNG (a corrupt image would abort the whole PDF). */
function isEmbeddableImage(dataUrl?: string): boolean {
  const m = /^data:image\/(jpeg|jpg|png);base64,([A-Za-z0-9+/=]{8})/i.exec(dataUrl || '');
  if (!m) return false;
  const head = Buffer.from(m[2], 'base64');
  const jpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const png = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  return jpeg || png;
}

function generalSection(r: PMReport): Content[] {
  const rows: [string, unknown, string, unknown][] = [
    ['Nama SPBU', r.site_name, 'Kode Site', r.site_code],
    ['Terminal POS ID', r.terminal_id, 'Tanggal / Jam', `${v(r.execution_date)} ${r.execution_time || ''}`.trim()],
    ['Teknisi Pelaksana', `${v(r.technician_name)}${r.technician_phone ? ` (${r.technician_phone})` : ''}`, 'Pengawas SPBU', r.supervisor_name],
    r.work_type === 'PREVENTIVE_MAINTENANCE'
      ? ['Status Akhir', r.overall_status, 'PM Berikutnya', r.next_pm_recommendation_date]
      : ['Status Akhir', r.overall_status, 'Jenis Pekerjaan', WORK_TYPE_SHORT[r.work_type]],
  ];
  if (r.ticket_number) rows.push(['Nomor Tiket', r.ticket_number, '', '']);
  if (r.status === 'FINAL' || r.finalized_at) {
    const at = r.finalized_at ? new Date(r.finalized_at).toLocaleString('id-ID', { timeZone: 'Asia/Dili' }) : '-';
    rows.push(['Status Dokumen', `FINAL${r.revision && r.revision > 1 ? ` · Revisi ${r.revision}` : ''}`, 'Difinalisasi', at]);
    rows.push([
      'Validasi Pengawas',
      r.approval ? `DISETUJUI oleh ${r.approval.by}` : 'Menunggu validasi',
      'Tanggal Validasi',
      r.approval ? fmtDili(r.approval.at) : '-',
    ]);
  }
  return [sectionTitle('I. DATA UMUM & LOKASI'), kvTable(rows)];
}

function repairSection(r: PMReport): Content[] {
  const d = r.repair_details;
  if (!d) return [];
  const row = (label: string, value: unknown): TableCell[] => [{ text: label, style: 'label' }, v(value)];
  const duration = d.work_start && d.work_end ? `${d.work_start} – ${d.work_end}` : v(d.work_start || d.work_end);
  return [
    sectionTitle('II. LAPORAN KERUSAKAN & DIAGNOSA'),
    {
      table: {
        widths: ['30%', '70%'],
        body: [
          row('Kategori Komponen', d.category),
          row('Unit / Perangkat', d.affected_unit),
          row('Serial Number', d.affected_serial),
          row('Keluhan / Gejala', d.reported_problem),
          row('Diagnosa & Akar Masalah', d.root_cause),
        ],
      },
      layout: gridLayout,
    },
    sectionTitle('III. TINDAKAN PERBAIKAN & SPAREPART'),
    {
      table: {
        widths: ['30%', '70%'],
        body: [row('Waktu Pengerjaan', duration), row('Tindakan Perbaikan', d.action_taken), row('Sparepart Diganti', d.sparepart_replaced)],
      },
      layout: gridLayout,
    },
    sectionTitle('IV. UJI FUNGSI SETELAH PERBAIKAN'),
    {
      table: {
        widths: ['30%', '70%'],
        body: [
          [{ text: 'Hasil Uji Fungsi', style: 'label' }, { ...(st(d.post_repair_status) as object), alignment: 'left' } as TableCell],
          row('Uraian Uji Fungsi', d.test_notes),
          row('Rekomendasi / Tindak Lanjut', d.notes),
        ],
      },
      layout: gridLayout,
    },
  ];
}

function quickCheckSection(r: PMReport): Content[] {
  const q = r.quick_check_details;
  if (!q) return [];
  return [
    sectionTitle('II. HASIL PENGECEKAN CEPAT'),
    checkTable([
      ['Sistem POS Online', q.pos_system_online, ''],
      ['Komunikasi Dispenser', q.dispenser_communication, ''],
      ['EDC Siap Transaksi', q.edc_transaction_ready, ''],
      ['Monitor ATG / Tangki', q.atg_tank_monitor, ''],
      ['Printer Thermal', q.printer_thermal_status, ''],
    ]),
    { text: [{ text: 'Catatan: ', bold: true }, v(q.general_notes)], margin: [0, 4, 0, 0] },
  ];
}

function softwareSection(r: PMReport, no: string): Content[] {
  const s = r.software;
  return [
    sectionTitle(`${no}. INVENTARIS SOFTWARE & SISTEM OPERASI`),
    kvTable([
      ['POS PINSYST', s.pos_pinsyst_version, 'Printer Server', s.printer_server_version],
      ['Modul Export', s.export_module_version, 'Modul IMEX', s.imex_module_version],
      ['Sistem Operasi', s.operating_system, 'Backup DB Lokal', STATUS_TEXT[s.database_backup_status] || s.database_backup_status],
    ]),
    ...(s.notes ? [{ text: [{ text: 'Catatan: ', bold: true }, s.notes], margin: [0, 4, 0, 0] } as Content] : []),
  ];
}

function hardwareSection(r: PMReport, no: string): Content[] {
  const h = r.hardware;
  return [
    sectionTitle(`${no}. HARDWARE POS`),
    kvTable([
      ['Merk / Model PC', h.pc_brand_model, 'CPU', h.cpu],
      ['RAM', `${v(h.ram_gb)} GB`, 'Storage', `${v(h.storage_type)} ${v(h.storage_capacity_gb)} GB (sisa ${v(h.storage_free_gb)} GB)`],
    ]),
    { text: '', margin: [0, 3, 0, 0] },
    checkTable([
      ['Kebersihan Kipas', h.fan_cleanliness, ''],
      ['Kondisi Heatsink', h.heatsink_condition, ''],
      ['Sirkulasi Udara', h.airflow_condition, h.notes],
    ]),
  ];
}

function peripheralsSection(r: PMReport, no: string): Content[] {
  const p = r.peripherals;
  return [
    sectionTitle(`${no}. PERIFERAL KASIR`),
    checkTable([
      ['Display & Touchscreen', p.display_touchscreen.status, p.display_touchscreen.notes],
      [
        'Printer Struk',
        p.receipt_printer.status,
        `Thermal head: ${STATUS_TEXT[p.receipt_printer.thermal_head] || '-'}, Auto cutter: ${STATUS_TEXT[p.receipt_printer.auto_cutter] || '-'}. ${p.receipt_printer.notes || ''}`,
      ],
      ['Barcode Scanner', p.barcode_scanner.status, p.barcode_scanner.notes],
      ['Cash Drawer', p.cash_drawer.status, p.cash_drawer.notes],
    ]),
  ];
}

function networkSection(r: PMReport, no: string): Content[] {
  const n = r.network_power;
  return [
    sectionTitle(`${no}. JARINGAN, KELISTRIKAN & KESELAMATAN`),
    kvTable([
      ['IP Address', n.ip_address, 'Subnet / Gateway', `${v(n.subnet_mask)} / ${v(n.gateway)}`],
      ['DNS', n.dns, 'Latensi Ping', `${v(n.ping_latency_ms)} ms`],
      ['Tegangan P-N', `${v(n.voltage_pn)} V`, 'Tegangan P-G', `${v(n.voltage_pg)} V`],
      ['Tegangan N-G', `${v(n.voltage_ng)} V (std < 2 V)`, 'Suhu Ruangan', `${v(n.room_temp_celsius)} °C`],
      ['UPS', n.ups_model, 'Backup UPS', `${v(n.ups_backup_time_min)} menit`],
    ]),
    { text: '', margin: [0, 3, 0, 0] },
    checkTable([
      ['Kabel UTP', n.utp_cable_status, ''],
      ['Switch / Router', n.switch_router_status, ''],
      ['Uji Shutdown UPS', n.ups_shutdown_test, ''],
      ['APAR', n.apar_safety_status, ''],
      ['Tombol E-Stop', n.emergency_stop_status, n.notes],
    ]),
  ];
}

function forecourtSection(r: PMReport, no: string): Content[] {
  const f = r.forecourt;
  const out: Content[] = [
    sectionTitle(`${no}. FORECOURT, DISPENSER & ATG`),
    kvTable([
      ['Jumlah Pump', f.nozzles?.length ? new Set(f.nozzles.map((n) => n.pump_number)).size : f.dispenser_count, 'Total Nozzle', f.nozzles?.length ?? f.total_nozzles],
      ['Merk ATG', f.atg_brand, 'Merk Dispenser', f.dispenser_brand],
      ['Controller ATG', STATUS_TEXT[f.atg_controller_status] || f.atg_controller_status, '', ''],
      ['Interface Dispenser', STATUS_TEXT[f.dispenser_interface_box] || f.dispenser_interface_box, 'Segel Tera Metrologi', STATUS_TEXT[f.metrology_seal_status] || f.metrology_seal_status],
    ]),
  ];
  if (f.tanks?.length) {
    out.push(
      { text: 'Tangki Pendam', style: 'subTitle' },
      headerTable(
        ['Tangki', 'Produk', 'Kapasitas', 'Level', 'Water', 'Suhu'],
        ['14%', '*', '16%', '15%', '15%', '15%'],
        f.tanks.map((t) => [
          t.notes ? { stack: [t.tank_number, { text: t.notes, fontSize: 7, color: '#B45309' }] } : t.tank_number,
          t.product_name,
          { text: `${Number(t.capacity_liters || 0).toLocaleString('id-ID')} L`, alignment: 'right' },
          st(t.level_sensor_status),
          st(t.water_sensor_status),
          st(t.temp_sensor_status),
        ])
      )
    );
  }
  if (f.nozzles?.length) {
    out.push(
      { text: 'Nozzle Dispenser', style: 'subTitle' },
      headerTable(
        ['Pompa', 'Nozzle', 'Produk', 'Status', 'Totalisator'],
        ['12%', '12%', '*', '18%', '24%'],
        [...f.nozzles].sort((a, b) => a.pump_number - b.pump_number || a.nozzle_number - b.nozzle_number).map((nz) => [
          { text: String(nz.pump_number), alignment: 'center' },
          { text: String(nz.nozzle_number), alignment: 'center' },
          nz.notes ? { stack: [nz.product_name, { text: nz.notes, fontSize: 7, color: '#B45309' }] } : nz.product_name,
          st(nz.status),
          { text: v(nz.meter_reading), alignment: 'right' },
        ])
      )
    );
  }
  return out;
}

function edcSection(r: PMReport, no: string): Content[] {
  if (!r.edc_list?.length) return [];
  return [
    sectionTitle(`${no}. MESIN EDC`),
    headerTable(
      ['Merk / Tipe', 'Serial Number', 'Fisik', 'Koneksi', 'Catatan'],
      ['22%', '22%', '14%', '14%', '*'],
      r.edc_list.map((e) => [e.brand_type, { text: e.serial_number, bold: true }, st(e.physical_status), st(e.connection_status), v(e.notes)])
    ),
  ];
}

function featuresSection(r: PMReport, no: string): Content[] {
  if (!r.features_checklist?.length) return [];
  const color = (s: string) => (s === 'OK' ? '#047857' : s === 'ISSUE' ? RED : '#475569');
  return [
    sectionTitle(`${no}. PEMERIKSAAN FITUR POS PINSYST`),
    headerTable(
      ['Kode', 'Fitur', 'Status', 'Temuan / Tindakan'],
      ['8%', '36%', '10%', '*'],
      r.features_checklist.map((f) => [
        { text: f.code, alignment: 'center' },
        f.title,
        { text: f.status, bold: true, color: color(f.status), alignment: 'center' },
        [f.findings, f.corrective_action].filter(Boolean).join(' — ') || '-',
      ])
    ),
  ];
}

function findingsSection(r: PMReport, no: string): Content[] {
  const isPM = r.work_type === 'PREVENTIVE_MAINTENANCE';
  return [
    sectionTitle(`${no}. ${isPM ? 'CATATAN TEMUAN & RENCANA TINDAK LANJUT' : 'CATATAN & TINDAK LANJUT'}`),
    {
      table: {
        widths: ['25%', '75%'],
        body: [
          [{ text: isPM ? 'Temuan Lapangan' : 'Catatan', style: 'label' }, v(r.findings_summary)],
          [{ text: 'Rencana Tindak Lanjut', style: 'label' }, v(r.action_plan)],
        ],
      },
      layout: gridLayout,
    },
  ];
}

function svgFromDataUrl(dataUrl?: string): string | null {
  const m = /^data:image\/svg\+xml(;base64)?(?:;[^,]*)?,([\s\S]*)$/i.exec(dataUrl || '');
  if (!m) return null;
  try {
    return m[1] ? Buffer.from(m[2], 'base64').toString('utf8') : decodeURIComponent(m[2]);
  } catch {
    return null;
  }
}

function signatureImage(signature?: string): Content {
  if (isEmbeddableImage(signature)) return { image: signature!, fit: [170, 60], alignment: 'center', margin: [0, 0, 0, 2] };
  const svg = svgFromDataUrl(signature);
  if (svg) return { svg, fit: [170, 60], alignment: 'center', margin: [0, 0, 0, 2] } as Content;
  return { text: '(belum ditandatangani)', italics: true, color: '#94A3B8', alignment: 'center', margin: [0, 22, 0, 22] };
}

const GREEN = '#047857';

const fmtDili = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { timeZone: 'Asia/Dili', dateStyle: 'medium', timeStyle: 'short' });

/** Green "DISETUJUI" stamp for the Pengawas validation */
function approvalStamp(approval: NonNullable<PMReport['approval']>): Content {
  return {
    table: {
      widths: [150],
      body: [
        [
          {
            stack: [
              { text: 'DISETUJUI', bold: true, fontSize: 12, color: GREEN, alignment: 'center', characterSpacing: 2 },
              { text: 'Pengawas SPBU', fontSize: 7, color: GREEN, alignment: 'center' },
              { text: approval.by, bold: true, fontSize: 8.5, color: GREEN, alignment: 'center', margin: [0, 1, 0, 0] },
              { text: fmtDili(approval.at), fontSize: 7, color: GREEN, alignment: 'center' },
            ],
            margin: [4, 3, 4, 3],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 2,
      vLineWidth: () => 2,
      hLineColor: () => GREEN,
      vLineColor: () => GREEN,
    },
    alignment: 'center',
    margin: [62, 6, 0, 0],
  };
}

function signatureBlock(title: string, name: string, signature?: string, signedAt?: string, approval?: PMReport['approval']): Content {
  return {
    stack: [
      { text: title, bold: true, alignment: 'center', margin: [0, 0, 0, 4] },
      signatureImage(signature),
      { canvas: [{ type: 'line', x1: 20, y1: 0, x2: 220, y2: 0, lineWidth: 0.5, lineColor: '#0F172A' }] },
      { text: v(name), bold: true, alignment: 'center', margin: [0, 3, 0, 0] },
      { text: signedAt ? `Ditandatangani: ${signedAt}` : '', fontSize: 7.5, color: '#64748B', alignment: 'center' },
      ...(approval ? [approvalStamp(approval)] : []),
    ],
  };
}

function signOffSection(r: PMReport, no: string): Content[] {
  return [
    sectionTitle(`${no}. LEMBAR PENGESAHAN`),
    {
      text: 'Dengan ini kedua belah pihak menyatakan bahwa pekerjaan di atas telah dilaksanakan dan diperiksa sesuai kondisi sebenarnya.',
      margin: [0, 6, 0, 10],
      fontSize: 8.5,
    },
    {
      columns: [
        signatureBlock('Teknisi Pelaksana', r.technician_name, r.technician_signature, r.technician_signed_at),
        signatureBlock('Pengawas SPBU', r.supervisor_name, r.supervisor_signature, r.supervisor_signed_at, r.approval),
      ],
      columnGap: 20,
    },
  ];
}

function photosSection(r: PMReport): Content[] {
  const photos = (r.attachments || []).filter((a) => isEmbeddableImage(a.file_url));
  if (!photos.length) return [];
  const cells: Content[] = photos.map((a, i) => ({
    stack: [
      { image: a.file_url, fit: [245, 185], alignment: 'center' },
      { text: `Foto ${i + 1}. ${a.caption || a.file_name}`, bold: true, fontSize: 8, margin: [0, 3, 0, 0] },
      { text: `${a.category} · ${a.uploaded_at}`, fontSize: 7.5, color: '#64748B' },
    ],
    margin: [0, 0, 0, 10],
    unbreakable: true,
  }));
  const rows: Content[] = [];
  for (let i = 0; i < cells.length; i += 2) {
    rows.push({ columns: [cells[i], cells[i + 1] || { text: '' }], columnGap: 14 });
  }
  return [{ text: '', pageBreak: 'before' }, sectionTitle('LAMPIRAN — DOKUMENTASI FOTO'), { text: '', margin: [0, 6, 0, 0] }, ...rows];
}

export function buildBaDocDefinition(report: PMReport): TDocumentDefinitions {
  const docNo = baDocNumber(report);
  const roman = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  let idx = 0;
  const next = () => roman[idx++] || String(idx + 1);

  const body: Content[] = [...generalSection(report)];
  if (report.work_type === 'CORRECTIVE_REPAIR') {
    body.push(...repairSection(report));
    idx = 3;
  } else if (report.work_type === 'QUICK_CHECK') {
    body.push(...quickCheckSection(report));
    idx = 1;
  } else {
    body.push(
      ...softwareSection(report, next()),
      ...hardwareSection(report, next()),
      ...peripheralsSection(report, next()),
      ...networkSection(report, next()),
      ...forecourtSection(report, next()),
      ...edcSection(report, next()),
      ...featuresSection(report, next())
    );
  }
  const findings = findingsSection(report, roman[idx] || '');
  if (findings.length) {
    body.push(...findings);
    idx++;
  }
  body.push(...signOffSection(report, next()), ...photosSection(report));

  return {
    pageSize: 'A4',
    pageMargins: [36, 92, 36, 44],
    info: { title: `${WORK_TYPE_TITLE[report.work_type]} - ${report.site_name}`, author: 'Pertamina International Timor, S.A.', subject: docNo },
    header: () => ({
      margin: [36, 22, 36, 0],
      stack: [
        {
          columns: [
            { image: LOGO_DATA_URL, width: 44 },
            {
              width: '*',
              margin: [8, 2, 0, 0],
              stack: [
                { text: [{ text: 'PERTAMINA ', color: RED, bold: true }, { text: 'INTERNATIONAL TIMOR, S.A.', color: NAVY, bold: true }], fontSize: 10 },
                { text: WORK_TYPE_TITLE[report.work_type], bold: true, fontSize: 10.5, margin: [0, 1, 0, 0] },
                { text: 'Sistem POS PINSYST & Fuel Management System (FMS) SPBU', fontSize: 7.5, color: '#475569' },
              ],
            },
            {
              width: 170,
              alignment: 'right',
              fontSize: 7.5,
              stack: [
                { text: docNo, bold: true },
                { text: `${report.site_code} · ${report.site_name}`, color: '#475569' },
                { text: `${v(report.execution_date)} ${report.execution_time || ''}`, color: '#475569' },
              ],
            },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 6, x2: 523, y2: 6, lineWidth: 1.5, lineColor: NAVY }] },
      ],
    }),
    footer: (currentPage, pageCount) => ({
      margin: [36, 12, 36, 0],
      columns: [
        { text: `${docNo}`, fontSize: 7, color: '#64748B' },
        { text: `Halaman ${currentPage} dari ${pageCount}`, alignment: 'right', fontSize: 7, color: '#64748B' },
      ],
    }),
    content: body,
    defaultStyle: { font: 'Roboto', fontSize: 8.5, lineHeight: 1.15, color: '#0F172A' },
    styles: {
      sectionTitle: { bold: true, color: '#FFFFFF', fontSize: 8.5, margin: [2, 0, 0, 0] },
      subTitle: { bold: true, fontSize: 8.5, color: NAVY, margin: [0, 6, 0, 3] },
      th: { bold: true, fillColor: GREY, fontSize: 8 },
      label: { bold: true, fillColor: GREY, color: '#334155' },
    },
  };
}
