'use client';

import React, { useEffect, useState } from 'react';
import {
  Fuel,
  Gauge,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertTriangle,
  Info,
  Lock,
  RotateCw,
  Cable,
  Unlink,
  ShieldCheck,
  Filter,
  Droplets,
  Scissors,
  Droplet,
  Wind,
  Zap,
  Activity,
  PackageCheck,
  FlameKindling,
} from 'lucide-react';
import type { MechanicalDispenserCheck, MechanicalPMDetails, MechCheck, PMReport, Site, SiteDispenserUnit } from '@/lib/types';
import { CHECK_ITEMS, DISPENSER_ITEMS, TANK_ITEMS, MechItemDef, dispenserCheckFrom, emptyMechanical, normalizeMechanical, normalizeMechanicalCheck } from '@/lib/mechanical';
import { activeOnly, dispenserLabel, useMasterData } from '@/lib/use-master-config';
import { MasterSelect } from '@/components/ui/MasterSelect';
import { AutoTextarea } from '@/components/ui/AutoTextarea';
import { StatusSelector } from '../StatusSelector';

// Same look as the IT form sections (HardwareSection / PeripheralsSection)
const cardCls = 'bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs';
const inputCls =
  'w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600';
const labelCls = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1';

const ITEM_ICON: Record<string, React.ElementType> = {
  nozzle: Fuel,
  swivel: RotateCw,
  hose: Cable,
  breakaway: Unlink,
  check_valve: ShieldCheck,
  filter: Filter,
  sump: Droplets,
  shear_valve: Scissors,
  leak: Droplet,
  stp: Gauge,
  leak_detector: AlertTriangle,
  tank_sump: Droplets,
  fill_point: Fuel,
  pv_vent: Wind,
  grounding: Zap,
  separator: Filter,
  dispenser_run: Activity,
  nozzle_hose: Fuel,
  dispenser_sump: Droplets,
  tank_area: Gauge,
  drainage: Filter,
  spill_kit: PackageCheck,
  apar: FlameKindling,
};

/** Card header identical to the IT sections. */
const SectionHeader: React.FC<{ icon: React.ElementType; title: string; subtitle: string; right?: React.ReactNode }> = ({ icon: Icon, title, subtitle, right }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 border-b border-slate-100 pb-3 mb-4">
    <div className="flex items-center gap-2 min-w-0">
      <Icon className="w-5 h-5 text-red-600 flex-shrink-0" />
      <div className="min-w-0">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
    {right && <div className="self-start sm:self-auto">{right}</div>}
  </div>
);

const IssueBadge: React.FC<{ count: number }> = ({ count }) =>
  count > 0 ? (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 inline-flex items-center gap-1 flex-shrink-0">
      <AlertTriangle className="w-3 h-3" /> {count} R/X
    </span>
  ) : (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex-shrink-0">Semua B</span>
  );

/** One numbered check item, laid out like an IT peripheral item. */
const CheckItem: React.FC<{ no: number; def: MechItemDef; value: MechCheck; idPrefix: string; onChange: (v: MechCheck) => void }> = ({
  no,
  def,
  value,
  idPrefix,
  onChange,
}) => {
  const Icon = ITEM_ICON[def.key] || Activity;
  const bad = value.status !== 'B';
  const noteId = `${idPrefix}-${def.key}-note`;
  return (
    <div className="py-4 first:pt-0 last:pb-0 space-y-2.5">
      <div>
        <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Icon className="w-4 h-4 text-blue-700 flex-shrink-0" />
          {no}. {def.label}
        </span>
        <p className="text-xs text-slate-500 mt-0.5">{def.hint}</p>
      </div>
      <div>
        <span className="block text-xs font-semibold text-slate-700 mb-1">Status</span>
        <StatusSelector value={value.status} onChange={(status) => onChange({ ...value, status })} />
      </div>
      {def.cleaning && (
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 min-h-[40px] px-3 rounded-md border border-slate-200 bg-slate-50 cursor-pointer">
          <input type="checkbox" checked={!!value.cleaned} onChange={(e) => onChange({ ...value, cleaned: e.target.checked })} className="w-4 h-4 rounded" />
          <Sparkles className="w-3.5 h-3.5 text-slate-500" /> Sudah dibersihkan
        </label>
      )}
      <div>
        <label htmlFor={noteId} className={labelCls}>
          Catatan{bad && <span className="text-red-500"> * wajib untuk R/X</span>}
        </label>
        <AutoTextarea
          id={noteId}
          value={value.notes || ''}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          placeholder={bad ? 'Jelaskan temuan & tindakan yang dilakukan' : 'Catatan (opsional)'}
          className={`${inputCls} ${bad && !(value.notes || '').trim() ? 'border-amber-400 bg-amber-50/40' : ''}`}
        />
      </div>
    </div>
  );
};

