'use client';

import { WORK_TYPE_LABEL } from '@/lib/work-type';
import React, { useState } from 'react';
import { ModalPortal } from '@/components/ui/ModalPortal';
import { TabKey, tabOrderFor } from './SectionTabs';
import { PMReport } from '@/lib/types';
import { Save, ChevronLeft, ChevronRight, CheckCircle, FileText, AlertCircle, Home } from 'lucide-react';

interface BottomBarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  report: PMReport;
  onSaveDraft: () => void;
  onSubmitReport: () => void;
  onViewPdf: () => void;
  onBackToLanding: () => void;
  /** Admin is revising a finalised BA */
  adminEdit?: boolean;
  onCancelEdit?: () => void;
  /** Items still missing before the BA may be finalised */
  missing?: string[];
}

export const BottomBar: React.FC<BottomBarProps> = ({
  activeTab,
  onSelectTab,
  report,
  onSaveDraft,
  onSubmitReport,
  onViewPdf,
  onBackToLanding,
  adminEdit = false,
  onCancelEdit,
  missing = [],
}) => {
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const tabOrder = tabOrderFor(report.work_type);

  const currentIndex = tabOrder.indexOf(activeTab);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < tabOrder.length - 1;

  const handlePrev = () => {
    if (hasPrev) onSelectTab(tabOrder[currentIndex - 1]);
    else onBackToLanding();
  };

  const handleNext = () => {
    if (hasNext) onSelectTab(tabOrder[currentIndex + 1]);
  };


  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-300 shadow-lg px-3 pt-2 pb-safe-2 sm:px-6 lg:pl-64 xl:pl-72">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          
          {/* Previous / Back to Initiation Button */}
          <button
            type="button"
            onClick={handlePrev}
            className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-md border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 transition-colors"
            title={hasPrev ? "Langkah Sebelumnya" : "Kembali ke Pemilihan Kegiatan"}
            aria-label={hasPrev ? "Langkah Sebelumnya" : "Kembali ke Pemilihan Kegiatan"}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{hasPrev ? 'Sebelumnya' : 'Halaman Depan'}</span>
          </button>

          {/* Center Actions: Save Draft & Step Indicator */}
          <div className="flex items-center gap-2">
            {adminEdit ? (
              <button
                type="button"
                onClick={onCancelEdit}
                className="min-h-[44px] px-3 sm:px-4 py-2 rounded-md border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                Batal
              </button>
            ) : (
            <button
              type="button"
              onClick={onSaveDraft}
              className="min-h-[44px] px-3 sm:px-4 py-2 rounded-md border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Save className="w-4 h-4 text-blue-700" />
              <span className="hidden min-[380px]:inline">Simpan Draft</span>
              <span className="min-[380px]:hidden">Simpan</span>
            </button>
            )}

            <span className="text-xs font-mono font-bold text-slate-500 hidden md:inline">
              Langkah {currentIndex >= 0 ? currentIndex + 1 : 1} dari {tabOrder.length}
            </span>
            <span className="text-[11px] font-mono font-bold text-slate-500 md:hidden" aria-label={`Langkah ${currentIndex + 1} dari ${tabOrder.length}`}>
              {currentIndex >= 0 ? currentIndex + 1 : 1}/{tabOrder.length}
            </span>
          </div>

          {/* Right Action: Next Step OR Finalize Submit */}
          <div className="flex items-center gap-2">
            {hasNext ? (
              <button
                type="button"
                onClick={handleNext}
                className="min-h-[44px] px-4 py-2 rounded-md bg-[#0B2545] hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <span>Lanjut</span>
                <ChevronRight className="w-4 h-4 text-red-400" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => (adminEdit ? onSubmitReport() : setShowSubmitModal(true))}
                className="min-h-[44px] px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <CheckCircle className="w-4 h-4" />
                <span className="hidden min-[380px]:inline">{adminEdit ? 'Simpan Revisi' : 'Finalisasi Laporan'}</span>
                <span className="min-[380px]:hidden">{adminEdit ? 'Simpan' : 'Finalisasi'}</span>
              </button>
            )}
          </div>

        </div>
      </footer>

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <ModalPortal><div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-slate-300 overflow-hidden">
            <div className="p-4 bg-[#0B2545] text-white">
              <h3 className="text-base font-bold">Konfirmasi Pengesahan Pekerjaan</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Pengiriman dokumen Berita Acara ke Google Drive & Database Turso
              </p>
            </div>

            <div className="p-4 space-y-3 text-xs text-slate-700">
              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1">
                <div className="flex justify-between gap-3">
                  <span className="font-semibold text-slate-500">Jenis Kegiatan:</span>
                  <span className="font-bold text-red-700">
                    {WORK_TYPE_LABEL[report.work_type] || report.work_type}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="font-semibold text-slate-500">Site SPBU:</span>
                  <span className="font-bold text-slate-900 text-right">{report.site_name}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="font-semibold text-slate-500">Terminal POS:</span>
                  <span className="font-mono font-bold text-blue-900">{report.terminal_id}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="font-semibold text-slate-500">PWS Bertugas:</span>
                  <span className="font-bold text-slate-900">{report.supervisor_name}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="font-semibold text-slate-500">Teknisi:</span>
                  <span className="font-bold text-slate-900 text-right">{report.technician_name}</span>
                </div>
              </div>

              {missing.length > 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Belum dapat difinalisasi. Lengkapi dulu:</div>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      {missing.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-red-50 border border-red-300 rounded text-red-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" />
                  <span>
                    Setelah difinalisasi, Berita Acara <strong>terkunci</strong> dan tidak dapat diubah lagi oleh Teknisi maupun Pengawas.
                    Perubahan hanya dapat dilakukan oleh Admin. Pastikan semua data dan tanda tangan sudah benar.
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="min-h-[44px] px-3.5 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded font-semibold text-xs"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={missing.length > 0}
                onClick={() => {
                  setShowSubmitModal(false);
                  onSubmitReport();
                  onViewPdf();
                }}
                className="min-h-[44px] px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Finalisasi & Kunci</span>
              </button>
            </div>
          </div>
        </div></ModalPortal>
      )}
    </>
  );
};
