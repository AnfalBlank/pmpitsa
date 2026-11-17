'use client';

import React from 'react';
import { 
  Building2, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  Wrench, 
  Plus, 
  Activity, 
  Layers, 
  Zap, 
  Clock, 
  UserCheck, 
  ShieldCheck, 
  ArrowRight,
  ClipboardCheck,
  AlertCircle
} from 'lucide-react';
import { UserSession, Site, WorkType, SPBUTicket, MaintenancePlan, PMReport } from '@/lib/types';
import { SAMPLE_SITES } from '@/lib/sample-data';
import { awaitingApproval } from '@/lib/report-status';
import { baNumber } from '@/lib/work-type';

interface OverviewModuleProps {
  currentUser: UserSession;
  currentSite: Site;
  sites?: Site[];
  tickets: SPBUTicket[];
  plans: MaintenancePlan[];
  reports: PMReport[];
  onStartExecution: (site: Site, workType: WorkType, terminalId: string) => void;
  onOpenCreateTicket: (siteId?: number) => void;
  onOpenCreatePlan: (siteId?: number) => void;
  onOpenReportPdf: (report: PMReport) => void;
  onNavigateToModule: (module: 'tickets' | 'schedule' | 'reports' | 'config' | 'form') => void;
}

export const OverviewModule: React.FC<OverviewModuleProps> = ({
  currentUser,
  currentSite,
  sites,
  tickets,
  plans,
  reports,
  onStartExecution,
  onOpenCreateTicket,
  onOpenCreatePlan,
  onOpenReportPdf,
  onNavigateToModule,
}) => {
  const activeSites = sites && sites.length > 0 ? sites : SAMPLE_SITES;
  const openTickets = tickets.filter(t => t.status !== 'Selesai (Resolved)');
  const emergencyTickets = tickets.filter(t => t.priority === 'Darurat' && t.status !== 'Selesai (Resolved)');
  const upcomingPlans = plans.filter(p => p.status !== 'Selesai');

  // Supervisor site specific
  const siteTickets = tickets.filter(t => t.site_id === currentSite.id);
  const openSiteTickets = siteTickets.filter(t => t.status !== 'Selesai (Resolved)');
  const sitePlans = plans.filter(p => p.site_id === currentSite.id);
  const pendingSignOffReports = reports.filter(r => r.site_id === currentUser.assignedSiteId && awaitingApproval(r));

  // Technician assigned
  const myAssignedTickets = tickets.filter(
    t => t.status !== 'Selesai (Resolved)' && (t.assigned_to?.includes(currentUser.name.split(' ')[0]) || !t.assigned_to)
  );
  const myUpcomingPlans = plans.filter(
    p => p.status !== 'Selesai' && (p.assigned_technician.includes(currentUser.name.split(' ')[0]) || p.assigned_technician.includes('Rizky'))
  );

  return (
    <div className="space-y-6">

      {/* Module Action Toolbar (Clean & Aligned, No Duplicate Header Card) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-extrabold text-[#0B2545]">
            {currentUser.role === 'ADMIN' 
              ? 'Monitoring Operasional Forecourt SPBU' 
              : currentUser.role === 'SUPERVISOR' 
              ? `Kesiapan Teknis ${currentSite.site_name}`
              : `Agenda Bertugas Hari Ini: ${currentUser.name}`}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentUser.role === 'ADMIN'
              ? 'Telemetri sistem POS, pompa dispenser, sensor ATG, dan kepatuhan SLA pemeliharaan'
              : currentUser.role === 'SUPERVISOR'
              ? `Pengawasan rutin peralatan forecourt dan checklist kesiapan harian SPBU`
              : 'Daftar penugasan perbaikan, jadwal inspeksi berkala, dan Berita Acara'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {currentUser.role === 'ADMIN' && (
            <>
              <button
                type="button"
                onClick={() => onOpenCreateTicket()}
                className="min-h-[40px] px-3.5 py-1.5 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Tiket</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenCreatePlan()}
                className="min-h-[40px] px-3.5 py-1.5 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Jadwalkan PM</span>
              </button>
            </>
          )}

          {currentUser.role === 'SUPERVISOR' && (
            <>
              <button
                type="button"
                onClick={() => onOpenCreateTicket(currentSite.id)}
                className="min-h-[40px] px-3.5 py-1.5 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Lapor Kendala</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateToModule('reports')}
                className="min-h-[40px] px-3.5 py-1.5 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-slate-300" />
                <span>Lihat Berita Acara</span>
              </button>
            </>
          )}

          {currentUser.role === 'TECHNICIAN' && (
            <button
              type="button"
              onClick={() => onStartExecution(currentSite, 'PREVENTIVE_MAINTENANCE', 'POS-01')}
              className="min-h-[40px] px-4 py-1.5 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Isi Form PM Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Cards (Uniform Slate Palette, No Rainbow AI Default) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {currentUser.role === 'ADMIN' ? 'Total Site SPBU' : 'Kesiapan POS Kasir'}
            </span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-[#0B2545]">
            {currentUser.role === 'ADMIN' ? activeSites.length : 'Normal'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {currentUser.role === 'ADMIN' ? `${activeSites.length} Site SPBU Terdaftar` : 'POS-01 & POS-02 Online'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {currentUser.role === 'TECHNICIAN' ? 'Tiket Tugas Saya' : 'Tiket Gangguan'}
            </span>
            <AlertTriangle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-[#0B2545]">
            {currentUser.role === 'TECHNICIAN' ? myAssignedTickets.length : currentUser.role === 'SUPERVISOR' ? openSiteTickets.length : openTickets.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {emergencyTickets.length > 0 ? `${emergencyTickets.length} status darurat` : '0 kendala darurat'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {currentUser.role === 'SUPERVISOR' ? 'Tangki ATG Water' : 'PM Bulan Ini'}
            </span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-[#0B2545]">
            {currentUser.role === 'SUPERVISOR' ? '0.0 mm' : plans.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {currentUser.role === 'SUPERVISOR' ? 'Bebas kontaminasi air' : `${upcomingPlans.length} mendekati jadwal`}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Kepatuhan SLA</span>
            <CheckCircle2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-[#0B2545]">
            94.8%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Rata-rata respons 2.4 jam
          </div>
        </div>
      </div>

      {/* Priority Section: Supervisor Pending Signoff */}
      {currentUser.role === 'SUPERVISOR' && pendingSignOffReports.length > 0 && (
        <div className="bg-amber-50/70 rounded-xl p-4 sm:p-5 border border-amber-300 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-700 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-extrabold text-amber-950">
                Berita Acara Menunggu Validasi Anda ({pendingSignOffReports.length})
              </h3>
              <p className="text-xs text-amber-800">
                Teknisi sudah memfinalisasi Berita Acara. Periksa isinya lalu tekan &quot;Setujui Berita Acara&quot;.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {pendingSignOffReports.map((r) => (
              <div 
                key={r.id}
                className="bg-white p-3.5 rounded-lg border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">#{baNumber(r)}</span>
                    <span className="font-semibold text-slate-600">{r.execution_date}</span>
                    <span className="font-bold text-slate-900">Teknisi: {r.technician_name}</span>
                  </div>
                  <p className="text-slate-600 mt-1 line-clamp-1">{r.findings_summary || 'Pemeriksaan normal.'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenReportPdf(r)}
                  className="min-h-[38px] px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors flex-shrink-0"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Tinjau &amp; Setujui</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADMIN: 5 SPBU Fleet Grid */}
      {currentUser.role === 'ADMIN' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-[#0B2545]">
                Status Kesiapan Operasional SPBU (5 Site)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengawas bertugas, kondisi dispenser, konsol ATG tangki, dan agenda PM terdekat
              </p>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 self-start sm:self-auto">
              Semua Sistem Beroperasi
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {activeSites.map((site) => {
              const curTickets = tickets.filter(t => t.site_id === site.id && t.status !== 'Selesai (Resolved)');
              const curPlans = plans.filter(p => p.site_id === site.id);
              const nextPlan = curPlans.find(p => p.status === 'Mendekati Waktu' || p.status === 'Terjadwal');

              return (
                <div key={site.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Site Info */}
                    <div className="space-y-1 max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {site.site_code}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {site.regional}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900">
                        {site.site_name}
                      </h4>
                      <p className="text-xs text-slate-600">
                        {site.location}
                      </p>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                        <span>PWS:</span>
                        <span className="font-semibold text-slate-800">{site.contact_person}</span>
                      </div>
                    </div>

                    {/* Middle: Equipment Health Chips */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">POS & PINSYST</span>
                        <span className="font-bold text-emerald-800 flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Online
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Tiket Masalah</span>
                        {curTickets.length > 0 ? (
                          <span className="font-bold text-red-600 flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                            {curTickets.length} Terbuka
                          </span>
                        ) : (
                          <span className="font-bold text-slate-600 flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            0 Gangguan
                          </span>
                        )}
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Jadwal PM Terdekat</span>
                        <span className="font-medium text-slate-800 mt-0.5 block truncate">
                          {nextPlan ? `${nextPlan.scheduled_date}` : 'Belum Terjadwal'}
                        </span>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 self-start lg:self-center flex-wrap">
                      <button
                        type="button"
                        onClick={() => onOpenCreateTicket(site.id)}
                        className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Lapor Kendala</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenCreatePlan()}
                        className="min-h-[38px] px-3.5 py-1.5 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <Calendar className="w-3.5 h-3.5 text-slate-300" />
                        <span>Jadwalkan PM</span>
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUPERVISOR: Equipment Status & Shift Checklist */}
      {currentUser.role === 'SUPERVISOR' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#0B2545]">
                  Status Komponen Teknis di {currentSite.site_name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hasil diagnostik telemetri perangkat forecourt dan terminal kasir
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                Operasional Normal
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-slate-600" />
                  Terminal POS Kasir
                </span>
                <div className="space-y-1 text-slate-600 pt-1">
                  <div className="flex justify-between"><span>Advantech POS-01:</span><strong className="text-emerald-700">Online</strong></div>
                  <div className="flex justify-between"><span>Printer Epson TM-T82:</span><strong className="text-slate-800">Ready</strong></div>
                  <div className="flex justify-between"><span>EDC Mandiri & BNU:</span><strong className="text-emerald-700">Terhubung</strong></div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-600" />
                  Automatic Tank Gauge (ATG)
                </span>
                <div className="space-y-1 text-slate-600 pt-1">
                  <div className="flex justify-between"><span>Konsol Veeder-Root:</span><strong className="text-emerald-700">TLS-450 Normal</strong></div>
                  <div className="flex justify-between"><span>Probe Pertamax:</span><strong className="text-slate-800">Water 0.0 mm</strong></div>
                  <div className="flex justify-between"><span>Probe Dexlite:</span><strong className="text-slate-800">Water 0.0 mm</strong></div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-slate-600" />
                  Kelistrikan & Forecourt
                </span>
                <div className="space-y-1 text-slate-600 pt-1">
                  <div className="flex justify-between"><span>Dispenser Tatsuno:</span><strong className="text-emerald-700">Tersinkron</strong></div>
                  <div className="flex justify-between"><span>UPS ICA 1200VA:</span><strong className="text-slate-800">224V Stabil</strong></div>
                  <div className="flex justify-between"><span>Grounding System:</span><strong className="text-emerald-700">1.2 V (Aman)</strong></div>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Shift Checklist */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-[#0B2545]">
              Checklist Kesiapan Operasional Harian Pengawas (PWS)
            </h3>
            <p className="text-xs text-slate-500">
              Verifikasi fisik sebelum buka shift kasir SPBU untuk mencegah gangguan transaksi
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-slate-700">
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-emerald-600 rounded" />
                <span>Pemeriksaan visual display dispenser & nozzle bebas tetesan BBM</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-emerald-600 rounded" />
                <span>Kertas struk printer thermal terisi cukup pada POS-01 dan POS-02</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-emerald-600 rounded" />
                <span>Konektivitas EDC dan jaringan switch forecourt beroperasi normal</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-emerald-600 rounded" />
                <span>Uji pompa emergency stop dan APAR pemadam api dalam radius siap pakai</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* TECHNICIAN: Job Launcher */}
      {currentUser.role === 'TECHNICIAN' && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Mulai Pekerjaan Baru di SPBU
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <button
              type="button"
              onClick={() => onStartExecution(currentSite, 'PREVENTIVE_MAINTENANCE', 'POS-01')}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-left transition-all shadow-2xs group flex flex-col justify-between min-h-[140px]"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg bg-[#0B2545] text-white flex items-center justify-center font-bold">
                    <ClipboardCheck className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    SOP Rutin
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                  Preventive Maintenance (PM)
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-snug">
                  Inspeksi berkala 10 modul PINSYST, ATG, dispenser, kelistrikan UPS, dan grounding.
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-bold text-red-600">
                <span>Buka Form PM</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => onStartExecution(currentSite, 'QUICK_CHECK', 'POS-01')}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-left transition-all shadow-2xs group flex flex-col justify-between min-h-[140px]"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold">
                    <Activity className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    5 Menit
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                  Pengecekan Cepat (Health Check)
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-snug">
                  Audit kesiapan kasir: tes online terminal, komunikasi pompa, printer, dan EDC.
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-bold text-[#0B2545]">
                <span>Buka Form Cek Cepat</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => onStartExecution(currentSite, 'CORRECTIVE_REPAIR', 'POS-01')}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-left transition-all shadow-2xs group flex flex-col justify-between min-h-[140px]"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    Troubleshooting
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                  Tindakan Perbaikan (Repair)
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-snug">
                  Penanganan kerusakan komponen, catatan akar masalah, penggantian sparepart.
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-bold text-slate-800">
                <span>Buka Form Perbaikan</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
