'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  ClipboardCheck, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Building2, 
  FileText, 
  Camera, 
  Activity, 
  Plus,
  Zap,
  ArrowLeft
} from 'lucide-react';
import { UserSession, Site, WorkType, SPBUTicket, MaintenancePlan, PMReport } from '@/lib/types';
import { SAMPLE_SITES } from '@/lib/sample-data';
import { getAllTickets, getAllPlans, getAllReports } from '@/lib/storage';
import { fetchTicketsApi, fetchPlansApi, fetchReportsApi } from '@/lib/api-client';

interface TechnicianDashboardProps {
  currentUser: UserSession;
  onBackToMain: () => void;
  onStartExecution: (site: Site, workType: WorkType, terminalId: string) => void;
  onStartRepairFromTicket: (ticket: SPBUTicket) => void;
  onOpenReportPdf: (report: PMReport) => void;
}

export const TechnicianDashboard: React.FC<TechnicianDashboardProps> = ({
  currentUser,
  onBackToMain,
  onStartExecution,
  onStartRepairFromTicket,
  onOpenReportPdf,
}) => {
  const [tickets, setTickets] = useState<SPBUTicket[]>(() => getAllTickets());
  const [plans, setPlans] = useState<MaintenancePlan[]>(() => getAllPlans());
  const [reports, setReports] = useState<PMReport[]>(() => getAllReports());

  useEffect(() => {
    let isMounted = true;
    const syncData = async () => {
      try {
        const [cloudTickets, cloudPlans, cloudReports] = await Promise.all([
          fetchTicketsApi(),
          fetchPlansApi(),
          fetchReportsApi(),
        ]);
        if (isMounted) {
          if (cloudTickets && cloudTickets.length > 0) setTickets(cloudTickets);
          if (cloudPlans && cloudPlans.length > 0) setPlans(cloudPlans);
          if (cloudReports && cloudReports.length > 0) setReports(cloudReports);
        }
      } catch (err) {
        console.warn('Sync error:', err);
      }
    };
    syncData();
    return () => { isMounted = false; };
  }, []);

  // Filter tasks specifically assigned to this technician (or open unassigned)
  const myAssignedTickets = tickets.filter(
    (t) => t.status !== 'Selesai (Resolved)' && (t.assigned_to?.includes(currentUser.name.split(' ')[0]) || !t.assigned_to)
  );

  const myUpcomingPlans = plans.filter(
    (p) => p.status !== 'Selesai' && (p.assigned_technician.includes(currentUser.name.split(' ')[0]) || p.assigned_technician.includes('Rizky'))
  );

  const myRecentReports = reports.filter(
    (r) => r.technician_name.includes(currentUser.name.split(' ')[0]) || r.technician_name.includes('Rizky')
  );

  return (
    <div className="space-y-6 pb-20">
      
      {/* Top Banner: Technician Profile & Scope */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="flex items-start gap-3.5">
            <button
              type="button"
              onClick={onBackToMain}
              className="min-h-[44px] min-w-[44px] px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-300 shadow-2xs"
              title="Kembali ke Halaman Pemilihan Form"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Kembali</span>
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  WORKSPACE TEKNISI LAPANGAN
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  NIK: {currentUser.employeeId}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#0B2545] mt-1 tracking-tight">
                Halo, {currentUser.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Kelola agenda inspeksi berkala, tindak lanjuti tiket kerusakan pompa/POS, dan laporkan Berita Acara.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Status: Siap Bertugas</span>
            </span>
          </div>

        </div>
      </div>

      {/* Quick Launch Cards: 3 Modul Pekerjaan Lapangan */}
      <div>
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5">
          Mulai Pekerjaan Baru di SPBU
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          
          {/* Card 1: PM Lengkap */}
          <button
            type="button"
            onClick={() => {
              const defaultSite = SAMPLE_SITES.find(s => s.id === currentUser.assignedSiteId) || SAMPLE_SITES[0];
              onStartExecution(defaultSite, 'PREVENTIVE_MAINTENANCE', 'POS-01');
            }}
            className="p-4 rounded-xl border border-red-300 bg-gradient-to-br from-red-50/50 to-white hover:border-red-500 text-left transition-all shadow-2xs group flex flex-col justify-between min-h-[140px]"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-[#ED1C24] text-white flex items-center justify-center font-bold">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-900 border border-red-200">
                  SOP Rutin Lengkap
                </span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-red-600 transition-colors">
                Preventive Maintenance (PM)
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-snug">
                Inspeksi berkala 10 modul PINSYST, ATG, dispenser, kelistrikan UPS, dan uji grounding.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs font-bold text-red-600">
              <span>Buka Form PM</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </button>

          {/* Card 2: Pengecekan Cepat */}
          <button
            type="button"
            onClick={() => {
              const defaultSite = SAMPLE_SITES.find(s => s.id === currentUser.assignedSiteId) || SAMPLE_SITES[0];
              onStartExecution(defaultSite, 'QUICK_CHECK', 'POS-01');
            }}
            className="p-4 rounded-xl border border-blue-300 bg-gradient-to-br from-blue-50/50 to-white hover:border-blue-500 text-left transition-all shadow-2xs group flex flex-col justify-between min-h-[140px]"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-[#0B2545] text-white flex items-center justify-center font-bold">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                  5 Menit
                </span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                Pengecekan Cepat (Health Check)
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-snug">
                Audit kesiapan kasir operasional: tes online terminal, komunikasi pompa, printer struk, dan EDC.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs font-bold text-blue-900">
              <span>Buka Form Cepat</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </button>

          {/* Card 3: Perbaikan Kerusakan */}
          <button
            type="button"
            onClick={() => {
              const defaultSite = SAMPLE_SITES.find(s => s.id === currentUser.assignedSiteId) || SAMPLE_SITES[0];
              onStartExecution(defaultSite, 'CORRECTIVE_REPAIR', 'POS-01');
            }}
            className="p-4 rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50/50 to-white hover:border-amber-500 text-left transition-all shadow-2xs group flex flex-col justify-between min-h-[140px]"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold">
                  <Wrench className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                  Troubleshooting
                </span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-amber-700 transition-colors">
                Tindakan Perbaikan (Repair)
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-snug">
                Penanganan kerusakan komponen, catatan akar masalah, penggantian sparepart, dan uji pasca servis.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs font-bold text-amber-700">
              <span>Buka Form Servis</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </button>

        </div>
      </div>

      {/* Section: Tiket Gangguan yang Ditugaskan ke Teknisi Ini */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="text-base font-extrabold text-[#0B2545]">
              Tiket Kendala Menunggu Tindak Lanjut ({myAssignedTickets.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Penugasan langsung dari PWS & Admin IT
          </span>
        </div>

        {myAssignedTickets.length === 0 ? (
          <div className="p-6 text-center bg-slate-50 rounded-lg border border-slate-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-slate-800">Tidak ada tiket kendala aktif saat ini</p>
            <p className="text-[11px] text-slate-500">Seluruh laporan kerusakan dari kasir dan SPBU telah tertangani.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myAssignedTickets.map((ticket) => (
              <div 
                key={ticket.id}
                className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-300">
                      {ticket.ticket_number}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      ticket.priority === 'Darurat' ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {ticket.priority}
                    </span>
                    <span className="text-xs text-slate-500">
                      Site: <strong>{ticket.site_name}</strong> ({ticket.terminal_id})
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">
                    {ticket.title}
                  </h4>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {ticket.description}
                  </p>
                  <div className="text-[11px] text-slate-500">
                    Pelapor: <strong>{ticket.reported_by}</strong> pada {ticket.reported_at}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onStartRepairFromTicket(ticket)}
                    className="min-h-[44px] px-4 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Jalankan Perbaikan</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section: Jadwal Kunjungan & Maintenance Mendatang */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-700" />
            <h3 className="text-base font-extrabold text-[#0B2545]">
              Agenda Kunjungan Pemeliharaan Teknisi ({myUpcomingPlans.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Jadwal PM Dwi-Mingguan & Bulanan
          </span>
        </div>

        <div className="space-y-3">
          {myUpcomingPlans.map((plan) => {
            const targetSite = SAMPLE_SITES.find(s => s.id === plan.site_id) || SAMPLE_SITES[0];
            return (
              <div 
                key={plan.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {plan.scheduled_date}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                      {plan.plan_type}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      PWS: {plan.supervisor_pws}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">
                    {plan.site_name} - {plan.terminal_id}
                  </h4>
                  <p className="text-xs text-slate-600">
                    {plan.notes}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onStartExecution(targetSite, plan.plan_type, plan.terminal_id)}
                    className="min-h-[44px] px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 text-blue-300" />
                    <span>Mulai Kunjungan</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section: Riwayat Berita Acara yang Pernah Dikerjakan */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-700" />
            <h3 className="text-base font-extrabold text-[#0B2545]">
              Arsip Berita Acara Terakhir Saya
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Tersimpan di Turso DB Cloud
          </span>
        </div>

        <div className="space-y-2.5">
          {myRecentReports.slice(0, 4).map((r) => (
            <div 
              key={r.id}
              className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-800">#{r.id}</span>
                  <span className="font-semibold text-slate-600">{r.execution_date}</span>
                  <span className="font-bold text-slate-900">{r.site_name}</span>
                </div>
                <div className="text-slate-500 mt-0.5 line-clamp-1">{r.findings_summary || 'Normal beroperasi'}</div>
              </div>

              <button
                type="button"
                onClick={() => onOpenReportPdf(r)}
                className="min-h-[38px] px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <FileText className="w-3 h-3 text-red-300" />
                <span>Lihat PDF</span>
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

