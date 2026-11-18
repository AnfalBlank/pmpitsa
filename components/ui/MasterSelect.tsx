'use client';

import React, { useState } from 'react';

export interface MasterOption {
  value: string;
  label?: string;
  /** Optional grouping (rendered as <optgroup>) */
  group?: string;
}

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: MasterOption[];
  placeholder?: string;
  /** Allow typing a value that is not in master data (default true) */
  allowCustom?: boolean;
  customPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  /** Small note under the field, e.g. where the list comes from */
  hint?: string;
}

const CUSTOM = '__custom__';

/**
 * Dropdown filled from master data. Values not in the list (older BAs, or
 * equipment not registered yet) stay visible, and "Lainnya (ketik manual)"
 * opens a text field so the technician is never blocked.
 */
export const MasterSelect: React.FC<Props> = ({
  id,
  value,
  onChange,
  options,
  placeholder = '— Pilih —',
  allowCustom = true,
  customPlaceholder = 'Ketik manual',
  className = '',
  disabled,
  hint,
}) => {
  const known = options.some((o) => o.value === value);
  const [manual, setManual] = useState(!!value && !known);
  const showInput = allowCustom && (manual || (!!value && !known));

  const groups = Array.from(new Set(options.map((o) => o.group || '')));
  const selectValue = showInput ? CUSTOM : value;
  const base =
    'w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-500';

  return (
    <div className="space-y-1.5">
      <select
        id={id}
        value={selectValue}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.value === CUSTOM) {
            setManual(true);
            if (known) onChange('');
          } else {
            setManual(false);
            onChange(e.target.value);
          }
        }}
        className={`${base} ${className}`}
      >
        <option value="">{placeholder}</option>
        {groups.map((g) =>
          g ? (
            <optgroup key={g} label={g}>
              {options
                .filter((o) => o.group === g)
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label || o.value}
                  </option>
                ))}
            </optgroup>
          ) : (
            options
              .filter((o) => !o.group)
              .map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label || o.value}
                </option>
              ))
          )
        )}
        {allowCustom && <option value={CUSTOM}>Lainnya (ketik manual)…</option>}
      </select>
      {showInput && (
        <input
          id={`${id}-manual`}
          aria-label={`${placeholder.replace(/[—-]/g, '').trim()} (manual)`}
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={customPlaceholder}
          autoFocus={manual && !value}
          className={base}
        />
      )}
      {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
    </div>
  );
};
