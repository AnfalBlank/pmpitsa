'use client';

import React from 'react';
import { PMReport, SoftwareInventory } from '@/lib/types';
import { StatusSelector } from '../StatusSelector';
import { Terminal, Shield, Info, CheckCircle2, Database } from 'lucide-react';

interface SoftwareSectionProps {
  report: PMReport;
  onChange: (updated: PMReport) => void;
}

export const SoftwareSection: React.FC<SoftwareSectionProps> = ({
  report,
  onChange,
}) => {
  const updateSoftware = <K extends keyof SoftwareInventory>(
    key: K,
    val: SoftwareInventory[K]
  ) => {
    onChange({
      ...report,
      software: {
        ...report.software,
        [key]: val,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Terminal className="w-5 h-5 text-blue-800 flex-shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Inventaris Versi Software & Sistem PINSYST
            </h2>
            <p className="text-xs text-slate-500">
              Pencatatan rilis aktif modul PINSYST, background server, dan sistem operasi
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* POS PINSYST App */}
          <div>
            <label 
              htmlFor="pos-pinsyst-version-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              1. Versi Aplikasi POS PINSYST <span className="text-red-500">*</span>
            </label>
            <input
              id="pos-pinsyst-version-input"
              type="text"
              required
              value={report.software.pos_pinsyst_version}
              onChange={(e) => updateSoftware('pos_pinsyst_version', e.target.value)}
              placeholder="Contoh: v3.8.4-build24"
              className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-mono text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Lihat di menu About / Bantuan pada aplikasi POS PINSYST
            </span>
          </div>

          {/* PINSYST Printer Server */}
          <div>
            <label 
              htmlFor="printer-server-version-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              2. PINSYST Printer Server <span className="text-red-500">*</span>
            </label>
            <input
              id="printer-server-version-input"
              type="text"
              required
              value={report.software.printer_server_version}
              onChange={(e) => updateSoftware('printer_server_version', e.target.value)}
              placeholder="Contoh: v2.2.1"
              className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-mono text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Service spooler thermal printer yang berjalan di background
            </span>
          </div>

          {/* Modul Export */}
          <div>
            <label 
              htmlFor="export-module-version-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              3. Modul Export Data
            </label>
            <input
              id="export-module-version-input"
              type="text"
              value={report.software.export_module_version}
              onChange={(e) => updateSoftware('export_module_version', e.target.value)}
              placeholder="Contoh: v1.9.0"
              className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-mono text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Modul pengiriman report shift & totalizer ke server back-office
            </span>
          </div>

          {/* Modul IMEX */}
          <div>
            <label 
              htmlFor="imex-module-version-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              4. Modul IMEX (Import/Export Master Data)
            </label>
            <input
              id="imex-module-version-input"
              type="text"
              value={report.software.imex_module_version}
              onChange={(e) => updateSoftware('imex_module_version', e.target.value)}
              placeholder="Contoh: v2.1.2"
              className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-mono text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Pembaruan harga BBM, master kasir, dan katalog produk
            </span>
          </div>

          {/* Operating System */}
          <div>
            <label 
              htmlFor="operating-system-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              5. Sistem Operasi (OS) & Versi Build
            </label>
            <input
              id="operating-system-input"
              type="text"
              value={report.software.operating_system}
              onChange={(e) => updateSoftware('operating_system', e.target.value)}
              placeholder="Contoh: Windows 10 IoT Enterprise LTSC / Ubuntu Linux"
              className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-mono text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Database Backup Verification */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between gap-1.5">
            <div>
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-700" />
                6. Status Cadangan Database Lokal (Daily Backup)
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pemeriksaan ketersediaan file backup database harian di folder arsip POS
              </p>
            </div>
            <StatusSelector
              value={report.software.database_backup_status || 'B'}
              onChange={(val) => updateSoftware('database_backup_status', val)}
            />
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label 
              htmlFor="software-notes-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Catatan Khusus Software / Patch Terpasang
            </label>
            <textarea
              id="software-notes-input"
              rows={3}
              value={report.software.notes}
              onChange={(e) => updateSoftware('notes', e.target.value)}
              placeholder="Tuliskan catatan update versi atau kendala lisensi jika ada..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Verification Checklist Tip */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-2 text-xs text-blue-900">
          <Shield className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
          <span>
            Standar Pertamina International Timor, S.A. mewajibkan seluruh terminal POS dalam satu site SPBU menjalankan versi aplikasi POS PINSYST dan Modul IMEX yang seragam untuk menjaga integritas transaksi BBM dan akurasi rekonsiliasi totalizer.
          </span>
        </div>
      </div>
    </div>
  );
};