const CheckList: React.FC<{ defs: MechItemDef[]; items: Record<string, MechCheck>; idPrefix: string; onChange: (key: string, v: MechCheck) => void }> = ({
  defs,
  items,
  idPrefix,
  onChange,
}) => (
  <div className="divide-y divide-slate-100">
    {defs.map((def, i) => (
      <CheckItem key={def.key} no={i + 1} def={def} idPrefix={idPrefix} value={items[def.key]} onChange={(v) => onChange(def.key, v)} />
    ))}
  </div>
);

interface Props {
  report: PMReport;
  onChange: (r: PMReport) => void;
  sites: Site[];
  step: 'dispenser' | 'tank' | 'check';
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
    if (step === 'check') {
      if (!report.mechanical_check) onChange({ ...report, mechanical_check: normalizeMechanicalCheck() });
      return;
    }
    if (!report.mechanical) onChange({ ...report, mechanical: emptyMechanical(units) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.id, report.mechanical == null, report.mechanical_check == null, step]);

  const set = (patch: Partial<MechanicalPMDetails>) => onChange({ ...report, mechanical: { ...m, ...patch } });
  const setDisp = (id: string, patch: Partial<MechanicalDispenserCheck>) =>
    set({ dispensers: m.dispensers.map((d) => (d.id === id ? { ...d, ...patch } : d)) });

  const modelOptions = activeOnly(master.dispenserBrands).map((b) => ({ value: dispenserLabel(b) }));
  const notAdded = units.filter((u) => !m.dispensers.some((d) => d.id === u.id));
  const fromConfig = (id: string) => units.some((u) => u.id === id);

  // ---- Pengecekan Teknik ----
  if (step === 'check') {
    const c = normalizeMechanicalCheck(report.mechanical_check);
    const bad = CHECK_ITEMS.filter((it) => c.items[it.key].status !== 'B').length;
    return (
      <div className="space-y-6">
        <div className={cardCls}>
          <SectionHeader
            icon={Activity}
            title="Checklist Pengecekan Teknik Forecourt & Tangki"
            subtitle={`Verifikasi ${CHECK_ITEMS.length} pilar kesiapan dispenser, STP, area tangki, dan keselamatan`}
            right={<IssueBadge count={bad} />}
          />
          {units.length > 0 && (
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
              <span className="font-semibold">Dispenser SPBU ini:</span>{' '}
              {units.map((u) => `${u.label} (${u.model || '-'}, SN ${u.serial_number || '-'})`).join('; ')}. Sebutkan dispenser yang bermasalah di catatan item.
            </div>
          )}
          <CheckList
            defs={CHECK_ITEMS}
            items={c.items}
            idPrefix="qct"
            onChange={(key, v) => onChange({ ...report, mechanical_check: { items: { ...c.items, [key]: v } } })}
          />
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-xs text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
            <span>Pengecekan ini memastikan forecourt dan area tangki SPBU aman dan siap operasi sebelum pergantian shift.</span>
          </div>
        </div>
      </div>
    );
  }

  // ---- PM Teknik: tank area ----
  if (step === 'tank') {
    const bad = TANK_ITEMS.filter((it) => m.tank_items[it.key]?.status !== 'B').length;
    return (
      <div className="space-y-6">
        <div className={cardCls}>
          <SectionHeader
            icon={Gauge}
            title="Area Tangki, STP & PV Vent"
            subtitle="STP, leak detector, sump tangki, fill point, PV vent, grounding, dan separator"
            right={<IssueBadge count={bad} />}
          />
          <CheckList defs={TANK_ITEMS} items={m.tank_items} idPrefix="tank" onChange={(key, v) => set({ tank_items: { ...m.tank_items, [key]: v } })} />
          <div className="pt-4 mt-4 border-t border-slate-100">
            <label htmlFor="tank-notes" className={labelCls}>
              Catatan Area Tangki
            </label>
            <AutoTextarea id="tank-notes" value={m.tank_notes || ''} onChange={(e) => set({ tank_notes: e.target.value })} placeholder="Contoh: Gasket PV vent tangki 2 diganti" className={inputCls} />
          </div>
        </div>
      </div>
    );
  }

  // ---- PM Teknik: per dispenser ----
  const addUnit = (u: SiteDispenserUnit) => {
    set({ dispensers: [...m.dispensers, dispenserCheckFrom(u)] });
    setOpenId(u.id);
  };

