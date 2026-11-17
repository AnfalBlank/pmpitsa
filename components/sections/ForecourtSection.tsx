'use client';

import React from 'react';
import { PMReport, ForecourtFMS, TankItem, NozzleItem, ChecklistStatus } from '@/lib/types';
import { StatusSelector } from '../StatusSelector';
import { useFeedback } from '@/components/feedback/FeedbackProvider';
import { Fuel, Gauge, Droplet, Plus, Trash2, AlertCircle, ShieldAlert, Radio, Award } from 'lucide-react';

interface ForecourtSectionProps {
  report: PMReport;
  onChange: (updated: PMReport) => void;
}

export const ForecourtSection: React.FC<ForecourtSectionProps> = ({
  report,
  onChange,
}) => {
  const feedback = useFeedback();
  const updateForecourt = <K extends keyof ForecourtFMS>(
    key: K,
    val: ForecourtFMS[K]
  ) => {
    onChange({
      ...report,
      forecourt: {
        ...report.forecourt,
        [key]: val,
      },
    });
  };

  const updateTank = (index: number, updated: Partial<TankItem>) => {
    const newTanks = [...report.forecourt.tanks];
    newTanks[index] = { ...newTanks[index], ...updated };
    updateForecourt('tanks', newTanks);
  };

  const addTank = () => {
    const nextNo = report.forecourt.tanks.length + 1;
    const newTank: TankItem = {
      id: `TNK-${Date.now().toString().slice(-4)}`,
      tank_number: `Tangki ${nextNo}`,
      product_name: "Pertalite (RON 90)",
      capacity_liters: 20000,
      level_sensor_status: "B",
      water_sensor_status: "B",
      temp_sensor_status: "B",
    };
    updateForecourt('tanks', [...report.forecourt.tanks, newTank]);
  };

  const removeTank = (index: number) => {
    const newTanks = report.forecourt.tanks.filter((_, i) => i !== index);
    updateForecourt('tanks', newTanks);
  };

  // ---- Pumps & nozzles -------------------------------------------------
  // A pump (dispenser) can have 1, 2 or more nozzles. Pumps are derived from
  // nozzle.pump_number; dispenser_count / total_nozzles are kept in sync in
  // ONE update (two separate updates would overwrite each other).
  const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const nozzles = report.forecourt.nozzles || [];

  const setNozzles = (next: NozzleItem[]) => {
    const sorted = [...next].sort((a, b) => a.pump_number - b.pump_number || a.nozzle_number - b.nozzle_number);
    onChange({
      ...report,
      forecourt: {
        ...report.forecourt,
        nozzles: sorted,
        dispenser_count: new Set(sorted.map((n) => n.pump_number)).size,
        total_nozzles: sorted.length,
      },
    });
  };

  const pumpNumbers = Array.from(new Set(nozzles.map((n) => n.pump_number))).sort((a, b) => a - b);

  const updateNozzle = (id: string, updated: Partial<NozzleItem>) => {
    setNozzles(nozzles.map((n) => (n.id === id ? { ...n, ...updated } : n)));
  };

  const addPump = () => {
    const pumpNo = (pumpNumbers[pumpNumbers.length - 1] || 0) + 1;
    setNozzles([
      ...nozzles,
      { id: uid('NZ'), pump_number: pumpNo, nozzle_number: 1, product_name: bbmOptions[0], status: 'B', meter_reading: '' },
    ]);
  };

  const removePump = async (pumpNo: number) => {
    const count = nozzles.filter((n) => n.pump_number === pumpNo).length;
    const ok = await feedback.confirm({
      title: `Hapus Pump #${pumpNo}?`,
      message: `Pump #${pumpNo} beserta ${count} nozzle di dalamnya akan dihapus dari checklist.`,
      confirmLabel: 'Ya, Hapus',
      danger: true,
    });
    if (ok) setNozzles(nozzles.filter((n) => n.pump_number !== pumpNo));
  };

  const addNozzle = (pumpNo: number) => {
    const inPump = nozzles.filter((n) => n.pump_number === pumpNo);
    const nextNo = Math.max(0, ...inPump.map((n) => n.nozzle_number)) + 1;
    const product = inPump[inPump.length - 1]?.product_name || bbmOptions[0];
    setNozzles([...nozzles, { id: uid('NZ'), pump_number: pumpNo, nozzle_number: nextNo, product_name: product, status: 'B', meter_reading: '' }]);
  };

  const removeNozzle = async (nz: NozzleItem) => {
    const inPump = nozzles.filter((n) => n.pump_number === nz.pump_number);
    if (inPump.length === 1) {
      await removePump(nz.pump_number);
      return;
    }
    setNozzles(nozzles.filter((n) => n.id !== nz.id));
  };

  const bbmOptions = [
    "Pertalite (RON 90)",
    "Pertamax (RON 92)",
    "Pertamax Turbo (RON 98)",
    "Pertamax Green 95",
    "Solar / Biosolar (B35)",
    "Dexlite (CN 51)",
    "Pertamina Dex (CN 53)",
  ];

  const atgBrands = [
    "Veeder-Root TLS-450 Plus",
    "Veeder-Root TLS-350",
    "Gilbarco Veeder-Root",
    "Franklin Fueling INCON TS-550",
    "OPW Fuel Management",
    "Meggitt FMS",
    "Lainnya / Standalone",
  ];

  return (
    <div className="space-y-6">
      {/* Dispenser, Controller & Metrology Legal Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Fuel className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Forecourt Controller & Dispenser Interface
            </h2>
            <p className="text-xs text-slate-500">
              Unit dispenser pompa, kotak komunikasi loop FMS, dan segel tera metrologi legal
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Jumlah Pump / Dispenser</span>
            <span className="text-lg font-black font-mono text-slate-900">{pumpNumbers.length}</span>
            <span className="block text-[11px] text-slate-500">Otomatis dari daftar pump di bawah</span>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Total Nozzle</span>
            <span className="text-lg font-black font-mono text-slate-900">{nozzles.length}</span>
            <span className="block text-[11px] text-slate-500">Otomatis dari daftar nozzle</span>
          </div>

          <div>
            <label 
              htmlFor="atg-brand-select"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Merek / Model ATG
            </label>
            <select
              id="atg-brand-select"
              value={report.forecourt.atg_brand}
              onChange={(e) => updateForecourt('atg_brand', e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            >
              {atgBrands.map((brand) => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Koneksi Konsol ATG ke POS
            </span>
            <StatusSelector
              value={report.forecourt.atg_controller_status}
              onChange={(val) => updateForecourt('atg_controller_status', val)}
            />
          </div>
        </div>

        {/* Extended Controller & Metrology Checks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-blue-700" />
                Interface Loop Converter Dispenser ke POS
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Kotak konversi RS485 / Current Loop pengontrol komunikasi data dispenser
              </p>
            </div>
            <StatusSelector
              value={report.forecourt.dispenser_interface_box || 'B'}
              onChange={(val) => updateForecourt('dispenser_interface_box', val)}
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-700" />
                Segel Tera Metrologi Legal Dispenser
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pemeriksaan fisik kawat dan timah segel tera resmi agar takaran BBM valid
              </p>
            </div>
            <StatusSelector
              value={report.forecourt.metrology_seal_status || 'B'}
              onChange={(val) => updateForecourt('metrology_seal_status', val)}
            />
          </div>
        </div>
      </div>

      {/* Detail Tangki Pendam & Sensor ATG */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-blue-800 flex-shrink-0" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Pemeriksaan Sensor Tangki Pendam (ATG Probes)
              </h2>
              <p className="text-xs text-slate-500">
                Status sensor ketinggian BBM, water sensor (deteksi air dasar tangki), dan temperatur
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={addTank}
            className="min-h-[44px] px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Tangki</span>
          </button>
        </div>

        <div className="space-y-4">
          {report.forecourt.tanks.map((tank, idx) => (
            <div
              key={tank.id}
              className="border border-slate-200 rounded-lg p-3 sm:p-4 bg-slate-50/70 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="bg-[#0B2545] text-white text-xs font-bold px-2 py-0.5 rounded">
                    {tank.tank_number}
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {tank.product_name}
                  </span>
                </div>

                {report.forecourt.tanks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTank(idx)}
                    className="min-h-[36px] px-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded text-xs font-medium flex items-center gap-1"
                    title="Hapus Tangki"
                    aria-label="Hapus Tangki"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Hapus</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Label / No Tangki
                  </label>
                  <input
                    type="text"
                    value={tank.tank_number}
                    onChange={(e) => updateTank(idx, { tank_number: e.target.value })}
                    className="w-full min-h-[44px] px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Produk BBM
                  </label>
                  <select
                    value={tank.product_name}
                    onChange={(e) => updateTank(idx, { product_name: e.target.value })}
                    className="w-full min-h-[44px] px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900"
                  >
                    {bbmOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Kapasitas (Liter)
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={tank.capacity_liters}
                    onChange={(e) => updateTank(idx, { capacity_liters: parseInt(e.target.value, 10) || 0 })}
                    className="w-full min-h-[44px] px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono text-slate-900"
                  />
                </div>

                <div>
                  <span className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Sensor Ketinggian
                  </span>
                  <StatusSelector
                    value={tank.level_sensor_status}
                    onChange={(val) => updateTank(idx, { level_sensor_status: val })}
                    size="sm"
                  />
                </div>

                <div>
                  <span className="block text-[11px] font-semibold text-slate-600 uppercase mb-1 flex items-center gap-1 text-red-700">
                    <Droplet className="w-3 h-3" />
                    Water Sensor
                  </span>
                  <StatusSelector
                    value={tank.water_sensor_status}
                    onChange={(val) => updateTank(idx, { water_sensor_status: val })}
                    size="sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pumps & Nozzles */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-emerald-700 flex-shrink-0" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Pump & Nozzle</h2>
              <p className="text-xs text-slate-500">Tambahkan setiap pump yang ada di SPBU, lalu nozzle-nya (1 pump bisa 1, 2 nozzle atau lebih)</p>
            </div>
          </div>

          <button
            type="button"
            onClick={addPump}
            className="min-h-[44px] px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Pump</span>
          </button>
        </div>

        {pumpNumbers.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-slate-300 rounded-lg">
            <p className="text-sm font-semibold text-slate-800">Belum ada pump</p>
            <p className="text-xs text-slate-500 mt-1">Tekan &quot;Tambah Pump&quot; untuk menambahkan pump pertama.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pumpNumbers.map((pumpNo) => {
              const pumpNozzles = nozzles.filter((n) => n.pump_number === pumpNo);
              return (
                <div key={pumpNo} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-100 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#0B2545] text-white text-xs font-bold px-2 py-0.5 rounded font-mono">Pump #{pumpNo}</span>
                      <span className="text-xs font-semibold text-slate-600">{pumpNozzles.length} nozzle</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePump(pumpNo)}
                      className="min-h-[40px] px-2.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded text-xs font-semibold flex items-center gap-1"
                      aria-label={`Hapus Pump #${pumpNo}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Pump</span>
                    </button>
                  </div>

                  <div className="p-3 space-y-3">
                    {pumpNozzles.map((nz) => {
                      const productOptions = bbmOptions.includes(nz.product_name) ? bbmOptions : [nz.product_name, ...bbmOptions];
                      return (
                        <div key={nz.id} className="border border-slate-200 rounded-md p-3 bg-slate-50/60">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-bold text-slate-900">Nozzle {nz.nozzle_number}</span>
                            <button
                              type="button"
                              onClick={() => removeNozzle(nz)}
                              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Hapus Nozzle"
                              aria-label={`Hapus Nozzle ${nz.nozzle_number} Pump #${pumpNo}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Produk BBM</label>
                              <select
                                value={nz.product_name}
                                onChange={(e) => updateNozzle(nz.id, { product_name: e.target.value })}
                                className="w-full min-h-[44px] px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900"
                              >
                                {productOptions.map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Angka Totalizer (L)</label>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={nz.meter_reading}
                                onChange={(e) => updateNozzle(nz.id, { meter_reading: e.target.value })}
                                placeholder="Contoh: 142520"
                                className="w-full min-h-[44px] px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono text-slate-900"
                              />
                            </div>
                            <div>
                              <span className="block text-[11px] font-semibold text-slate-600 mb-1">Kondisi Nozzle</span>
                              <StatusSelector value={nz.status} onChange={(val) => updateNozzle(nz.id, { status: val })} size="sm" />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => addNozzle(pumpNo)}
                      className="w-full min-h-[44px] border border-dashed border-slate-400 hover:border-slate-600 hover:bg-slate-50 rounded-md text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Nozzle di Pump #{pumpNo}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
