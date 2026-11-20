'use client';

import React, { useEffect } from 'react';
import { MasterSelect } from '@/components/ui/MasterSelect';
import { activeOnly, atgLabel, dispenserLabel, useMasterData } from '@/lib/use-master-config';
import { PMReport, CorrectiveRepairDetails, ReplacedPart, Site, TechDivision } from '@/lib/types';
import { StatusSelector } from '../StatusSelector';
import { Search, Wrench, ClipboardCheck, Package, Clock, Ticket, Plus, Trash2 } from 'lucide-react';

export type CorrectiveStep = 'diagnosis' | 'action' | 'test';

interface CorrectiveRepairSectionProps {
  report: PMReport;
  onChange: (updated: PMReport) => void;
  /** Which part of the CM (corrective maintenance) form to show */
  step: CorrectiveStep;
  /** SPBU list (for the dispenser units configured per site) */
  sites?: Site[];
  /** Technician division: Teknik defaults to forecourt categories */
  division?: TechDivision;
}

export const EMPTY_REPAIR_DETAILS: CorrectiveRepairDetails = {
  category: 'Hardware POS',
  reported_problem: '',
  root_cause: '',
  action_taken: '',
  sparepart_replaced: '',
  parts_replaced: [],
  post_repair_status: 'B',
  notes: '',
  affected_unit: '',
  affected_serial: '',
  work_start: '',
  work_end: '',
  test_notes: '',
};

const inputCls =
  'w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600';
const labelCls = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1';