  return (
    <div className="space-y-6">
      <div className={cardCls}>
        <SectionHeader
          icon={Fuel}
          title="Pemeriksaan Mekanikal Dispenser"
          subtitle="Nozzle, swivel, selang, breakaway, check valve, filter, sump, shear valve, dan kebocoran per dispenser"
          right={<span className="text-xs bg-slate-100 px-2.5 py-1 rounded font-semibold text-slate-700 border border-slate-200 flex-shrink-0">{m.dispensers.length} unit</span>}
        />
        {units.length === 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2 text-xs text-blue-900">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Daftar dispenser (model & SN) SPBU ini belum dikonfigurasi Admin. Tambahkan dispenser secara manual.</span>
          </div>
        )}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-4 space-y-3">
          {notAdded.length > 0 && (
            <div>
              <label htmlFor="mech-pick" className={labelCls}>
                Tambah dispenser dari konfigurasi SPBU
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select id="mech-pick" value={pick} onChange={(e) => setPick(e.target.value)} className={`${inputCls} sm:flex-1`}>
                  <option value="">— Pilih dispenser —</option>
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
                  className="min-h-[44px] px-4 bg-[#0B2545] hover:bg-[#134074] disabled:bg-slate-300 text-white rounded-md text-xs font-semibold inline-flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Tambah
                </button>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => addUnit({ id: `DSP-${Date.now().toString(36)}`, label: `Dispenser ${m.dispensers.length + 1}`, model: '', serial_number: '' })}
            className="w-full sm:w-auto min-h-[44px] px-4 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-md text-xs font-semibold inline-flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Tambah dispenser manual
          </button>
        </div>
      </div>

      {m.dispensers.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-lg bg-white">
          <Fuel className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Belum ada dispenser yang diperiksa</p>
          <p className="text-xs text-slate-500 mt-1">Tambahkan dispenser dari konfigurasi SPBU atau secara manual.</p>
        </div>
      ) : (
        m.dispensers.map((d) => {
          const open = openId === d.id;
          const issues = DISPENSER_ITEMS.filter((it) => d.items[it.key]?.status !== 'B').length;
          const locked = fromConfig(d.id);
          return (
            <div key={d.id} className="bg-white rounded-lg border border-slate-200 shadow-xs">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : d.id)}
                aria-expanded={open}
                className="w-full min-h-[56px] p-4 sm:px-5 flex items-center justify-between gap-2 text-left"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Fuel className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-base font-bold text-slate-900">{d.label}</span>
                    <span className="block text-xs text-slate-500 truncate">
                      {d.model || 'Model belum diisi'} · SN {d.serial_number || '-'}
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-2 flex-shrink-0">
                  <IssueBadge count={issues} />
                  {open ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                </span>
              </button>
              {open && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-4 border-t border-slate-100 space-y-4">
                  {locked ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                      {[
                        ['Nama / No.', d.label],
                        ['Model', d.model || '-'],
                        ['Serial Number', d.serial_number || '-'],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <span className="block font-semibold text-slate-500 uppercase tracking-wider text-[10px]">{k}</span>
                          <span className={`block font-semibold text-slate-900 ${k === 'Serial Number' ? 'font-mono' : ''}`}>{v}</span>
                        </div>
                      ))}
                      <p className="sm:col-span-3 flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Lock className="w-3.5 h-3.5" /> Dikunci sesuai konfigurasi SPBU (diubah oleh Admin).
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label htmlFor={`${d.id}-label`} className={labelCls}>
                          Nama / No. Dispenser
                        </label>
                        <input id={`${d.id}-label`} value={d.label} onChange={(e) => setDisp(d.id, { label: e.target.value })} className={inputCls} />
                      </div>
                      <div>
                        <label htmlFor={`${d.id}-model`} className={labelCls}>
                          Model Dispenser <span className="text-red-500">*</span>
                        </label>
                        <MasterSelect
                          id={`${d.id}-model`}
                          value={d.model}
                          onChange={(v) => setDisp(d.id, { model: v })}
                          options={modelOptions}
                          placeholder="— Pilih model —"
                          customPlaceholder="Merek & model dispenser"
                        />
                      </div>
                      <div>
                        <label htmlFor={`${d.id}-sn`} className={labelCls}>
                          Serial Number <span className="text-red-500">*</span>
                        </label>
                        <input id={`${d.id}-sn`} value={d.serial_number} onChange={(e) => setDisp(d.id, { serial_number: e.target.value })} className={`${inputCls} font-mono`} />
                      </div>
                    </div>
                  )}

                  <CheckList defs={DISPENSER_ITEMS} items={d.items} idPrefix={d.id} onChange={(key, v) => setDisp(d.id, { items: { ...d.items, [key]: v } })} />

                  <div className="pt-4 border-t border-slate-100">
                    <label htmlFor={`${d.id}-notes`} className={labelCls}>
                      Catatan {d.label}
                    </label>
                    <AutoTextarea id={`${d.id}-notes`} value={d.notes || ''} onChange={(e) => setDisp(d.id, { notes: e.target.value })} placeholder="Catatan umum dispenser ini (opsional)" className={inputCls} />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => set({ dispensers: m.dispensers.filter((x) => x.id !== d.id) })}
                      className="min-h-[40px] px-2 rounded text-red-600 hover:text-red-800 hover:bg-red-50 text-xs font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus dispenser dari BA
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
