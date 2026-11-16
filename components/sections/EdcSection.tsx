'use client';

import React from 'react';
import { PMReport, EDCItem, ChecklistStatus } from '@/lib/types';
import { StatusSelector } from '../StatusSelector';
import { CreditCard, Plus, Trash2, ShieldCheck, AlertCircle, QrCode } from 'lucide-react';

interface EdcSectionProps {
  report: PMReport;
  onChange: (updated: PMReport) => void;
}

export const EdcSection: React.FC<EdcSectionProps> = ({
  report,
  onChange,
}) => {
  const updateEdcList = (list: EDCItem[]) => {
    onChange({
      ...report,
      edc_list: list,
    });
  };

  const updateEdcItem = (index: number, updated: Partial<EDCItem>) => {
    const list = [...report.edc_list];
    list[index] = { ...list[index], ...updated };
    updateEdcList(list);
  };

  const addEdcItem = () => {
    const nextNo = report.edc_list.length + 1;
    const newItem: EDCItem = {
      id: `EDC-${Date.now().toString().slice(-4)}`,
      brand_type: `Ingenico Move 2500 / Bank #${nextNo}`,
      serial_number: `SN-${Date.now().toString().slice(-8)}`,
      physical_status: 'B',
      connection_status: 'B',
      notes: 'Kondisi fisik bersih dan komunikasi data stabil.',
    };
    updateEdcList([...report.edc_list, newItem]);
  };

  const removeEdcItem = (index: number) => {
    const list = report.edc_list.filter((_, i) => i !== index);
    updateEdcList(list);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-800 flex-shrink-0" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Inventaris Mesin EDC & Nomor Seri (SN)
              </h2>
              <p className="text-xs text-slate-500">
                Pencatatan terminal perbankan, Serial Number, kondisi fisik, dan koneksi ke POS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs bg-slate-100 px-2.5 py-1 rounded font-semibold text-slate-700 border border-slate-200">
              Terpasang: {report.edc_list.length} Unit
            </span>
            <button
              type="button"
              onClick={addEdcItem}
              className="min-h-[44px] px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah EDC</span>
            </button>
          </div>
        </div>

        {report.edc_list.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-lg">
            <CreditCard className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              Belum ada mesin EDC terdata
            </p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Klik tombol di bawah untuk menambahkan data terminal EDC pertama di POS ini.
            </p>
            <button
              type="button"
              onClick={addEdcItem}
              className="min-h-[44px] px-4 py-2 bg-blue-700 text-white rounded text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Mesin EDC</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {report.edc_list.map((edc, idx) => (
              <div
                key={edc.id}
                className="border border-slate-200 rounded-lg p-3 sm:p-4 bg-slate-50/60 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-red-700 text-white text-xs font-bold px-2 py-0.5 rounded">
                      EDC #{idx + 1}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {edc.serial_number || 'Tanpa Serial Number'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeEdcItem(idx)}
                    className="min-h-[36px] px-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded text-xs font-medium flex items-center gap-1"
                    title="Hapus unit EDC ini"
                    aria-label="Hapus unit EDC ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Hapus Unit</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Merek & Tipe EDC / Bank <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={edc.brand_type}
                      onChange={(e) => updateEdcItem(idx, { brand_type: e.target.value })}
                      placeholder="Contoh: Ingenico Move 2500 Mandiri"
                      className="w-full min-h-[44px] px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Nomor Seri (Serial Number - SN) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={edc.serial_number}
                      onChange={(e) => updateEdcItem(idx, { serial_number: e.target.value })}
                      placeholder="Contoh: SN-88291039"
                      className="w-full min-h-[44px] px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Wajib sesuai stiker barcode fisik di belakang unit
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Kondisi Fisik & Keypad
                    </span>
                    <StatusSelector
                      value={edc.physical_status}
                      onChange={(val) => updateEdcItem(idx, { physical_status: val })}
                      size="sm"
                    />
                  </div>

                  <div>
                    <span className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Koneksi Jaringan / POS
                    </span>
                    <StatusSelector
                      value={edc.connection_status}
                      onChange={(val) => updateEdcItem(idx, { connection_status: val })}
                      size="sm"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Catatan Unit EDC
                    </label>
                    <input
                      type="text"
                      value={edc.notes}
                      onChange={(e) => updateEdcItem(idx, { notes: e.target.value })}
                      placeholder="Keterangan kabel adapter, paper roll, atau kendala transaksi jika ada..."
                      className="w-full min-h-[44px] px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <span>
            Verifikasi fisik Serial Number (SN) EDC sangat krusial untuk pelacakan aset resmi perbankan partner Pertamina dan audit transaksi non-tunai di SPBU.
          </span>
        </div>
      </div>
    </div>
  );
};

