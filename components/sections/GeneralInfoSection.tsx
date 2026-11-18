'use client';

import React from 'react';
import { MasterSelect } from '@/components/ui/MasterSelect';
import { PMReport, PMOverallStatus, Site } from '@/lib/types';
import { SAMPLE_SITES } from '@/lib/sample-data';
import { Building2, Calendar, Clock, User, Phone, ShieldCheck, AlertCircle } from 'lucide-react';

interface GeneralInfoSectionProps {
  report: PMReport;
  onChange: (updated: PMReport) => void;
  sites?: Site[];
  /** Users from Manajemen User (for technician / supervisor dropdowns) */
  users?: { name: string; role: string; employeeId?: string; phone?: string; assignedSiteId?: number }[];
}

export const GeneralInfoSection: React.FC<GeneralInfoSectionProps> = ({
  report,
  onChange,
  sites,
  users = [],
}) => {
  const technicians = users
    .filter((u) => u.role === 'TECHNICIAN')
    .map((u) => ({ value: u.employeeId ? `${u.name} (${u.employeeId})` : u.name, phone: u.phone }));
  const currentSiteObj = (sites || []).find((s) => s.id === report.site_id);
  const pic = currentSiteObj?.contact_person ? currentSiteObj.contact_person.split(' (')[0] : '';
  const supervisors = [
    ...users
      .filter((u) => u.role === 'SUPERVISOR')
      .sort((a, b) => Number(b.assignedSiteId === report.site_id) - Number(a.assignedSiteId === report.site_id))
      .map((u) => ({ value: u.name, group: u.assignedSiteId === report.site_id ? 'Pengawas SPBU ini' : 'Pengawas SPBU lain' })),
    ...(pic && !users.some((u) => u.name === pic) ? [{ value: pic, group: 'PIC terdaftar di Data SPBU' }] : []),
  ];
  const activeSites = sites && sites.length > 0 ? sites : SAMPLE_SITES;

  const updateField = <K extends keyof PMReport>(key: K, val: PMReport[K]) => {
    onChange({
      ...report,
      [key]: val,
    });
  };

  const statusOptions: PMOverallStatus[] = [
    'Selesai (Normal)',
    'Perlu Tindak Lanjut',
    'Kritis (Perbaikan Segera)',
  ];

  return (
    <div className="space-y-6">
      {/* Site Identity Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Building2 className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Informasi Site SPBU & Terminal POS
            </h2>
            <p className="text-xs text-slate-500">
              Lokasi pengerjaan inspeksi rutin sistem POS PINSYST & FMS
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Kode Site SPBU
            </label>
            <input
              type="text"
              readOnly
              value={report.site_code}
              className="w-full min-h-[44px] px-3 py-2 bg-slate-100 border border-slate-300 rounded-md text-sm font-mono font-bold text-slate-800"
            />
          </div>

          <div className="sm:col-span-2">
            <label 
              htmlFor="general-site-select"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Nama Site / SPBU Pertamina (Sesuai Konfigurasi) <span className="text-red-500">*</span>
            </label>
            <select
              id="general-site-select"
              value={report.site_id}
              onChange={(e) => {
                const selectedId = Number(e.target.value);
                const matchedSite = activeSites.find((s) => s.id === selectedId);
                if (matchedSite) {
                  onChange({
                    ...report,
                    site_id: matchedSite.id,
                    site_code: matchedSite.site_code,
                    site_name: matchedSite.site_name,
                    supervisor_name: matchedSite.contact_person ? matchedSite.contact_person.split(' (')[0] : report.supervisor_name,
                  });
                }
              }}
              className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            >
              {activeSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.site_code} - {site.site_name}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {activeSites.find((s) => s.id === report.site_id)?.location || 'Lokasi SPBU PITSA'}
            </span>
          </div>

          <div>
            <label 
              htmlFor="terminal-id-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              ID Terminal / POS <span className="text-red-500">*</span>
            </label>
            <input
              id="terminal-id-input"
              type="text"
              required
              value={report.terminal_id}
              onChange={(e) => updateField('terminal_id', e.target.value)}
              placeholder="Contoh: POS-01"
              className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-mono font-bold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label 
              htmlFor="execution-date-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Tanggal Pemeriksaan <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="execution-date-input"
                type="date"
                required
                value={report.execution_date}
                onChange={(e) => updateField('execution_date', e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label 
              htmlFor="execution-time-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Waktu Pelaksanaan (WIB/WITA/WIT/TL)
            </label>
            <input
              id="execution-time-input"
              type="time"
              value={report.execution_time}
              onChange={(e) => updateField('execution_time', e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>
      </div>

      {/* Person in Charge (PIC) */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <User className="w-5 h-5 text-blue-700 flex-shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Petugas Pelaksana & Pengawas Site
            </h2>
            <p className="text-xs text-slate-500">
              Kredensial teknisi maintenance dan supervisor pengesahan
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label 
              htmlFor="technician-name-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Nama Teknisi Pelaksana <span className="text-red-500">*</span>
            </label>
            <MasterSelect
              id="technician-name-input"
              value={report.technician_name}
              onChange={(v) => {
                const u = technicians.find((t) => t.value === v);
                onChange({ ...report, technician_name: v, technician_phone: u?.phone || report.technician_phone });
              }}
              options={technicians}
              placeholder="— Pilih teknisi —"
              customPlaceholder="Nama lengkap dan ID teknisi"
              hint="Daftar dari Manajemen User (peran Teknisi)"
            />
          </div>

          <div>
            <label 
              htmlFor="technician-phone-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              No. Kontak / HP Teknisi
            </label>
            <input
              id="technician-phone-input"
              type="tel"
              value={report.technician_phone}
              onChange={(e) => updateField('technician_phone', e.target.value)}
              placeholder="+62 812..."
              className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label 
              htmlFor="supervisor-name-input"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Nama Supervisor / Pengawas Site <span className="text-red-500">*</span>
            </label>
            <MasterSelect
              id="supervisor-name-input"
              value={report.supervisor_name}
              onChange={(v) => updateField('supervisor_name', v)}
              options={supervisors}
              placeholder="— Pilih pengawas —"
              customPlaceholder="Nama pengawas SPBU"
              hint="Pengawas SPBU ini ditampilkan paling atas"
            />
          </div>
        </div>
      </div>

      {/* Summary Status of Session */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {report.work_type === 'PREVENTIVE_MAINTENANCE' ? 'Status Keseluruhan & Rekomendasi Siklus' : 'Status Keseluruhan'}
            </h2>
            <p className="text-xs text-slate-500">
              Klasifikasi kondisi terminal POS saat selesai dilakukan inspeksi berkala
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              {report.work_type === 'CORRECTIVE_REPAIR'
                ? 'Status Setelah Perbaikan'
                : report.work_type === 'QUICK_CHECK'
                ? 'Kesimpulan Hasil Pengecekan'
                : 'Klasifikasi Kondisi Hasil PM'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {statusOptions.map((status) => {
                const isSelected = report.overall_status === status;
                let activeBorder = 'border-slate-300 hover:border-slate-400 bg-white';
                if (isSelected) {
                  if (status === 'Selesai (Normal)') {
                    activeBorder = 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/30';
                  } else if (status === 'Perlu Tindak Lanjut') {
                    activeBorder = 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/30';
                  } else {
                    activeBorder = 'border-red-600 bg-red-50 text-red-900 ring-2 ring-red-500/30';
                  }
                }

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => updateField('overall_status', status)}
                    className={`min-h-[48px] p-3 rounded-lg border text-left font-semibold text-xs sm:text-sm transition-all flex items-center justify-between ${activeBorder}`}
                  >
                    <span>{status}</span>
                    {isSelected && (
                      <span className="w-2.5 h-2.5 rounded-full bg-current" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {report.work_type === 'PREVENTIVE_MAINTENANCE' && (
            <div>
              <label 
                htmlFor="next-pm-date-input"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Rekomendasi Jadwal PM Berikutnya
              </label>
              <input
                id="next-pm-date-input"
                type="date"
                value={report.next_pm_recommendation_date}
                onChange={(e) => updateField('next_pm_recommendation_date', e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Standar siklus PM rutin Pertamina: 30 hari sekali
              </span>
            </div>
            )}

            <div className="bg-slate-50 p-3 rounded-md border border-slate-200 flex items-start gap-2 text-xs text-slate-600">
              <AlertCircle className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
              <span>
                Data header ini menjadi identitas utama dokumen Berita Acara PM dan indeks database Turso Serverless. Pastikan Terminal ID sesuai stiker fisik pada mesin kasir.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

