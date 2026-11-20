'use client';

import React from 'react';
import { AutoTextarea } from '@/components/ui/AutoTextarea';
import { PMReport, PeripheralsInventory, ChecklistStatus } from '@/lib/types';
import { StatusSelector } from '../StatusSelector';
import { Monitor, Printer, QrCode, DollarSign, Scissors, Flame } from 'lucide-react';

interface PeripheralsSectionProps {
  report: PMReport;
  onChange: (updated: PMReport) => void;
}

export const PeripheralsSection: React.FC<PeripheralsSectionProps> = ({
  report,
  onChange,
}) => {
  const updatePeripherals = <K extends keyof PeripheralsInventory>(
    key: K,
    val: PeripheralsInventory[K]
  ) => {
    onChange({
      ...report,
      peripherals: {
        ...report.peripherals,
        [key]: val,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Printer className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Pemeriksaan Periferal POS Kasir
            </h2>
            <p className="text-xs text-slate-500">
              Monitor PC POS PINSYST, printer struk thermal, barcode reader, dan laci kasir otomatis
            </p>
          </div>
        </div>

        <div className="space-y-5 divide-y divide-slate-100">
          
          {/* 1. Monitor PC POS PINSYST */}
          <div className="pt-2 grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
            <div>
              <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-blue-800" />
                1. Monitor PC POS PINSYST
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Kejernihan tampilan, dead pixel, kabel video & daya monitor PC POS PINSYST
              </p>
            </div>

            <div>
              <StatusSelector
                label="Status Operasional Monitor"
                value={report.peripherals.display_touchscreen.status}
                onChange={(val) =>
                  updatePeripherals('display_touchscreen', {
                    ...report.peripherals.display_touchscreen,
                    status: val,
                  })
                }
              />
            </div>

            <div>
              <label 
                htmlFor="display-touchscreen-notes-input"
                className="block text-xs font-semibold text-slate-700 uppercase mb-1"
              >
                Catatan Monitor
              </label>
              <AutoTextarea
                id="display-touchscreen-notes-input"
                value={report.peripherals.display_touchscreen.notes}
                onChange={(e) =>
                  updatePeripherals('display_touchscreen', {
                    ...report.peripherals.display_touchscreen,
                    notes: e.target.value,
                  })
                }
                placeholder="Contoh: Tampilan jernih, tidak ada garis / flicker"
                className="w-full min-h-[44px] px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900"
              />
            </div>
          </div>

          {/* 2. Receipt Printer */}
          <div className="pt-4 space-y-3">
            <div>
              <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-red-600" />
                2. Receipt Printer (Thermal Struk POS)
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemeriksaan mendalam komponen mekanik pencetak struk transaksi
              </p>
            </div>

            <StatusSelector
              label="Status Operasional Printer"
              value={report.peripherals.receipt_printer.status}
              onChange={(val) =>
                updatePeripherals('receipt_printer', {
                  ...report.peripherals.receipt_printer,
                  status: val,
                })
              }
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-600" />
                  Kondisi Thermal Head
                </span>
                <p className="text-[11px] text-slate-500 mb-1.5">
                  Ketajaman huruf, bebas garis putih putus
                </p>
                <StatusSelector
                  value={report.peripherals.receipt_printer.thermal_head}
                  onChange={(val) =>
                    updatePeripherals('receipt_printer', {
                      ...report.peripherals.receipt_printer,
                      thermal_head: val,
                    })
                  }
                  size="sm"
                />
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Scissors className="w-3.5 h-3.5 text-blue-700" />
                  Auto-Cutter (Pemotong Kertas)
                </span>
                <p className="text-[11px] text-slate-500 mb-1.5">
                  Pisau memotong rapi tanpa robek/macet
                </p>
                <StatusSelector
                  value={report.peripherals.receipt_printer.auto_cutter}
                  onChange={(val) =>
                    updatePeripherals('receipt_printer', {
                      ...report.peripherals.receipt_printer,
                      auto_cutter: val,
                    })
                  }
                  size="sm"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <label 
                  htmlFor="receipt-printer-notes-input"
                  className="block text-xs font-semibold text-slate-700 uppercase mb-1"
                >
                  Model & Catatan Printer
                </label>
                <textarea
                  id="receipt-printer-notes-input"
                  rows={2}
                  value={report.peripherals.receipt_printer.notes}
                  onChange={(e) =>
                    updatePeripherals('receipt_printer', {
                      ...report.peripherals.receipt_printer,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Contoh: Epson TM-T82, pisau telah dibersihkan"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* 3. Barcode Scanner */}
          <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
            <div>
              <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-slate-700" />
                3. Barcode Scanner
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Kecepatan dan ketepatan pembacaan barcode
              </p>
            </div>

            <div>
              <StatusSelector
                label="Status Operasional Scanner"
                value={report.peripherals.barcode_scanner.status}
                onChange={(val) =>
                  updatePeripherals('barcode_scanner', {
                    ...report.peripherals.barcode_scanner,
                    status: val,
                  })
                }
              />
            </div>

            <div>
              <label 
                htmlFor="barcode-scanner-notes-input"
                className="block text-xs font-semibold text-slate-700 uppercase mb-1"
              >
                Catatan Scanner
              </label>
              <AutoTextarea
                id="barcode-scanner-notes-input"
                value={report.peripherals.barcode_scanner.notes}
                onChange={(e) =>
                  updatePeripherals('barcode_scanner', {
                    ...report.peripherals.barcode_scanner,
                    notes: e.target.value,
                  })
                }
                placeholder="Contoh: Honeywell 1470g, laser terang"
                className="w-full min-h-[44px] px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900"
              />
            </div>
          </div>

          {/* 4. Cash Drawer */}
          <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
            <div>
              <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-700" />
                4. Cash Drawer (Laci Uang Kasir)
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Kabel RJ11 trigger buka otomatis dan rel geser mekanik laci
              </p>
            </div>

            <div>
              <StatusSelector
                label="Status Operasional Cash Drawer"
                value={report.peripherals.cash_drawer.status}
                onChange={(val) =>
                  updatePeripherals('cash_drawer', {
                    ...report.peripherals.cash_drawer,
                    status: val,
                  })
                }
              />
            </div>

            <div>
              <label 
                htmlFor="cash-drawer-notes-input"
                className="block text-xs font-semibold text-slate-700 uppercase mb-1"
              >
                Catatan Cash Drawer
              </label>
              <AutoTextarea
                id="cash-drawer-notes-input"
                value={report.peripherals.cash_drawer.notes}
                onChange={(e) =>
                  updatePeripherals('cash_drawer', {
                    ...report.peripherals.cash_drawer,
                    notes: e.target.value,
                  })
                }
                placeholder="Contoh: Terbuka otomatis saat transaksi tunai"
                className="w-full min-h-[44px] px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900"
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

