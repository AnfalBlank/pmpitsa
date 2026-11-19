'use client';

import React, { useState } from 'react';
import {
  LogIn,
  LogOut,
  ShieldAlert,
  PlusCircle,
  PencilLine,
  Trash2,
  Lock,
  BadgeCheck,
  FileDown,
  HardDriveUpload,
  RotateCcw,
  Fuel,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import type { AuditItem } from '@/lib/api-client';

export const ACTION_META: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  login: { label: 'Login', icon: LogIn, cls: 'bg-slate-100 text-slate-700' },
  login_failed: { label: 'Login gagal', icon: ShieldAlert, cls: 'bg-red-100 text-red-700' },
  logout: { label: 'Logout', icon: LogOut, cls: 'bg-slate-100 text-slate-700' },
  create: { label: 'Buat', icon: PlusCircle, cls: 'bg-blue-100 text-blue-700' },
  update: { label: 'Ubah', icon: PencilLine, cls: 'bg-amber-100 text-amber-800' },
  delete: { label: 'Hapus', icon: Trash2, cls: 'bg-red-100 text-red-700' },
  finalize: { label: 'Finalisasi', icon: Lock, cls: 'bg-indigo-100 text-indigo-700' },
  revise: { label: 'Revisi', icon: PencilLine, cls: 'bg-amber-100 text-amber-800' },
  approve: { label: 'Disetujui', icon: BadgeCheck, cls: 'bg-emerald-100 text-emerald-700' },
  resend: { label: 'Kirim ulang', icon: RotateCcw, cls: 'bg-slate-100 text-slate-700' },
  download_pdf: { label: 'Unduh PDF', icon: FileDown, cls: 'bg-slate-100 text-slate-700' },
  archive_drive: { label: 'Arsip Drive', icon: HardDriveUpload, cls: 'bg-cyan-100 text-cyan-800' },
  config_forecourt: { label: 'Konfigurasi forecourt', icon: Fuel, cls: 'bg-emerald-100 text-emerald-700' },
  reset_data: { label: 'Reset data', icon: AlertTriangle, cls: 'bg-red-100 text-red-700' },
};

export const ENTITY_LABEL: Record<string, string> = {
  report: 'Berita Acara',
  ticket: 'Tiket',
  plan: 'Jadwal PM',
  site: 'Data SPBU',
  config: 'Master data',
  user: 'Pengguna',
  auth: 'Akses akun',
  system: 'Sistem',
};

const ROLE_SHORT: Record<string, string> = { ADMIN: 'Admin', SUPERVISOR: 'Pengawas', TECHNICIAN: 'Teknisi' };

export const formatAuditTime = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** Readable names for recorded fields (falls back to the technical path) */
const SECTION: Record<string, string> = {
  software: 'Software',
  hardware: 'Hardware',
  forecourt: 'Forecourt',
  peripherals: 'Periferal',
  network_power: 'Jaringan & listrik',
  repair_details: 'Perbaikan (CM)',
  quick_check_details: 'Pengecekan',
  edc_list: 'Mesin EDC',
  features_checklist: 'Fitur PINSYST',
  attachments: 'Foto dokumentasi',
};
const FIELD: Record<string, string> = {
  overall_status: 'Status akhir',
  findings_summary: 'Temuan / catatan',
  action_plan: 'Rencana tindak lanjut',
  next_pm_recommendation_date: 'Jadwal PM berikutnya',
  execution_date: 'Tanggal pemeriksaan',
  execution_time: 'Jam pemeriksaan',
  terminal_id: 'Terminal POS',
  technician_name: 'Teknisi',
  technician_phone: 'No. HP teknisi',
  supervisor_name: 'Pengawas',
  technician_signature: 'Tanda tangan teknisi',
  supervisor_signature: 'Tanda tangan pengawas',
  site_name: 'Nama SPBU',
  site_code: 'Kode SPBU',
  work_type: 'Jenis pekerjaan',
  reported_problem: 'Keluhan',
  root_cause: 'Akar masalah',
  action_taken: 'Tindakan',
  sparepart_replaced: 'Sparepart',
  post_repair_status: 'Hasil uji fungsi',
  test_notes: 'Uraian uji fungsi',
  notes: 'Catatan',
  status: 'Status',
  assigned_to: 'Teknisi ditugaskan',
  assigned_technician: 'Teknisi ditugaskan',
  scheduled_date: 'Tanggal jadwal',
  resolution_notes: 'Catatan penanganan',
  contact_person: 'PIC / Pengawas',
  location: 'Alamat',
  regional: 'Regional',
  atg_brand: 'Brand ATG',
  dispenser_brand: 'Brand dispenser',
  nozzles: 'Nozzle',
  tanks: 'Tangki',
};
export function fieldLabel(path: string): string {
  const parts = path.split('.');
  const last = parts[parts.length - 1];
  const name = FIELD[last] || last.replace(/_/g, ' ');
  const sec = parts.length > 1 ? SECTION[parts[0]] || parts[0].replace(/_/g, ' ') : '';
  return sec && sec !== name ? `${sec} › ${name}` : name;
}

