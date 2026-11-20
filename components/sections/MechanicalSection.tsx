'use client';

import React, { useEffect, useState } from 'react';
import { Fuel, Gauge, Plus, Trash2, ChevronDown, ChevronUp, Sparkles, AlertTriangle, Info } from 'lucide-react';
import type { MechanicalDispenserCheck, MechanicalPMDetails, MechCheck, PMReport, Site, SiteDispenserUnit } from '@/lib/types';
import { DISPENSER_ITEMS, TANK_ITEMS, MechItemDef, dispenserCheckFrom, emptyMechanical, normalizeMechanical } from '@/lib/mechanical';
import { activeOnly, dispenserLabel, useMasterData } from '@/lib/use-master-config';
import { MasterSelect } from '@/components/ui/MasterSelect';
import { AutoTextarea } from '@/components/ui/AutoTextarea';
import { StatusSelector } from '../StatusSelector';

const inputCls =
  'w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-600';
const labelCls = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1';

/** One B/R/X row; cleaning toggle when relevant, note required for R/X. */
const CheckRow: React.FC<{ def: MechItemDef; value: MechCheck; idPrefix: string; onChange: (v: MechCheck) => void }> = ({ def, value, idPrefix, onChange }) => {
  const bad = value.status !== 'B';
  return (
    <li className={`rounded-lg border p-3 space-y-2 ${bad ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200'}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{def.label}</p>
          <p className="text-[11px] text-slate-500">{def.hint}</p>
        </div>
        <div className="sm:w-48 flex-shrink-0">
          <StatusSelector size="sm" value={value.status} onChange={(status) => onChange({ ...value, status })} />
        </div>
      </div>
      {def.cleaning && (
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 min-h-[36px]">
          <input type="checkbox" checked={!!value.cleaned} onChange={(e) => onChange({ ...value, cleaned: e.target.checked })} className="w-4 h-4 rounded" />
          <Sparkles className="w-3.5 h-3.5 text-slate-500" /> Sudah dibersihkan
        </label>
      )}
      {(bad || value.notes) && (
        <div>
          <label htmlFor={`${idPrefix}-${def.key}-note`} className="sr-only">Catatan {def.label}</label>
          <AutoTextarea
            id={`${idPrefix}-${def.key}-note`}
            value={value.notes || ''}
            onChange={(e) => onChange({ ...value, notes: e.target.value })}
            placeholder={bad ? 'Wajib: jelaskan temuan & tindakan' : 'Catatan (opsional)'}
            className={`${inputCls} text-xs ${bad && !(value.notes || '').trim() ? 'border-amber-400' : ''}`}
          />
        </div>
      )}
    </li>
  );
};

interface Props {
  report: PMReport;
  onChange: (r: PMReport) => void;
  sites: Site[];
  step: 'dispenser' | 'tank';
}

export const MechanicalSection: React.FC<Props> = ({ report, onChange, sites, step }) => {
  const master = useMasterData();
  const site = sites.find((s) => s.id === report.site_id);
  const units: SiteDispenserUnit[] = site?.forecourt?.dispensers || [];
  const m: MechanicalPMDetails = normalizeMechanical(report.mechanical);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pick, setPick] = useState('');

  // New PM Teknik: pre-fill every dispenser registered for this SPBU
  useEffect(() => {
    if (!report.mechanical) onChange({ ...report, mechanical: emptyMechanical(units) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.id, report.mechanical == null]);

  const set = (patch: Partial<MechanicalPMDetails>) => onChange({ ...report, mechanical: { ...m, ...patch } });
  const setDisp = (id: string, patch: Partial<MechanicalDispenserCheck>) =>
    set({ dispensers: m.dispensers.map((d) => (d.id === id ? { ...d, ...patch } : d)) });

  const modelOptions = activeOnly(master.dispenserBrands).map((b) => ({ value: dispenserLabel(b) }));
  const notAdded = units.filter((u) => !m.dispensers.some((d) => d.id === u.id));
  const fromConfig = (id: string) => units.some((u) => u.id === id);

  if (step === 'tank') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-2 border-b border-slate-100 pb-3">
          <Gauge className="w-5 h-5 text-blue-800 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Area Tangki, STP & PV Vent</h2>
            <p className="text-xs text-slate-500">STP, leak detector, sump tangki, fill point, PV vent, grounding, dan separator</p>
          </div>
        </div>
        <ul className="space-y-2.5">
          {TANK_ITEMS.map((def) => (
            <CheckRow key={def.key} def={def} idPrefix="tank" value={m.tank_items[def.key]} onChange={(v) => set({ tank_items: { ...m.tank_items, [def.key]: v } })} />
          ))}
        </ul>
        <div>
          <label htmlFor="tank-notes" className={labelCls}>Catatan area tangki</label>
          <AutoTextarea id="tank-notes" value={m.tank_notes || ''} onChange={(e) => set({ tank_notes: e.target.value })} placeholder="Mis. tangki 2 PV vent diganti gasket" className={inputCls} />
        </div>
      </div>
    );
  }

  const addUnit = (u: SiteDispenserUnit) => {
    set({ dispensers: [...m.dispensers, dispenserCheckFrom(u)] });
    setOpenId(u.id);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-3">
        <div className="flex items-start gap-2">
          <Fuel className="w-5 h-5 text-blue-800 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Pemeriksaan Mekanikal Dispenser</h2>
            <p className="text-xs text-slate-500">
              Nozzle, swivel, selang, breakaway, check valve, filter, sump, shear valve, dan kebocoran untuk setiap dispenser
            </p>
          </div>
        </div>
        {units.length === 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-900 flex items-start gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Daftar dispenser (model & SN) SPBU ini belum dikonfigurasi Admin. Tambahkan dispenser secara manual di bawah.</span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          {notAdded.length > 0 && (
            <>
              <label htmlFor="mech-pick" className="sr-only">Pilih dispenser dari konfigurasi SPBU</label>
              <select id="mech-pick" value={pick} onChange={(e) => setPick(e.target.value)} className={`${inputCls} sm:flex-1`}>
                <option value="">Pilih dispenser dari konfigurasi SPBU…</option>
                {notAdded.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label} · {u.model || '-'} · SN {u.serial_number || '-'}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!pick}
                onClick={() => {
                  const u = notAdded.find((x) => x.id === pick);
                  if (u) addUnit(u);
                  setPick('');
                }}
                className="min-h-[44px] px-4 rounded-lg bg-[#0B2545] disabled:bg-slate-300 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Tambah
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => addUnit({ id: `DSP-${Date.now().toString(36)}`, label: `Dispenser ${m.dispensers.length + 1}`, model: '', serial_number: '' })}
            className="min-h-[44px] px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Tambah manual
          </button>
        </div>
      </div>

      {m.dispensers.length === 0 ? (
        <p className="text-xs text-slate-500 border border-dashed border-slate-300 rounded-xl px-3 py-8 text-center bg-white">Belum ada dispenser yang diperiksa.</p>
      ) : (
        m.dispensers.map((d) => {
          const open = openId === d.id;
          const issues = DISPENSER_ITEMS.filter((it) => d.items[it.key]?.status !== 'B').length;
          const locked = fromConfig(d.id);
          return (
            <section key={d.id} className="bg-white rounded-xl border border-slate-200 shadow-xs">
              <button type="button" onClick={() => setOpenId(open ? null : d.id)} aria-expanded={open} className="w-full min-h-[56px] px-4 py-3 flex items-center justify-between gap-2 text-left">
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold text-[#0B2545]">{d.label}</span>
                  <span className="block text-[11px] text-slate-500 truncate">
                    {d.model || 'Model belum diisi'} · SN {d.serial_number || '-'}
                  </span>
                </span>
                <span className="flex items-center gap-2 flex-shrink-0">
                  {issues > 0 ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 inline-flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {issues} R/X
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">Semua B</span>
                  )}
                  {open ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                </span>
              </button>
              {open && (
                <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor={`${d.id}-label`} className={labelCls}>Nama / No. Dispenser</label>
                      <input id={`${d.id}-label`} value={d.label} disabled={locked} onChange={(e) => setDisp(d.id, { label: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label htmlFor={`${d.id}-model`} className={labelCls}>Model Dispenser</label>
                      {locked ? (
                        <input id={`${d.id}-model`} value={d.model} disabled className={inputCls} />
                      ) : (
                        <MasterSelect id={`${d.id}-model`} value={d.model} onChange={(v) => setDisp(d.id, { model: v })} options={modelOptions} placeholder="Pilih model" className={inputCls} />
                      )}
                    </div>
                    <div>
                      <label htmlFor={`${d.id}-sn`} className={labelCls}>Serial Number</label>
                      <input id={`${d.id}-sn`} value={d.serial_number} disabled={locked} onChange={(e) => setDisp(d.id, { serial_number: e.target.value })} className={`${inputCls} font-mono`} />
                    </div>
                  </div>
                  {locked && <p className="text-[11px] text-slate-500">Model & SN dikunci sesuai konfigurasi SPBU (diubah oleh Admin).</p>}
                  <ul className="space-y-2.5">
                    {DISPENSER_ITEMS.map((def) => (
                      <CheckRow key={def.key} def={def} idPrefix={d.id} value={d.items[def.key]} onChange={(v) => setDisp(d.id, { items: { ...d.items, [def.key]: v } })} />
                    ))}
                  </ul>
                  <div>
                    <label htmlFor={`${d.id}-notes`} className={labelCls}>Catatan dispenser</label>
                    <AutoTextarea id={`${d.id}-notes`} value={d.notes || ''} onChange={(e) => setDisp(d.id, { notes: e.target.value })} placeholder="Catatan umum dispenser ini (opsional)" className={inputCls} />
                  </div>
                  <button
                    type="button"
                    onClick={() => set({ dispensers: m.dispensers.filter((x) => x.id !== d.id) })}
                    className="min-h-[40px] px-3 rounded-lg text-red-700 hover:bg-red-50 text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" /> Hapus dispenser dari BA
                  </button>
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
};