const Card: React.FC<{ icon: React.ElementType; title: string; subtitle: string; children: React.ReactNode }> = ({ icon: Icon, title, subtitle, children }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs">
    <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
      <Icon className="w-5 h-5 text-amber-600 flex-shrink-0" />
      <div>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

export const CorrectiveRepairSection: React.FC<CorrectiveRepairSectionProps> = ({ report, onChange, step, sites = [], division }) => {
  const master = useMasterData();
  // Units registered in master data, grouped by type
  const CAT_LABEL: Record<string, string> = { POS: 'PC / Terminal POS', PRINTER: 'Printer', EDC: 'Mesin EDC', UPS: 'UPS', NETWORK: 'Jaringan' };
  // Dispenser units of this SPBU (model + SN from the site configuration)
  const siteUnits = sites.find((s) => s.id === report.site_id)?.forecourt?.dispensers || [];
  const unitName = (u: { label: string; model: string }) => `${u.label} · ${u.model || 'Dispenser'}`;
  const unitOptions = [
    ...siteUnits.map((u) => ({ value: unitName(u), group: 'Dispenser di SPBU ini' })),
    ...activeOnly(master.hardwareConfigs).map((h) => ({ value: h.brand_model, group: CAT_LABEL[h.category] || h.category })),
    ...activeOnly(master.dispenserBrands).map((b) => ({ value: dispenserLabel(b), group: 'Dispenser' })),
    ...activeOnly(master.atgBrands).map((b) => ({ value: atgLabel(b), group: 'ATG' })),
  ];
  const details: CorrectiveRepairDetails = { ...EMPTY_REPAIR_DETAILS, ...(report.repair_details || {}) };

  const update = <K extends keyof CorrectiveRepairDetails>(key: K, val: CorrectiveRepairDetails[K]) => {
    onChange({ ...report, repair_details: { ...details, [key]: val } });
  };
  const parts: ReplacedPart[] = details.parts_replaced || [];

  // Teknik technicians work on the forecourt: a blank CM starts in that category
  const blankCm = details.category === 'Hardware POS' && !details.reported_problem && !details.affected_unit;
  useEffect(() => {
    if (division === 'TEKNIK' && blankCm) update('category', 'Dispenser & Forecourt');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [division, report.id, blankCm]);
  const setParts = (next: ReplacedPart[]) => update('parts_replaced', next);
  const patchPart = (id: string, patch: Partial<ReplacedPart>) => setParts(parts.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  if (step === 'diagnosis') {
    return (
      <div className="space-y-5">
        {report.ticket_number && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2 text-xs text-amber-900">
            <Ticket className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Perbaikan untuk tiket <strong className="font-mono">{report.ticket_number}</strong>. Dokumen dan foto akan diarsipkan di folder tiket ini.
            </span>
          </div>
        )}
        <Card icon={Search} title="Laporan Kerusakan & Diagnosa" subtitle="Apa yang rusak, gejalanya, dan penyebab teknisnya">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cm-category" className={labelCls}>
                Kategori Komponen <span className="text-red-500">*</span>
              </label>
              <select id="cm-category" value={details.category} onChange={(e) => update('category', e.target.value as any)} className={inputCls}>
                <option value="Hardware POS">Hardware PC & Monitor POS</option>
                <option value="Printer / Scanner">Printer Struk / Auto-Cutter / Scanner</option>
                <option value="Dispenser & Forecourt">Dispenser / Nozzle / Swivel / Breakaway / Interface</option>
                <option value="ATG & Tangki">Tangki / STP / PV Vent / Sensor ATG</option>
                <option value="EDC & Jaringan">Mesin EDC / Access Point Wi-Fi / Router</option>
                <option value="Lainnya">Listrik / UPS / E-Stop / Lainnya</option>
              </select>
            </div>
            <div>
              <label htmlFor="cm-unit" className={labelCls}>
                Unit / Perangkat yang Rusak
              </label>
              <MasterSelect
                id="cm-unit"
                value={details.affected_unit || ''}
                onChange={(v) => {
                  const u = siteUnits.find((x) => unitName(x) === v);
                  onChange({
                    ...report,
                    repair_details: {
                      ...details,
                      affected_unit: v,
                      // A configured dispenser fills its SN; category follows
                      ...(u ? { affected_serial: u.serial_number, category: 'Dispenser & Forecourt' as const } : {}),
                    },
                  });
                }}
                options={unitOptions}
                placeholder="— Pilih unit / perangkat —"
                customPlaceholder="Contoh: Printer Epson TM-T82 kasir 1"
              />
            </div>
          </div>
          <div>
            <label htmlFor="cm-serial" className={labelCls}>
              Serial Number Perangkat
            </label>
            <input
              id="cm-serial"
              type="text"
              value={details.affected_serial || ''}
              onChange={(e) => update('affected_serial', e.target.value)}
              placeholder="SN pada stiker perangkat (bila ada)"
              className={`${inputCls} font-mono`}
            />
          </div>
          <div>
            <label htmlFor="cm-problem" className={labelCls}>
              Keluhan / Gejala Kerusakan <span className="text-red-500">*</span>
            </label>
            <textarea
              id="cm-problem"
              rows={3}
              value={details.reported_problem}
              onChange={(e) => update('reported_problem', e.target.value)}
              placeholder="Gejala yang dilaporkan PWS / kasir, mis. nozzle 2 tidak merespons otorisasi"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="cm-root" className={labelCls}>
              Hasil Diagnosa & Akar Masalah <span className="text-red-500">*</span>
            </label>
            <textarea
              id="cm-root"
              rows={3}
              value={details.root_cause}
              onChange={(e) => update('root_cause', e.target.value)}
              placeholder="Penyebab teknis setelah diperiksa / dibongkar"
              className={inputCls}
            />
          </div>
        </Card>
      </div>
    );
  }

  if (step === 'action') {
    return (
      <Card icon={Wrench} title="Tindakan Perbaikan & Sparepart" subtitle="Pekerjaan yang dilakukan, suku cadang yang diganti, dan durasi pengerjaan">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="cm-start" className={`${labelCls} flex items-center gap-1`}>
              <Clock className="w-3.5 h-3.5" /> Mulai
            </label>
            <input id="cm-start" type="time" value={details.work_start || ''} onChange={(e) => update('work_start', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="cm-end" className={`${labelCls} flex items-center gap-1`}>
              <Clock className="w-3.5 h-3.5" /> Selesai
            </label>
            <input id="cm-end" type="time" value={details.work_end || ''} onChange={(e) => update('work_end', e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label htmlFor="cm-action" className={labelCls}>
            Tindakan Perbaikan yang Dilakukan <span className="text-red-500">*</span>
          </label>
          <textarea
            id="cm-action"
            rows={4}
            value={details.action_taken}
            onChange={(e) => update('action_taken', e.target.value)}
            placeholder="Langkah perbaikan, mis. pembersihan gear cutter, crimping ulang RJ45, kalibrasi probe"
            className={inputCls}
          />
        </div>
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`${labelCls} flex items-center gap-1.5 mb-0`}>
              <Package className="w-4 h-4 text-slate-600" /> Barang yang Diganti (SN lama → SN baru)
            </span>
            <span className="text-[11px] text-slate-500">{parts.length} barang</span>
          </div>
          {parts.length === 0 ? (
            <p className="text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg px-3 py-3">
              Tidak ada barang yang diganti. Tekan &quot;Tambah Barang&quot; bila ada penggantian part / unit.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {parts.map((p, i) => {
                const incomplete = !p.name.trim() || !p.old_serial.trim() || !p.new_serial.trim();
                return (
                  <li key={p.id} className={`rounded-lg border p-3 space-y-2 ${incomplete ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200 bg-slate-50/50'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-700">Barang {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => setParts(parts.filter((x) => x.id !== p.id))}
                        aria-label={`Hapus barang ${i + 1}`}
                        className="min-h-[36px] min-w-[36px] rounded-md text-red-700 hover:bg-red-50 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <label htmlFor={`part-name-${p.id}`} className={labelCls}>Nama Barang / Part</label>
                      <MasterSelect
                        id={`part-name-${p.id}`}
                        value={p.name}
                        onChange={(v) => patchPart(p.id, { name: v })}
                        options={unitOptions}
                        placeholder="Pilih / ketik nama barang"
                        className={inputCls}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label htmlFor={`part-old-${p.id}`} className={labelCls}>SN Barang Lama</label>
                        <input id={`part-old-${p.id}`} value={p.old_serial} onChange={(e) => patchPart(p.id, { old_serial: e.target.value })} placeholder="SN yang dilepas" className={`${inputCls} font-mono`} />
                      </div>
                      <div>
                        <label htmlFor={`part-new-${p.id}`} className={labelCls}>SN Barang Baru</label>
                        <input id={`part-new-${p.id}`} value={p.new_serial} onChange={(e) => patchPart(p.id, { new_serial: e.target.value })} placeholder="SN yang dipasang" className={`${inputCls} font-mono`} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setParts([...parts, { id: `PRT-${Date.now()}`, name: details.affected_unit || '', old_serial: details.affected_serial || '', new_serial: '' }])}
            className="mt-2 min-h-[44px] px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Tambah Barang
          </button>
        </div>
        <div>
          <label htmlFor="cm-parts" className={labelCls}>Catatan Sparepart (opsional)</label>
          <textarea
            id="cm-parts"
            rows={2}
            value={details.sparepart_replaced}
            onChange={(e) => update('sparepart_replaced', e.target.value)}
            placeholder="Jumlah, part number, asal stok, dsb."
            className={inputCls}
          />
        </div>
      </Card>
    );
  }

  return (
    <Card icon={ClipboardCheck} title="Uji Fungsi Setelah Perbaikan" subtitle="Bukti perangkat kembali normal sebelum diserahkan ke PWS">
      <div>
        <span className={labelCls}>Hasil Uji Fungsi</span>
        <StatusSelector value={details.post_repair_status} onChange={(val) => update('post_repair_status', val)} />
        <span className="text-[11px] text-slate-500 mt-1 block">B: Normal kembali · R: Masih terkendala · X: Menunggu sparepart</span>
      </div>
      <div>
        <label htmlFor="cm-test" className={labelCls}>
          Uraian Uji Fungsi <span className="text-red-500">*</span>
        </label>
        <textarea
          id="cm-test"
          rows={3}
          value={details.test_notes || ''}
          onChange={(e) => update('test_notes', e.target.value)}
          placeholder="Contoh: Uji 5x cetak struk berturut-turut normal, transaksi nozzle 2 berhasil"
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor="cm-notes" className={labelCls}>
          Rekomendasi ke PWS / Tindak Lanjut
        </label>
        <textarea
          id="cm-notes"
          rows={2}
          value={details.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Instruksi pemakaian, jadwal pantau ulang, atau part yang perlu dipesan"
          className={inputCls}
        />
      </div>
    </Card>
  );
};