/** Field-level changes recorded for revisions / updates */
const Changes: React.FC<{ details: any }> = ({ details }) => {
  const list: { path?: string; field?: string; from: unknown; to: unknown }[] = details?.changes || [];
  if (!list.length) {
    if (!details || typeof details !== 'object') return null;
    return (
      <pre className="mt-2 text-[11px] bg-slate-50 border border-slate-200 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">
        {JSON.stringify(details, null, 2)}
      </pre>
    );
  }
  const show = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));
  return (
    <div className="mt-2 rounded border border-slate-200 overflow-hidden">
      <table className="w-full text-[11px]">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="text-left p-1.5 font-semibold">Isian</th>
            <th className="text-left p-1.5 font-semibold">Sebelum</th>
            <th className="text-left p-1.5 font-semibold">Sesudah</th>
          </tr>
        </thead>
        <tbody>
          {list.map((c, i) => (
            <tr key={i} className="border-t border-slate-100 align-top">
              <td className="p-1.5 font-semibold text-slate-700 break-words" title={c.path || c.field}>{fieldLabel(String(c.path || c.field))}</td>
              <td className="p-1.5 text-red-700 break-words">{show(c.from)}</td>
              <td className="p-1.5 text-emerald-700 break-words">{show(c.to)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const AuditRow: React.FC<{ item: AuditItem; showEntity?: boolean; showNetwork?: boolean }> = ({ item, showEntity, showNetwork }) => {
  const [open, setOpen] = useState(false);
  const meta = ACTION_META[item.action] || { label: item.action, icon: PencilLine, cls: 'bg-slate-100 text-slate-700' };
  const Icon = meta.icon;
  const hasMore = !!item.details || (showNetwork && (item.ip || item.user_agent));
  return (
    <li className="relative pl-12 pr-1 py-3 border-b border-slate-100 last:border-b-0">
      <span className={`absolute left-1 top-3 w-8 h-8 rounded-full flex items-center justify-center ${meta.cls}`}>
        <Icon className="w-4 h-4" />
      </span>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-sm font-bold text-slate-900">{item.user_name || 'Tidak dikenal'}</span>
        {item.user_role && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{ROLE_SHORT[item.user_role] || item.user_role}</span>}
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${meta.cls}`}>{meta.label}</span>
        <span className="text-[11px] text-slate-500 ml-auto">{formatAuditTime(item.at)}</span>
      </div>
      {showEntity && (item.entity_label || item.entity_type) && (
        <div className="text-[11px] text-slate-600 mt-0.5">
          {ENTITY_LABEL[item.entity_type] || item.entity_type}
          {item.entity_label ? ` · ${item.entity_label}` : ''}
        </div>
      )}
      <p className="text-xs text-slate-700 mt-1 break-words">{item.summary}</p>
      {hasMore && (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="mt-1 text-[11px] font-semibold text-blue-700 hover:underline inline-flex items-center gap-1 min-h-[28px]">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          {open ? 'Sembunyikan detail' : 'Lihat detail'}
        </button>
      )}
      {open && (
        <div>
          {item.details && <Changes details={item.details} />}
          {showNetwork && (item.ip || item.user_agent) && (
            <p className="mt-1.5 text-[10px] text-slate-500 break-all">
              IP: {item.ip || '-'} · {item.user_agent || ''}
            </p>
          )}
        </div>
      )}
    </li>
  );
};
