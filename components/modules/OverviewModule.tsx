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
  AlertCircle,
  Fuel
} from 'lucide-react';
import { UserSession, Site, WorkType, SPBUTicket, MaintenancePlan, PMReport } from '@/lib/types';
import { SAMPLE_SITES } from '@/lib/sample-data';
import { awaitingApproval } from '@/lib/report-status';
import { DailyChecklistCard } from '@/components/daily/DailyChecklistCard';
import { DailyChecklistAdminPanel } from '@/components/daily/DailyChecklistAdminPanel';
import { formatHours, latestSiteReport, STATUS_WORD, tankWaterStatus, ticketSla } from '@/lib/dashboard-metrics';
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
  /** Called after something was saved here (e.g. the daily checklist created tickets) */
  onDataChanged?: () => void;
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
  onDataChanged,
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
  // ---- Real figures (no placeholders) ----
  const sla = ticketSla(currentUser.role === 'SUPERVISOR' ? siteTickets : tickets);
  const lastSiteBa = latestSiteReport(reports, currentSite.id);
  const lastSitePm = latestSiteReport(reports, currentSite.id, 'PREVENTIVE_MAINTENANCE');
  const water = tankWaterStatus(reports, currentSite.id);
  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');

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
            {currentUser.role === 'ADMIN'
              ? activeSites.length
              : lastSiteBa
              ? lastSiteBa.overall_status === 'Selesai (Normal)'
                ? 'Normal'
                : lastSiteBa.overall_status === 'Perlu Tindak Lanjut'
                ? 'Perlu Cek'
                : 'Kritis'
              : '-'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {currentUser.role === 'ADMIN'
              ? `${activeSites.length} Site SPBU Terdaftar`
              : lastSiteBa
              ? `BA terakhir ${fmtDate(lastSiteBa.execution_date)}`
              : 'Belum ada Berita Acara final'}
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
              {currentUser.role === 'SUPERVISOR' ? 'Tangki Bebas Air' : 'PM Bulan Ini'}
            </span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-[#0B2545]">
            {currentUser.role === 'SUPERVISOR' ? (water ? `${water.total - water.withWater.length}/${water.total}` : '-') : plans.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {currentUser.role === 'SUPERVISOR'
              ? water
                ? water.withWater.length
                  ? `Air terdeteksi: ${water.withWater.join(', ')}`
                  : `Tangki bebas air · BA PM ${fmtDate(water.reportDate)}`
                : 'Belum ada BA PM dengan data tangki'
              : `${upcomingPlans.length} mendekati jadwal`}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Kepatuhan SLA</span>
            <CheckCircle2 className="w-4 h-4 text-slate-400" />
          </div>
          <div
            className={`text-2xl font-extrabold ${
              sla.compliance === null ? 'text-[#0B2545]' : sla.compliance >= 90 ? 'text-emerald-700' : sla.compliance >= 75 ? 'text-amber-600' : 'text-red-600'
            }`}
          >
            {sla.compliance === null ? '-' : `${sla.compliance.toLocaleString('id-ID')}%`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {sla.resolvedCount ? `Rata-rata selesai ${formatHours(sla.avgResolutionHours)}` : 'Belum ada tiket selesai'}
            {sla.overdueOpen > 0 && <span className="block text-red-600 font-semibold">{sla.overdueOpen} tiket lewat target</span>}
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
      {currentUser.role === 'ADMIN' && <DailyChecklistAdminPanel sites={activeSites} refreshKey={tickets.length} />}

      {currentUser.role === 'ADMIN' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-[#0B2545]">
                Status Kesiapan Operasional SPBU ({activeSites.length} Site)
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
                  {lastSitePm
                    ? `Sesuai Berita Acara PM ${fmtDate(lastSitePm.execution_date)} oleh ${lastSitePm.technician_name}`
                    : 'Belum ada Berita Acara PM final untuk SPBU ini'}
                </p>
              </div>
              {lastSitePm && (
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    lastSitePm.overall_status === 'Selesai (Normal)'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : lastSitePm.overall_status === 'Perlu Tindak Lanjut'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-red-50 text-red-800 border-red-300'
                  }`}
                >
                  {lastSitePm.overall_status}
                </span>
              )}
            </div>

            {!lastSitePm ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Status perangkat akan tampil setelah teknisi memfinalisasi Berita Acara PM pertama untuk SPBU ini.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(() => {
                  const r = lastSitePm;
                  const st = (v?: string) => STATUS_WORD[v || ''] || '-';
                  const col = (v?: string) => (v === 'R' ? 'text-red-600' : v === 'B' ? 'text-emerald-700' : 'text-slate-800');
                  const worst = (...v: (string | undefined)[]) => (v.includes('R') ? 'R' : v.includes('X') ? 'X' : 'B');
                  const pcStatus = worst(r.hardware?.fan_cleanliness, r.hardware?.heatsink_condition, r.hardware?.airflow_condition);
                  const edcs = r.edc_list || [];
                  const edcOk = edcs.filter((e) => e.physical_status !== 'R' && e.connection_status !== 'R').length;
                  const ng = Number(r.network_power?.voltage_ng);
                  const Row = ({ label, value, cls }: { label: string; value: string; cls?: string }) => (
                    <div className="flex justify-between gap-2">
                      <span className="min-w-0 truncate">{label}</span>
                      <strong className={`flex-shrink-0 ${cls || 'text-slate-800'}`}>{value}</strong>
                    </div>
                  );
                  return (
                    <>
                      <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-slate-600" />
                          Terminal POS Kasir
                        </span>
                        <div className="space-y-1 text-slate-600 pt-1">
                          <Row label={r.hardware?.pc_brand_model || 'PC POS'} value={st(pcStatus)} cls={col(pcStatus)} />
                          <Row label="Printer struk" value={st(r.peripherals?.receipt_printer?.status)} cls={col(r.peripherals?.receipt_printer?.status)} />
                          <Row label="Mesin EDC" value={edcs.length ? `${edcOk}/${edcs.length} normal` : '-'} cls={edcs.length && edcOk < edcs.length ? 'text-red-600' : 'text-emerald-700'} />
                        </div>
                      </div>

                      <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-slate-600" />
                          Automatic Tank Gauge (ATG)
                        </span>
                        <div className="space-y-1 text-slate-600 pt-1">
                          <Row label={r.forecourt?.atg_brand || 'Konsol ATG'} value={st(r.forecourt?.atg_controller_status)} cls={col(r.forecourt?.atg_controller_status)} />
                          {(r.forecourt?.tanks || []).slice(0, 4).map((t) => (
                            <Row
                              key={t.id}
                              label={`Water ${t.tank_number}`}
                              value={t.water_sensor_status === 'R' ? 'Ada air' : t.water_sensor_status === 'B' ? 'Bebas air' : '-'}
                              cls={col(t.water_sensor_status)}
                            />
                          ))}
                          {!(r.forecourt?.tanks || []).length && <Row label="Tangki" value="Tidak ada data" />}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-slate-600" />
                          Kelistrikan & Forecourt
                        </span>
                        <div className="space-y-1 text-slate-600 pt-1">
                          <Row
                            label={r.forecourt?.dispenser_brand || 'Interface dispenser'}
                            value={st(r.forecourt?.dispenser_interface_box)}
                            cls={col(r.forecourt?.dispenser_interface_box)}
                          />
                          <Row
                            label={r.network_power?.ups_model || 'UPS'}
                            value={r.network_power?.voltage_pn ? `${r.network_power.voltage_pn} V` : st(r.network_power?.ups_shutdown_test)}
                            cls={col(r.network_power?.ups_shutdown_test)}
                          />
                          <Row
                            label="Grounding (N-G)"
                            value={Number.isFinite(ng) && r.network_power?.voltage_ng !== undefined ? `${ng} V ${ng <= 2 ? '(Aman)' : '(Tinggi)'}` : '-'}
                            cls={Number.isFinite(ng) ? (ng <= 2 ? 'text-emerald-700' : 'text-red-600') : 'text-slate-800'}
                          />
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Daily Shift Checklist (submitted to the server, visible to Admin) */}
          <DailyChecklistCard siteName={currentSite.site_name} onSubmitted={onDataChanged} />
        </div>
      )}

      {/* TECHNICIAN: Job Launcher */}
      {currentUser.role === 'TECHNICIAN' && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Mulai Pekerjaan Baru di SPBU
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
{currentUser.division === 'TEKNIK' ? (
            <button
              type="button"
              onClick={() => onStartExecution(currentSite, 'MECHANICAL_PM', 'POS-01')}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-left transition-all shadow-2xs group flex flex-col justify-between min-h-[140px]"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold">
                    <Fuel className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-900 border border-orange-200">
                    Divisi Teknik
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-orange-700 transition-colors">
                  PM Teknik (Dispenser & Tangki)
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-snug">
                  Nozzle, swivel, check valve, breakaway, sump dispenser, STP, dan PV vent.
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-bold text-orange-700">
                <span>Buka Form PM Teknik</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </button>
            ) : (
            <>
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

            </>
            )}
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
