'use client';

import React from 'react';
import { ChecklistStatus } from '@/lib/types';

interface StatusSelectorProps {
  value: ChecklistStatus;
  onChange: (value: ChecklistStatus) => void;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export const StatusSelector: React.FC<StatusSelectorProps> = ({
  value,
  onChange,
  label,
  size = 'md',
  disabled = false,
}) => {
  const options: { key: ChecklistStatus; label: string; full: string; activeClass: string }[] = [
    {
      key: 'B',
      label: 'B',
      full: 'Baik (Normal)',
      activeClass: 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-1 ring-emerald-600',
    },
    {
      key: 'R',
      label: 'R',
      full: 'Rusak (Perlu Perbaikan)',
      activeClass: 'bg-red-600 text-white border-red-700 shadow-sm ring-1 ring-red-600',
    },
    {
      key: 'X',
      label: 'X',
      full: 'Tidak Ada / N/A',
      activeClass: 'bg-slate-700 text-white border-slate-800 shadow-sm ring-1 ring-slate-700',
    },
  ];

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-xs font-semibold text-slate-700">
          {label}
        </span>
      )}
      <div
        role="radiogroup"
        aria-label={label || "Status Checklist"}
        className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-1 w-full sm:w-auto"
      >
        {options.map((opt) => {
          const isSelected = value === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(opt.key)}
              title={`${opt.label}: ${opt.full}`}
              className={`flex-1 sm:flex-initial min-w-[52px] min-h-[44px] px-3 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 ${
                isSelected
                  ? opt.activeClass
                  : 'bg-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className="text-sm font-black">{opt.label}</span>
              <span className="text-[11px] font-medium hidden xs:inline sm:inline">
                {opt.key === 'B' ? 'Baik' : opt.key === 'R' ? 'Rusak' : 'N/A'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

