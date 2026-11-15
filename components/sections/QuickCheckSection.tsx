'use client';

import React from 'react';
import { PMReport, QuickCheckDetails } from '@/lib/types';
import { StatusSelector } from '../StatusSelector';
import { Activity, Monitor, Fuel, CreditCard, Gauge, Printer, CheckCircle2, ShieldCheck } from 'lucide-react';

interface QuickCheckSectionProps {
  report: PMReport;
  onChange: (updated: PMReport) => void;
}

export const QuickCheckSection: React.FC<QuickCheckSectionProps> = ({
  report,
  onChange,
}) => {
  const details = report.quick_check_details || {
    pos_system_online: 'B',
    dispenser_communication: 'B',
    edc_transaction_ready: 'B',
    atg_tank_monitor: 'B',
    printer_thermal_status: 'B',
    general_notes: 'Fungsi utama transaksi kasir dan pompa dispenser siap melayani pelanggan.',
  };

  const updateDetails = <K extends keyof QuickCheckDetails>(key: K, val: QuickCheckDetails[K]) => {
    onChange({
      ...report,
      quick_check_details: {
        ...details,
        [key]: val,
      },
    });
  };

  const checkItems = [
    {
      key: 'pos_system_online' as const,
      label: '1. Sistem POS PINSYST Online & Sinkron',
      desc: 'Aplikasi kasir aktif, terhubung ke server back-office, tidak ada antrean sinkronisasi macet.',
      icon: Monitor,
    },
    {
      key: 'dispenser_communication' as const,
      label: '2. Komunikasi Forecourt & Loop Dispenser',
      desc: 'Seluruh nozzle dispenser merespons otorisasi pompa dan pembacaan totalizer.',
      icon: Fuel,
    },
    {
      key: 'edc_transaction_ready' as const,
      label: '3. Mesin EDC & Pembayaran Non-Tunai',
      desc: 'Unit EDC menyala, sinyal kartu perbankan aktif, siap memproses transaksi debit/kredit/QR.',
      icon: CreditCard,
    },
    {
      key: 'atg_tank_monitor' as const,
      label: '4. Monitor Tangki Pendam ATG (Veeder-Root / Gilbarco)',
      desc: 'Ketinggian BBM terbaca akurat pada konsol, water sensor tidak memicu alarm air.',
      icon: Gauge,
    },
    {
      key: 'printer_thermal_status' as const,
      label: '5. Printer Struk POS & Kertas Thermal',
      desc: 'Kertas thermal terpasang cukup, hasil cetak struk pekat dan pisau auto-cutter tajam.',
      icon: Printer,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Activity className="w-5 h-5 text-blue-800 flex-shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Checklist Pengecekan Cepat Kesiapan Operasional SPBU
            </h2>
            <p className="text-xs text-slate-500">
              Verifikasi 5 pilar utama operasional POS PINSYST & FMS
            </p>
          </div>
        </div>

        <div className="space-y-4 divide-y divide-slate-100">
          {checkItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className="pt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Icon className="w-4 h-4 text-blue-700" />
                    {item.label}
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.desc}
                  </p>
                </div>

                <StatusSelector
                  value={details[item.key]}
                  onChange={(val) => updateDetails(item.key, val)}
                />
              </div>
            );
          })}

          <div className="pt-4">
            <label 
              htmlFor="quick-check-notes"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Catatan Hasil Pengecekan Cepat
            </label>
            <textarea
              id="quick-check-notes"
              rows={3}
              value={details.general_notes}
              onChange={(e) => updateDetails('general_notes', e.target.value)}
              placeholder="Catatan temuan penting saat pengecekan shift atau harian..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-xs text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
          <span>
            Pengecekan cepat ini dirancang untuk memastikan kesiapan pos transaksi kasir dan forecourt SPBU Pertamina International Timor, S.A. sebelum pergantian shift operasional.
          </span>
        </div>
      </div>
    </div>
  );
};

