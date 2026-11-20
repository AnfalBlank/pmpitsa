'use client';

import React from 'react';
import { MasterSelect } from '@/components/ui/MasterSelect';
import { siteSupervisorNames, UserLite } from '@/lib/user-options';
import { PMReport, WorkType, Site, UserSession } from '@/lib/types';
import { SAMPLE_SITES } from '@/lib/sample-data';
import { workTypesForDivision } from '@/lib/work-type';
import { 
  Building2, 
  User, 
  ShieldCheck, 
  Wrench, 
  Activity, 
  Calendar, 
  Clock, 
  Server, 
  ArrowRight, 
  CheckCircle2, 
  Phone, 
  AlertTriangle,
  Plus, Lock, Fuel } from 'lucide-react';

interface InitiationLandingProps {
  report: PMReport;
  sites?: Site[];
  onChange: (updated: PMReport) => void;
  onProceedToForm: () => void;
  currentUser: UserSession;
  onOpenAdminPortal?: () => void;
  onOpenTicketModal?: () => void;
  /** Users from Manajemen User (technician / supervisor dropdowns) */
  users?: UserLite[];
}

export const InitiationLanding: React.FC<InitiationLandingProps> = ({
  report,
  sites,
  onChange,
  onProceedToForm,
  currentUser,
  onOpenAdminPortal,
  onOpenTicketModal,
  users = [],
}) => {
  const activeSites = sites && sites.length > 0 ? sites : SAMPLE_SITES;
  const siteSpv = siteSupervisorNames(users, activeSites.find((x) => x.id === report.site_id));

  const updateField = <K extends keyof PMReport>(key: K, val: PMReport[K]) => {
    onChange({
      ...report,
      [key]: val,
    });
  };

  const handleSiteSelect = (siteId: number) => {
    const site = activeSites.find((s) => s.id === siteId) || activeSites[0];
    onChange({
      ...report,
      site_id: site.id,
      site_code: site.site_code,
      site_name: site.site_name,
      supervisor_name: siteSupervisorNames(users, site)[0] || site.contact_person.split(' (')[0],
    });
  };

  const workTypes: {
    key: WorkType;
    title: string;
    subtitle: string;
    tag: string;
    icon: React.ElementType;
    activeBorder: string;
    activeBg: string;
    badgeColor: string;
  }[] = [
    {
      key: 'PREVENTIVE_MAINTENANCE',
      title: 'Preventive Maintenance (PM)',
      subtitle: 'Inspeksi berkala lengkap 10 modul: Hardware PC, ATG Tangki, Dispenser Forecourt, EDC, Periferal, Jaringan/Kelistrikan, dan 11 Fitur PINSYST.',
      tag: 'SOP Rutin Lengkap',
      icon: ShieldCheck,
      activeBorder: 'border-red-600 ring-2 ring-red-500/30',
      activeBg: 'bg-red-50/70',
      badgeColor: 'bg-red-700 text-white',
    },
    {
      key: 'MECHANICAL_PM',
      title: 'PM Teknik (Dispenser & Tangki)',
      subtitle: 'Pemeriksaan mekanikal per dispenser (nozzle, swivel, selang, breakaway, check valve, sump) serta STP, PV vent, dan area tangki.',
      tag: 'Divisi Teknik',
      icon: Fuel,
      activeBorder: 'border-orange-600 ring-2 ring-orange-500/30',
      activeBg: 'bg-orange-50/70',
      badgeColor: 'bg-orange-700 text-white',
    },
    {
      key: 'MECHANICAL_CHECK',
      title: 'Pengecekan Teknik (Forecourt & Tangki)',
      subtitle: 'Cek cepat kesiapan dispenser, nozzle & selang, sump, STP, PV vent, area tangki, drainase, spill kit, dan APAR.',
      tag: 'Divisi Teknik · Cepat',
      icon: Activity,
      activeBorder: 'border-amber-600 ring-2 ring-amber-500/30',
      activeBg: 'bg-amber-50/70',
      badgeColor: 'bg-amber-700 text-white',
    },
    {
      key: 'QUICK_CHECK',
      title: 'Pengecekan (Quick Check)',
      subtitle: 'Pemeriksaan cepat kesiapan operasional kasir, tes online POS, komunikasi dispenser, EDC, dan level tangki tanpa audit fisik mendalam.',
      tag: 'Pemeriksaan Cepat',
      icon: Activity,
      activeBorder: 'border-blue-600 ring-2 ring-blue-500/30',
      activeBg: 'bg-blue-50/70',
      badgeColor: 'bg-blue-800 text-white',
    },
    {
      key: 'CORRECTIVE_REPAIR',
      title: 'Corrective Maintenance (CM)',
      subtitle: 'Penanganan kerusakan komponen tertentu, pencatatan akar masalah teknis, penggantian suku cadang/sparepart, dan uji kelayakan pasca servis.',
      tag: 'Troubleshooting / Kerusakan',
      icon: Wrench,
      activeBorder: 'border-amber-600 ring-2 ring-amber-500/30',
      activeBg: 'bg-amber-50/70',
      badgeColor: 'bg-amber-800 text-white',
    },
  ];
  // Technicians only see the forms of their division (IT / Teknik)
  const allowedTypes = currentUser.role === 'TECHNICIAN' ? workTypesForDivision(currentUser.division) : workTypes.map((w) => w.key);
  const visibleTypes = workTypes.filter((w) => allowedTypes.includes(w.key));
  React.useEffect(() => {
    if (!allowedTypes.includes(report.work_type)) updateField('work_type', allowedTypes[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.work_type, currentUser.division]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* Hero Welcome Banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-7 overflow-hidden relative">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          
          {/* Official Logo */}
          <div className="w-20 h-20 rounded-xl bg-white flex items-center justify-center p-2 shadow-sm border border-slate-300 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-pertamina-timor.png"
              alt="Pertamina International Timor, S.A."
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo-pertamina-timor.jpeg';
              }}
            />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="text-xs font-black tracking-wider text-red-600 uppercase">
                PERTAMINA
              </span>
              <span className="text-[11px] bg-[#0B2545] text-white px-2 py-0.5 rounded font-bold uppercase">
                INTERNATIONAL TIMOR, S.A.
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
              Formulir Layanan Pemeliharaan & Pemeriksaan POS PINSYST & FMS
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Lengkapi data informasi site, petugas pelaksana, nama PWS yang bertugas, serta tentukan jenis kegiatan sebelum melanjutkan ke formulir teknis.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Helpdesk & Supervisor Portal Banner */}
      <div className="bg-slate-100 rounded-xl border border-slate-300 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#ED1C24] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 block text-sm">
              Pusat Kendala & Pengawasan SPBU
            </span>
            <span className="text-slate-600">
              Mengalami masalah dispenser/ATG/POS di SPBU? Laporkan via tiket atau pantau jadwal lewat portal pengawas.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
          {onOpenTicketModal && (
            <button
              type="button"
              onClick={onOpenTicketModal}
              className="min-h-[44px] px-3.5 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Tiket Kendala</span>
            </button>
          )}
          {onOpenAdminPortal && (
            <button
              type="button"
              onClick={onOpenAdminPortal}
              className="min-h-[44px] px-3.5 py-2 bg-[#0B2545] hover:bg-slate-900 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>Portal SPV & Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Data Informasi Site SPBU & Terminal POS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Building2 className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              1. Informasi Site SPBU & Terminal Kasir
            </h2>
            <p className="text-xs text-slate-500">
              Lokasi SPBU penugasan dan identitas nomor terminal kasir POS
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label 
              htmlFor="landing-site-select"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Pilih Site / SPBU Pertamina Timor <span className="text-red-500">*</span>
            </label>
            <select
              id="landing-site-select"
              value={report.site_id}
              onChange={(e) => handleSiteSelect(parseInt(e.target.value, 10))}
              className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            >
              {activeSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.site_code} : {site.site_name}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {activeSites.find((s) => s.id === report.site_id)?.location}
            </span>
          </div>

          <div>
            <label 
              htmlFor="landing-terminal-id"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              ID Terminal / POS <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Server className="w-4 h-4 text-blue-700 absolute left-3 top-3.5" />
              <input
                id="landing-terminal-id"
                type="text"
                required
                value={report.terminal_id}
                onChange={(e) => updateField('terminal_id', e.target.value)}
                placeholder="Contoh: POS-01"
                className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label 
              htmlFor="landing-execution-date"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Tanggal Pengerjaan <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                id="landing-execution-date"
                type="date"
                required
                value={report.execution_date}
                onChange={(e) => updateField('execution_date', e.target.value)}
                className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label 
              htmlFor="landing-execution-time"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Waktu / Jam Pelaksanaan
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                id="landing-execution-time"
                type="time"
                value={report.execution_time}
                onChange={(e) => updateField('execution_time', e.target.value)}
                className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Petugas Pelaksana & Pengawas (PWS) yang Bertugas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <User className="w-5 h-5 text-blue-800 flex-shrink-0" />
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              2. Petugas Pelaksana & Nama PWS yang Sedang Bertugas
            </h2>
            <p className="text-xs text-slate-500">
              Kredensial teknisi maintenance dan supervisor pengawas SPBU di lokasi
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label 
              htmlFor="landing-technician-name"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Nama Petugas Pelaksana (Teknisi) <span className="text-red-500">*</span>
            </label>
            <div id="landing-technician-name" className="w-full min-h-[44px] px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">{report.technician_name || '-'}</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Otomatis sesuai akun yang sedang login</span>
          </div>

          <div>
            <label 
              htmlFor="landing-technician-phone"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              No. Kontak / HP Petugas Pelaksana
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                id="landing-technician-phone"
                type="tel"
                value={report.technician_phone}
                onChange={(e) => updateField('technician_phone', e.target.value)}
                placeholder="+670 7733..."
                className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <label 
              htmlFor="landing-pws-name"
              className="block text-xs font-semibold text-red-700 uppercase tracking-wider mb-1"
            >
              Nama PWS / Pengawas yang Sedang Bertugas <span className="text-red-500">*</span>
            </label>
            {siteSpv.length > 1 ? (
              <MasterSelect
                id="landing-pws-name"
                value={report.supervisor_name}
                onChange={(v) => updateField('supervisor_name', v)}
                options={siteSpv.map((v) => ({ value: v }))}
                allowCustom={false}
                placeholder="— Pilih pengawas SPBU ini —"
              />
            ) : (
              <div id="landing-pws-name" className="w-full min-h-[44px] px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-words">{report.supervisor_name || 'Belum ada Pengawas terdaftar untuk SPBU ini'}</span>
              </div>
            )}
            <span className="text-[11px] text-slate-500 mt-1 block">
              Sesuai Pengawas yang terdaftar untuk SPBU yang dipilih
            </span>
          </div>
        </div>
      </div>

      {/* 3. Pilihan Jenis Kegiatan (Preventive Maintenance / Pengecekan Aja / Perbaikan) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-red-600 uppercase tracking-wider block">
            PILIHAN JENIS KEGIATAN
          </span>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
            Pilih Jenis Kegiatan Lapangan yang Dilakukan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Formulir teknis berikutnya akan disesuaikan otomatis berdasarkan pilihan ini
          </p>
        </div>

        <div className={`grid grid-cols-1 gap-4 ${visibleTypes.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          {visibleTypes.map((wt) => {
            const isSelected = report.work_type === wt.key;
            const Icon = wt.icon;

            return (
              <button
                key={wt.key}
                type="button"
                onClick={() => updateField('work_type', wt.key)}
                className={`p-4 sm:p-5 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[160px] relative ${
                  isSelected
                    ? `${wt.activeBorder} ${wt.activeBg} shadow-sm`
                    : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${wt.badgeColor}`}>
                      {wt.tag}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {wt.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {wt.subtitle}
                  </p>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold">
                  <span className={isSelected ? 'text-slate-900' : 'text-slate-500'}>
                    {isSelected ? 'Terpilih' : 'Pilih Modul Ini'}
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Context Details based on selected work type */}
        {report.work_type === 'CORRECTIVE_REPAIR' && (
          <div className="mt-4 p-4 rounded-xl border border-amber-300 bg-amber-50/70 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                Informasi Awal Kerusakan yang Diperbaiki
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Kategori Kerusakan Utama
                </label>
                <select
                  value={report.repair_details?.category || 'Hardware POS'}
                  onChange={(e) =>
                    updateField('repair_details', {
                      ...report.repair_details!,
                      category: e.target.value as any,
                    })
                  }
                  className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-900"
                >
                  <option value="Hardware POS">Hardware PC & Layar Sentuh POS</option>
                  <option value="Printer / Scanner">Printer Struk Thermal / Barcode Scanner</option>
                  <option value="Dispenser & Forecourt">Dispenser Pompa / Nozzle BBM</option>
                  <option value="ATG & Tangki">Sensor Tangki ATG / Deteksi Air</option>
                  <option value="EDC & Jaringan">Mesin EDC / Access Point Wi-Fi</option>
                  <option value="Lainnya">Kelistrikan / E-Stop / Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  Deskripsi Kerusakan yang Dilaporkan PWS
                </label>
                <input
                  type="text"
                  value={report.repair_details?.reported_problem || ''}
                  onChange={(e) =>
                    updateField('repair_details', {
                      ...report.repair_details!,
                      reported_problem: e.target.value,
                    })
                  }
                  placeholder="Contoh: Auto-cutter printer macet / Sensor probe tangki error"
                  className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-900"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Primary Action Button: Proceed to Form */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onProceedToForm}
          className="w-full min-h-[52px] px-6 py-3 bg-[#0B2545] hover:bg-slate-900 text-white rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
        >
          <span>
            {report.work_type === 'PREVENTIVE_MAINTENANCE'
              ? 'Lanjut ke Formulir Preventive Maintenance Lengkap'
              : report.work_type === 'QUICK_CHECK'
              ? 'Lanjut ke Formulir Pengecekan (Quick Check)'
              : report.work_type === 'MECHANICAL_PM'
              ? 'Lanjut ke Formulir PM Teknik (Dispenser & Tangki)'
              : report.work_type === 'MECHANICAL_CHECK'
              ? 'Lanjut ke Formulir Pengecekan Teknik'
              : 'Lanjut ke Formulir Corrective Maintenance (CM)'}
          </span>
          <ArrowRight className="w-5 h-5 text-red-400" />
        </button>
      </div>

    </div>
  );
};

