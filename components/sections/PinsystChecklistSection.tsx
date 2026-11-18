'use client';

import React from 'react';
import { AutoTextarea } from '@/components/ui/AutoTextarea';
import { PMReport, PinsystFeatureCheck, FeatureStatus } from '@/lib/types';
import { CheckSquare, AlertCircle, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';

interface PinsystChecklistSectionProps {
  report: PMReport;
  onChange: (updated: PMReport) => void;
}

export const PinsystChecklistSection: React.FC<PinsystChecklistSectionProps> = ({
  report,
  onChange,
}) => {
  const updateFeature = (index: number, updated: Partial<PinsystFeatureCheck>) => {
    const list = [...report.features_checklist];
    list[index] = { ...list[index], ...updated };
    onChange({
      ...report,
      features_checklist: list,
    });
  };

  const statusOptions: { key: FeatureStatus; label: string; activeClass: string; icon: React.ElementType }[] = [
    {
      key: 'OK',
      label: 'Normal / OK',
      activeClass: 'bg-emerald-600 text-white ring-1 ring-emerald-600 shadow-sm',
      icon: CheckCircle2,
    },
    {
      key: 'ISSUE',
      label: 'Ada Kendala',
      activeClass: 'bg-red-600 text-white ring-1 ring-red-600 shadow-sm',
      icon: XCircle,
    },
    {
      key: 'NA',
      label: 'Tidak Dipakai',
      activeClass: 'bg-slate-700 text-white ring-1 ring-slate-700 shadow-sm',
      icon: MinusCircle,
    },
  ];

  const totalOk = report.features_checklist.filter((f) => f.status === 'OK').length;
  const totalIssue = report.features_checklist.filter((f) => f.status === 'ISSUE').length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Pemeriksaan Fitur Aplikasi POS & PINSYST (11 Modul Wajib)
              </h2>
              <p className="text-xs text-slate-500">
                Verifikasi fungsional transaksi kasir, RFID MyPertamina, tera takar, dan pelaporan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold">
            <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded border border-emerald-300">
              OK: {totalOk} / 11
            </span>
            {totalIssue > 0 && (
              <span className="bg-red-100 text-red-800 px-2.5 py-1 rounded border border-red-300">
                Kendala: {totalIssue}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {report.features_checklist.map((feat, idx) => {
            const hasIssue = feat.status === 'ISSUE';

            return (
              <div
                key={feat.id}
                className={`border rounded-lg p-3 sm:p-4 transition-all ${
                  hasIssue
                    ? 'border-red-300 bg-red-50/40 ring-1 ring-red-200'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Header item */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-[#0B2545] text-white px-2 py-0.5 rounded whitespace-nowrap flex-shrink-0">
                        {feat.code}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        {feat.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {feat.description}
                    </p>
                  </div>

                  {/* Status Toggle Buttons */}
                  <div
                    role="radiogroup"
                    aria-label={`Status ${feat.title}`}
                    className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-1 flex-shrink-0 self-start sm:self-auto"
                  >
                    {statusOptions.map((opt) => {
                      const isSelected = feat.status === opt.key;
                      const Icon = opt.icon;

                      return (
                        <button
                          key={opt.key}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => updateFeature(idx, { status: opt.key })}
                          className={`min-h-[44px] px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            isSelected
                              ? opt.activeClass
                              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Findings & Action inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label 
                      htmlFor={`findings-input-${feat.id}`}
                      className="block text-[11px] font-semibold text-slate-600 uppercase mb-1"
                    >
                      Hasil Temuan Pengujian
                    </label>
                    <AutoTextarea
                      id={`findings-input-${feat.id}`}
                      value={feat.findings}
                      onChange={(e) => updateFeature(idx, { findings: e.target.value })}
                      placeholder="Tuliskan temuan teknis saat pengujian..."
                      className="w-full min-h-[44px] px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label 
                      htmlFor={`corrective-action-input-${feat.id}`}
                      className="block text-[11px] font-semibold text-slate-600 uppercase mb-1"
                    >
                      Tindakan Korektif / Rekomendasi
                    </label>
                    <AutoTextarea
                      id={`corrective-action-input-${feat.id}`}
                      value={feat.corrective_action}
                      onChange={(e) => updateFeature(idx, { corrective_action: e.target.value })}
                      placeholder="Tindakan yang telah atau harus dilakukan..."
                      className="w-full min-h-[44px] px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

