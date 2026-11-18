'use client';

import React from 'react';
import { MasterSelect } from '@/components/ui/MasterSelect';
import { hardwareOptions, useMasterData } from '@/lib/use-master-config';
import { PMReport, HardwareSpecs, ChecklistStatus } from '@/lib/types';
import { StatusSelector } from '../StatusSelector';
import { Cpu, HardDrive, Fan, Wind, AlertTriangle } from 'lucide-react';

interface HardwareSectionProps {
  report: PMReport;
  onChange: (updated: PMReport) => void;
}

export const HardwareSection: React.FC<HardwareSectionProps> = ({
  report,
  onChange,
}) => {
  const master = useMasterData();
  const updateHardware = <K extends keyof HardwareSpecs>(
    key: K,
    val: HardwareSpecs[K]
  ) => {
    onChange({
      ...report,
      hardware: {
        ...report.hardware,
        [key]: val,
      },
    });
  };

  const freePercentage = Math.round(
    (report.hardware.storage_free_gb / Math.max(report.hardware.storage_capacity_gb, 1)) * 100
  );

  return (
    <div className="space-y-6">
      {/* Specs Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Cpu className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Spesifikasi Hardware PC Terminal POS
            </h2>
            <p className="text-xs text-slate-500">
              Inventaris motherboard, processor, memori RAM, dan media penyimpanan
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label 
              htmlFor="pc-brand-model-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Merek & Model PC / Terminal POS <span className="text-red-500">*</span>
            </label>
            <MasterSelect
              id="pc-brand-model-input"
              value={report.hardware.pc_brand_model}
              onChange={(v) => updateHardware('pc_brand_model', v)}
              options={hardwareOptions(master.hardwareConfigs, 'POS')}
              placeholder="— Pilih model PC POS —"
              customPlaceholder="Merek & model PC POS"
              hint="Daftar dari Konfigurasi › Hardware & POS"
            />
          </div>

          <div>
            <label 
              htmlFor="cpu-spec-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Tipe Processor (CPU)
            </label>
            <input
              id="cpu-spec-input"
              type="text"
              value={report.hardware.cpu}
              onChange={(e) => updateHardware('cpu', e.target.value)}
              placeholder="Contoh: Intel Core i3-1115G4"
              className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-mono text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label 
              htmlFor="ram-gb-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Kapasitas RAM (GB)
            </label>
            <input
              id="ram-gb-input"
              type="number"
              min={2}
              max={64}
              value={report.hardware.ram_gb}
              onChange={(e) => updateHardware('ram_gb', parseInt(e.target.value, 10) || 0)}
              className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-mono text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label 
              htmlFor="storage-type-select"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Tipe Media Penyimpanan
            </label>
            <select
              id="storage-type-select"
              value={report.hardware.storage_type}
              onChange={(e) => updateHardware('storage_type', e.target.value as 'SSD' | 'HDD')}
              className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            >
              <option value="SSD">SSD (direkomendasikan)</option>
              <option value="HDD">HDD (Hard Disk Drive)</option>
            </select>
          </div>

          <div>
            <label 
              htmlFor="storage-capacity-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Kapasitas Total Disk (GB)
            </label>
            <input
              id="storage-capacity-input"
              type="number"
              min={32}
              value={report.hardware.storage_capacity_gb}
              onChange={(e) => updateHardware('storage_capacity_gb', parseInt(e.target.value, 10) || 0)}
              className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-mono text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="sm:col-span-2">
            <label 
              htmlFor="storage-free-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Ruang Bebas / Free Space Disk (GB)
            </label>
            <div className="space-y-2">
              <input
                id="storage-free-input"
                type="number"
                min={0}
                max={report.hardware.storage_capacity_gb}
                value={report.hardware.storage_free_gb}
                onChange={(e) => updateHardware('storage_free_gb', parseInt(e.target.value, 10) || 0)}
                className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-mono text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
              
              {/* Storage Health Gauge */}
              <div className="bg-slate-100 p-2.5 rounded border border-slate-200">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5" />
                    Sisa Kapasitas: {report.hardware.storage_free_gb} GB / {report.hardware.storage_capacity_gb} GB
                  </span>
                  <span className={freePercentage < 15 ? 'text-red-600 font-bold' : 'text-emerald-700'}>
                    {freePercentage}% Bebas
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      freePercentage < 15 ? 'bg-red-600' : freePercentage < 30 ? 'bg-amber-500' : 'bg-emerald-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, 100 - freePercentage))}%` }}
                    title={`Terpakai: ${100 - freePercentage}%`}
                  />
                </div>
                {freePercentage < 15 && (
                  <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Peringatan: Free space kurang dari 15%. Segera bersihkan file dump/log lama.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Physical Inspection Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Fan className="w-5 h-5 text-slate-700 flex-shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Pemeriksaan Fisik & Kebersihan Internal PC
            </h2>
            <p className="text-xs text-slate-500">
              Status [B: Baik | R: Rusak | X: Tidak Ada] untuk kipas, pendingin, dan sirkulasi
            </p>
          </div>
        </div>

        <div className="space-y-4 divide-y divide-slate-100">
          
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Fan className="w-4 h-4 text-blue-700" />
                Kebersihan Kipas (Cooling Fan)
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Kondisi bilah kipas processor dan power supply dari tumpukan debu
              </p>
            </div>
            <StatusSelector
              value={report.hardware.fan_cleanliness}
              onChange={(val) => updateHardware('fan_cleanliness', val)}
            />
          </div>

          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-slate-700" />
                Kondisi Heatsink & Thermal Paste
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Sirip pendingin heatsink terpasang kencang dan tidak tersumbat kotoran
              </p>
            </div>
            <StatusSelector
              value={report.hardware.heatsink_condition}
              onChange={(val) => updateHardware('heatsink_condition', val)}
            />
          </div>

          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Wind className="w-4 h-4 text-emerald-700" />
                Sirkulasi Udara (Airflow Chasing)
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Ventilasi casing POS memiliki jarak cukup dari dinding kabinet meja kasir
              </p>
            </div>
            <StatusSelector
              value={report.hardware.airflow_condition}
              onChange={(val) => updateHardware('airflow_condition', val)}
            />
          </div>

          <div className="pt-4">
            <label 
              htmlFor="hardware-physical-notes-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Catatan Kondisi Fisik Hardware
            </label>
            <textarea
              id="hardware-physical-notes-input"
              rows={2}
              value={report.hardware.notes}
              onChange={(e) => updateHardware('notes', e.target.value)}
              placeholder="Tuliskan tindakan pembersihan blower atau pergantian fan jika dilakukan..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

