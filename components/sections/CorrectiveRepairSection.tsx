'use client';

import React from 'react';
import { PMReport, CorrectiveRepairDetails, ChecklistStatus } from '@/lib/types';
import { StatusSelector } from '../StatusSelector';
import { Wrench, AlertTriangle, CheckCircle2, ShieldAlert, Cpu, Hammer, Package } from 'lucide-react';

interface CorrectiveRepairSectionProps {
  report: PMReport;
  onChange: (updated: PMReport) => void;
}

export const CorrectiveRepairSection: React.FC<CorrectiveRepairSectionProps> = ({
  report,
  onChange,
}) => {
  const details = report.repair_details || {
    category: 'Printer / Scanner',
    reported_problem: '',
    root_cause: '',
    action_taken: '',
    sparepart_replaced: '',
    post_repair_status: 'B',
    notes: '',
  };

  const updateDetails = <K extends keyof CorrectiveRepairDetails>(
    key: K,
    val: CorrectiveRepairDetails[K]
  ) => {
    onChange({
      ...report,
      repair_details: {
        ...details,
        [key]: val,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Wrench className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Formulir Tindakan Perbaikan & Troubleshooting Lapangan
            </h2>
            <p className="text-xs text-slate-500">
              Pencatatan penanganan kendala, akar masalah teknis, dan penggantian sparepart
            </p>
          </div>
        </div>

        <div className="space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label 
                htmlFor="repair-category-select"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Komponen / Modul yang Bermasalah <span className="text-red-500">*</span>
              </label>
              <select
                id="repair-category-select"
                value={details.category}
                onChange={(e) => updateDetails('category', e.target.value as any)}
                className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              >
                <option value="Hardware POS">Hardware PC & Layar Sentuh POS Kasir</option>
                <option value="Printer / Scanner">Printer Struk Thermal / Auto-Cutter / Barcode Scanner</option>
                <option value="Dispenser & Forecourt">Dispenser Pompa / Nozzle / Interface Converter RS485</option>
                <option value="ATG & Tangki">Sensor Tangki ATG / Water Sensor Deteksi Air</option>
                <option value="EDC & Jaringan">Mesin EDC / Switch Router / Kabel LAN UTP</option>
                <option value="Lainnya">Catu Daya Listrik / UPS / E-Stop / Lainnya</option>
              </select>
            </div>

            <div>
              <label 
                htmlFor="repair-reported-problem"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Gejala Kerusakan yang Dilaporkan PWS / Kasir <span className="text-red-500">*</span>
              </label>
              <input
                id="repair-reported-problem"
                type="text"
                required
                value={details.reported_problem}
                onChange={(e) => updateDetails('reported_problem', e.target.value)}
                placeholder="Contoh: Auto-cutter printer macet / Nozzle 2 tidak merespons otorisasi"
                className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label 
              htmlFor="repair-root-cause"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Hasil Analisis Teknis & Akar Masalah (Root Cause) <span className="text-red-500">*</span>
            </label>
            <textarea
              id="repair-root-cause"
              rows={2}
              required
              value={details.root_cause}
              onChange={(e) => updateDetails('root_cause', e.target.value)}
              placeholder="Jelaskan penyebab teknis terjadinya kerusakan setelah dibongkar/diperiksa..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label 
              htmlFor="repair-action-taken"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Tindakan Servis / Perbaikan yang Dilakukan <span className="text-red-500">*</span>
            </label>
            <textarea
              id="repair-action-taken"
              rows={3}
              required
              value={details.action_taken}
              onChange={(e) => updateDetails('action_taken', e.target.value)}
              placeholder="Contoh: Pembersihan mekanisme pisau cutter, crimping ulang konektor RJ45, kalibrasi ulang probe sensor..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label 
                htmlFor="repair-sparepart"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5"
              >
                <Package className="w-4 h-4 text-slate-600" />
                Suku Cadang / Sparepart yang Diganti
              </label>
              <input
                id="repair-sparepart"
                type="text"
                value={details.sparepart_replaced}
                onChange={(e) => updateDetails('sparepart_replaced', e.target.value)}
                placeholder="Contoh: Adaptor 12V 5A / Thermal Head TM-T82 / Tidak ada penggantian"
                className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Tuliskan part number dan serial number baru jika ada penggantian
              </span>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Uji Fungsi Pasca Perbaikan (Final Testing)
              </span>
              <StatusSelector
                value={details.post_repair_status}
                onChange={(val) => updateDetails('post_repair_status', val)}
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Pilih [B: Normal Baik | R: Masih Terkendala | X: Menunggu Part]
              </span>
            </div>
          </div>

          <div className="pt-2">
            <label 
              htmlFor="repair-notes"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Catatan Rekomendasi ke PWS / Jadwal Pantau Lanjutan
            </label>
            <textarea
              id="repair-notes"
              rows={2}
              value={details.notes}
              onChange={(e) => updateDetails('notes', e.target.value)}
              placeholder="Instruksi penggunaan atau jadwal pengecekan ulang setelah perbaikan..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <span>
            Seluruh data penanganan kerusakan ini akan otomatis dilampirkan ke dalam Berita Acara Perbaikan Resmi Pertamina International Timor, S.A. dan ditandatangani oleh PWS yang bertugas.
          </span>
        </div>
      </div>
    </div>
  );
};

