'use client';

import React, { useMemo, useState } from 'react';
import { Fuel, Gauge, Plus, Trash2, X, Wand2, Save } from 'lucide-react';
import type { Site, SiteForecourtConfig } from '@/lib/types';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { useFeedback } from '@/components/feedback/FeedbackProvider';
import { updateSiteForecourtApi } from '@/lib/api-client';
import { activeOnly, atgLabel, dispenserLabel, useMasterData } from '@/lib/use-master-config';

interface Props {
  site: Site;
  onClose: () => void;
  onSaved: (forecourt: SiteForecourtConfig) => void;
}

const EMPTY: SiteForecourtConfig = { pumps: [], tanks: [] };

const inputCls =
  'w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600';
const labelCls = 'block text-xs font-semibold text-slate-700 mb-1';

/**
 * Admin: equipment installed at one SPBU (dispenser & ATG brand, pumps with
 * their nozzles + product, tanks). The PM form is pre-filled from this so the
 * technician doesn't have to add pumps / tanks by hand.
 */
export const SiteForecourtEditor: React.FC<Props> = ({ site, onClose, onSaved }) => {
  const feedback = useFeedback();
  const master = useMasterData();
  const products = useMemo(() => activeOnly(master.products).map((p) => p.name), [master.products]);
  const atgBrands = activeOnly(master.atgBrands);
  const dispenserBrands = activeOnly(master.dispenserBrands);

  const [cfg, setCfg] = useState<SiteForecourtConfig>(() => JSON.parse(JSON.stringify(site.forecourt || EMPTY)));
  const [genPumps, setGenPumps] = useState(cfg.pumps.length || 4);
  const [genNozzles, setGenNozzles] = useState(2);

  const options = (current: string) => (current && !products.includes(current) ? [current, ...products] : products);
  const firstProduct = products[0] || '';

  // ---- pumps ----
  const setPumps = (pumps: SiteForecourtConfig['pumps']) => setCfg((c) => ({ ...c, pumps }));
  const generate = async () => {
    if (cfg.pumps.length) {
      const ok = await feedback.confirm({
        title: 'Buat Ulang Daftar Pump?',
        message: `Daftar pump saat ini akan diganti dengan ${genPumps} pump × ${genNozzles} nozzle.`,
        confirmLabel: 'Ya, Buat Ulang',
      });
      if (!ok) return;
    }
    setPumps(
      Array.from({ length: Math.max(1, genPumps) }, (_, i) => ({
        pump_number: i + 1,
        nozzles: Array.from({ length: Math.max(1, genNozzles) }, (_, j) => ({ nozzle_number: j + 1, product_name: products[j] || firstProduct })),
      }))
    );
  };
  const addPump = () => {
    const next = Math.max(0, ...cfg.pumps.map((p) => p.pump_number)) + 1;
    setPumps([...cfg.pumps, { pump_number: next, nozzles: [{ nozzle_number: 1, product_name: firstProduct }] }]);
  };
  const removePump = (pumpNo: number) => setPumps(cfg.pumps.filter((p) => p.pump_number !== pumpNo));
  const addNozzle = (pumpNo: number) =>
    setPumps(
      cfg.pumps.map((p) =>
        p.pump_number === pumpNo
          ? {
              ...p,
              nozzles: [
                ...p.nozzles,
                { nozzle_number: Math.max(0, ...p.nozzles.map((n) => n.nozzle_number)) + 1, product_name: p.nozzles[p.nozzles.length - 1]?.product_name || firstProduct },
              ],
            }
          : p
      )
    );
  const removeNozzle = (pumpNo: number, nozzleNo: number) =>
    setPumps(
      cfg.pumps
        .map((p) => (p.pump_number === pumpNo ? { ...p, nozzles: p.nozzles.filter((n) => n.nozzle_number !== nozzleNo) } : p))
        .filter((p) => p.nozzles.length > 0)
    );
  const setNozzleProduct = (pumpNo: number, nozzleNo: number, product_name: string) =>
    setPumps(
      cfg.pumps.map((p) =>
        p.pump_number === pumpNo ? { ...p, nozzles: p.nozzles.map((n) => (n.nozzle_number === nozzleNo ? { ...n, product_name } : n)) } : p
      )
    );

  // ---- dispenser units (model + SN, used by PM Teknik) ----
  const units = cfg.dispensers || [];
  const setUnits = (dispensers: NonNullable<SiteForecourtConfig['dispensers']>) => setCfg((c) => ({ ...c, dispensers }));
  const modelNames = dispenserBrands.map(dispenserLabel);
  const addUnit = () =>
    setUnits([
      ...units,
      { id: `DSP-${Date.now().toString(36)}`, label: `Dispenser ${units.length + 1}`, model: cfg.dispenser_brand || modelNames[0] || '', serial_number: '', pumps: '' },
    ]);

  // ---- tanks ----
  const setTanks = (tanks: SiteForecourtConfig['tanks']) => setCfg((c) => ({ ...c, tanks }));
  const addTank = () =>
    setTanks([...cfg.tanks, { tank_number: `Tangki ${cfg.tanks.length + 1}`, product_name: products[cfg.tanks.length] || firstProduct, capacity_liters: 20000 }]);

  const totalNozzles = cfg.pumps.reduce((n, p) => n + p.nozzles.length, 0);

  const save = async () => {
    const noSn = units.find((u) => !u.serial_number.trim() || !u.model.trim());
    if (noSn) {
      feedback.notify({ variant: 'warning', title: 'Data Dispenser Belum Lengkap', message: `Isi model dan serial number untuk "${noSn.label}".` });
      return;
    }
    const dupTank = cfg.tanks.find((t, i) => cfg.tanks.findIndex((x) => x.tank_number.trim() === t.tank_number.trim()) !== i);
    if (dupTank) {
      feedback.notify({ variant: 'warning', title: 'Nama Tangki Ganda', message: `"${dupTank.tank_number}" dipakai lebih dari sekali. Beri nama berbeda.` });
      return;
    }
    const result = await feedback.run(() => updateSiteForecourtApi(site.id, cfg), {
      pending: 'Menyimpan konfigurasi forecourt...',
      success: {
        title: 'Konfigurasi Tersimpan',
        message: `${site.site_code}: ${cfg.pumps.length} pump, ${totalNozzles} nozzle, ${cfg.tanks.length} tangki. Formulir PM berikutnya untuk SPBU ini terisi otomatis.`,
      },
      error: { title: 'Gagal Menyimpan Konfigurasi', message: 'Konfigurasi belum tersimpan. Coba lagi.' },
    });
    if (result.success) onSaved(result.forecourt || cfg);
  };

  return (
    <ModalPortal>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="forecourt-editor-title"
        className="fixed inset-0 z-[60] bg-black/70 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto"
      >
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-300 overflow-hidden my-6">
          <div className="p-4 bg-[#0B2545] text-white flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 id="forecourt-editor-title" className="text-base font-bold">
                Konfigurasi Forecourt &amp; ATG
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 break-words">
                {site.site_code} · {site.site_name}
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Tutup" className="min-h-[40px] min-w-[40px] rounded-lg hover:bg-white/10 flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-5 space-y-6">
            {/* Brands */}
            <section className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900">Merek Peralatan</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cfg-dispenser" className={labelCls}>
                    Brand Dispenser
                  </label>
                  <select
                    id="cfg-dispenser"
                    value={cfg.dispenser_brand_id || ''}
                    onChange={(e) => {
                      const b = dispenserBrands.find((x) => x.id === e.target.value);
                      setCfg((c) => ({ ...c, dispenser_brand_id: b?.id, dispenser_brand: b ? dispenserLabel(b) : undefined }));
                    }}
                    className={inputCls}
                  >
                    <option value="">— Pilih brand dispenser —</option>
                    {dispenserBrands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {dispenserLabel(b)}
                      </option>
                    ))}
                    {cfg.dispenser_brand_id && !dispenserBrands.some((b) => b.id === cfg.dispenser_brand_id) && (
                      <option value={cfg.dispenser_brand_id}>{cfg.dispenser_brand} (tidak aktif)</option>
                    )}
                  </select>
                </div>
                <div>
                  <label htmlFor="cfg-atg" className={labelCls}>
                    Brand ATG
                  </label>
                  <select
                    id="cfg-atg"
                    value={cfg.atg_brand_id || ''}
                    onChange={(e) => {
                      const b = atgBrands.find((x) => x.id === e.target.value);
                      setCfg((c) => ({ ...c, atg_brand_id: b?.id, atg_brand: b ? atgLabel(b) : undefined }));
                    }}
                    className={inputCls}
                  >
                    <option value="">— Pilih brand ATG —</option>
                    {atgBrands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {atgLabel(b)}
                      </option>
                    ))}
                    {cfg.atg_brand_id && !atgBrands.some((b) => b.id === cfg.atg_brand_id) && (
                      <option value={cfg.atg_brand_id}>{cfg.atg_brand} (tidak aktif)</option>
                    )}
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">Daftar merek diambil dari tab Brand ATG dan Dispenser.</p>
            </section>

            {/* Pumps */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Fuel className="w-4 h-4 text-emerald-700" /> Pump &amp; Nozzle
                  <span className="text-xs font-semibold text-slate-500">
                    ({cfg.pumps.length} pump · {totalNozzles} nozzle)
                  </span>
                </h4>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">Isi cepat</p>
                <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <div>
                    <label htmlFor="gen-pumps" className={labelCls}>
                      Jumlah pump
                    </label>
                    <input id="gen-pumps" type="number" inputMode="numeric" min={1} max={60} value={genPumps} onChange={(e) => setGenPumps(Math.min(60, Math.max(1, Number(e.target.value) || 1)))} className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor="gen-nozzles" className={labelCls}>
                      Nozzle per pump
                    </label>
                    <input id="gen-nozzles" type="number" inputMode="numeric" min={1} max={12} value={genNozzles} onChange={(e) => setGenNozzles(Math.min(12, Math.max(1, Number(e.target.value) || 1)))} className={inputCls} />
                  </div>
                  <button type="button" onClick={generate} className="col-span-2 sm:col-span-1 min-h-[44px] px-4 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5">
                    <Wand2 className="w-4 h-4" /> Buat Daftar
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Lalu sesuaikan produk tiap nozzle, atau tambah / hapus nozzle per pump di bawah.</p>
              </div>

              {cfg.pumps.map((p) => (
                <div key={p.pump_number} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-100 border-b border-slate-200">
                    <span className="bg-[#0B2545] text-white text-xs font-bold px-2 py-0.5 rounded font-mono">Pump #{p.pump_number}</span>
                    <button type="button" onClick={() => removePump(p.pump_number)} className="min-h-[40px] px-2.5 text-red-600 hover:bg-red-50 rounded text-xs font-semibold flex items-center gap-1" aria-label={`Hapus Pump #${p.pump_number}`}>
                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                    </button>
                  </div>
                  <div className="p-3 space-y-2">
                    {p.nozzles.map((n) => (
                      <div key={n.nozzle_number}>
                        <span className="block text-[11px] font-bold text-slate-600 mb-1">Nozzle {n.nozzle_number}</span>
                        <div className="flex items-center gap-2">
                        <select
                          aria-label={`Produk Pump ${p.pump_number} Nozzle ${n.nozzle_number}`}
                          value={n.product_name}
                          onChange={(e) => setNozzleProduct(p.pump_number, n.nozzle_number, e.target.value)}
                          className={`${inputCls} flex-1 min-w-0`}
                        >
                          {options(n.product_name).map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                        <button type="button" onClick={() => removeNozzle(p.pump_number, n.nozzle_number)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-red-500 hover:bg-red-50" aria-label={`Hapus Nozzle ${n.nozzle_number} Pump #${p.pump_number}`}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => addNozzle(p.pump_number)} className="w-full min-h-[44px] border border-dashed border-slate-400 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5">
                      <Plus className="w-4 h-4" /> Tambah Nozzle
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addPump} className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5">
                <Plus className="w-4 h-4" /> Tambah Pump
              </button>
            </section>

            {/* Dispenser units */}
            <section className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Fuel className="w-4 h-4 text-blue-800" /> Unit Dispenser (Model & SN)
                <span className="text-xs font-semibold text-slate-500">({units.length} unit)</span>
              </h4>
              <p className="text-[11px] text-slate-500 -mt-2">Dipakai di form PM Teknik: teknisi tinggal pilih dispenser, model & SN terisi otomatis.</p>
              {units.map((u, i) => (
                <div key={u.id} className="border border-slate-200 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-[1fr_1.4fr_1.2fr_0.9fr_auto] gap-2 items-end">
                  <div>
                    <label htmlFor={`unit-label-${i}`} className={labelCls}>Nama / No.</label>
                    <input id={`unit-label-${i}`} value={u.label} onChange={(e) => setUnits(units.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className={inputCls} />
                  </div>
                  <div className="col-span-2 sm:col-span-1 order-first sm:order-none">
                    <label htmlFor={`unit-model-${i}`} className={labelCls}>Model</label>
                    <select id={`unit-model-${i}`} value={u.model} onChange={(e) => setUnits(units.map((x, j) => (j === i ? { ...x, model: e.target.value } : x)))} className={inputCls}>
                      <option value="">Pilih model…</option>
                      {(u.model && !modelNames.includes(u.model) ? [u.model, ...modelNames] : modelNames).map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`unit-sn-${i}`} className={labelCls}>Serial Number</label>
                    <input id={`unit-sn-${i}`} value={u.serial_number} onChange={(e) => setUnits(units.map((x, j) => (j === i ? { ...x, serial_number: e.target.value } : x)))} className={`${inputCls} font-mono`} />
                  </div>
                  <div>
                    <label htmlFor={`unit-pumps-${i}`} className={labelCls}>Pump</label>
                    <input id={`unit-pumps-${i}`} value={u.pumps || ''} placeholder="mis. 1-2" onChange={(e) => setUnits(units.map((x, j) => (j === i ? { ...x, pumps: e.target.value } : x)))} className={inputCls} />
                  </div>
                  <button type="button" onClick={() => setUnits(units.filter((_, j) => j !== i))} className="min-h-[44px] px-3 rounded-lg text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center justify-center gap-1" aria-label={`Hapus ${u.label}`}>
                    <Trash2 className="w-4 h-4" /> <span className="sm:hidden">Hapus</span>
                  </button>
                </div>
              ))}
              <button type="button" onClick={addUnit} className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5">
                <Plus className="w-4 h-4" /> Tambah Unit Dispenser
              </button>
            </section>

            {/* Tanks */}
            <section className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-blue-800" /> Tangki Pendam
                <span className="text-xs font-semibold text-slate-500">({cfg.tanks.length} tangki)</span>
              </h4>
              {cfg.tanks.map((t, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-[1fr_1.4fr_1fr_auto] gap-2 items-end">
                  <div>
                    <label htmlFor={`tank-name-${i}`} className={labelCls}>
                      Nama / No.
                    </label>
                    <input id={`tank-name-${i}`} value={t.tank_number} onChange={(e) => setTanks(cfg.tanks.map((x, j) => (j === i ? { ...x, tank_number: e.target.value } : x)))} className={inputCls} />
                  </div>
                  <div>
                    <label htmlFor={`tank-cap-${i}`} className={labelCls}>
                      Kapasitas (L)
                    </label>
                    <input
                      id={`tank-cap-${i}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1000}
                      value={t.capacity_liters}
                      onChange={(e) => setTanks(cfg.tanks.map((x, j) => (j === i ? { ...x, capacity_liters: Number(e.target.value) || 0 } : x)))}
                      className={inputCls}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 sm:order-none order-first sm:row-auto">
                    <label htmlFor={`tank-prod-${i}`} className={labelCls}>
                      Produk BBM
                    </label>
                    <select id={`tank-prod-${i}`} value={t.product_name} onChange={(e) => setTanks(cfg.tanks.map((x, j) => (j === i ? { ...x, product_name: e.target.value } : x)))} className={inputCls}>
                      {options(t.product_name).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="button" onClick={() => setTanks(cfg.tanks.filter((_, j) => j !== i))} className="col-span-2 sm:col-span-1 min-h-[44px] px-3 rounded-lg text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center justify-center gap-1" aria-label={`Hapus ${t.tank_number}`}>
                    <Trash2 className="w-4 h-4" /> <span className="sm:hidden">Hapus Tangki</span>
                  </button>
                </div>
              ))}
              <button type="button" onClick={addTank} className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5">
                <Plus className="w-4 h-4" /> Tambah Tangki
              </button>
            </section>
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="min-h-[44px] px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold">
              Batal
            </button>
            <button type="button" onClick={save} className="min-h-[44px] px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5">
              <Save className="w-4 h-4" /> Simpan Konfigurasi
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
