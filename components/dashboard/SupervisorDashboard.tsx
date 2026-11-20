'use client';

import { WORK_TYPE_LABEL } from '@/lib/work-type';
import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  UserCheck, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  FileText, 
  Plus, 
  ArrowLeft, 
  Wrench, 
  Clock, 
  ShieldCheck,
  Search,
  Filter,
  Activity,
  Layers,
  Zap,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { UserSession, Site, WorkType, SPBUTicket, MaintenancePlan, PMReport } from '@/lib/types';
import { SAMPLE_SITES } from '@/lib/sample-data';
import { getAllTickets, getAllPlans, getAllReports, saveTicket } from '@/lib/storage';
import { fetchTicketsApi, fetchPlansApi, fetchReportsApi, createTicketApi } from '@/lib/api-client';

export type SupervisorTab = 'overview' | 'tickets' | 'schedule' | 'reports';

interface SupervisorDashboardProps {
  currentUser: UserSession;
  onBackToMain: () => void;
  onOpenReportPdf: (report: PMReport) => void;
  onStartExecution: (site: Site, workType: WorkType, terminalId: string) => void;
  initialTab?: SupervisorTab;
  onTabChange?: (tab: SupervisorTab) => void;
}

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({
  currentUser,
  onBackToMain,
  onOpenReportPdf,
  onStartExecution,
  initialTab = 'overview',
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState<SupervisorTab>(initialTab);
  const [siteId, setSiteId] = useState<number>(currentUser.assignedSiteId || 1);
  const [tickets, setTickets] = useState<SPBUTicket[]>(() => getAllTickets());
  const [plans, setPlans] = useState<MaintenancePlan[]>(() => getAllPlans());
  const [reports, setReports] = useState<PMReport[]>(() => getAllReports());

  // Ticket filtering
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('ALL');
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState<string>('ALL');

  // Schedule filtering
  const [planStatusFilter, setPlanStatusFilter] = useState<string>('ALL');

  // Reports filtering
  const [reportSearch, setReportSearch] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState<string>('ALL');

  // Ticket modal state
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketTerminal, setTicketTerminal] = useState('POS-01');
  const [ticketPriority, setTicketPriority] = useState<'Darurat' | 'Tinggi' | 'Sedang' | 'Rendah'>('Tinggi');
  const [ticketCategory, setTicketCategory] = useState<any>('Dispenser & Forecourt');

  const currentSite = SAMPLE_SITES.find(s => s.id === siteId) || SAMPLE_SITES[0];

  // Sync tab with initialTab prop from parent / sidebar
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabSwitch = (tab: SupervisorTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  useEffect(() => {
    let isMounted = true;
    const syncData = async () => {
      try {
        const [cloudTickets, cloudPlans, cloudReports] = await Promise.all([
          fetchTicketsApi({ site_id: siteId }),
          fetchPlansApi({ site_id: siteId }),
          fetchReportsApi(siteId),
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
  }, [siteId]);

  // Site-specific data
  const siteTickets = tickets.filter(t => t.site_id === siteId);
  const openSiteTickets = siteTickets.filter(t => t.status !== 'Selesai (Resolved)');
  const sitePlans = plans.filter(p => p.site_id === siteId);
  const upcomingSitePlans = sitePlans.filter(p => p.status !== 'Selesai');
  const siteReports = reports.filter(r => r.site_id === siteId);
  const pendingSignOffReports = siteReports.filter(r => !r.supervisor_signature);

  // Filtered tickets
  const filteredTickets = siteTickets.filter(t => {
    if (ticketStatusFilter !== 'ALL' && t.status !== ticketStatusFilter) return false;
    if (ticketPriorityFilter !== 'ALL' && t.priority !== ticketPriorityFilter) return false;
    if (ticketSearch.trim()) {
      const q = ticketSearch.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchNum = t.ticket_number.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      if (!matchTitle && !matchNum && !matchDesc) return false;
    }
    return true;
  });

  // Filtered plans
  const filteredPlans = sitePlans.filter(p => {
    if (planStatusFilter !== 'ALL' && p.status !== planStatusFilter) return false;
    return true;
  });

  // Filtered reports
  const filteredReports = siteReports.filter(r => {
    if (reportTypeFilter !== 'ALL' && r.work_type !== reportTypeFilter) return false;
    if (reportSearch.trim()) {
      const q = reportSearch.toLowerCase();
      const matchId = r.id.toLowerCase().includes(q);
      const matchTech = r.technician_name.toLowerCase().includes(q);
      const matchSummary = (r.findings_summary || '').toLowerCase().includes(q);
      if (!matchId && !matchTech && !matchSummary) return false;
    }
    return true;
  });

  // Submit new ticket from SPBU PWS
  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTitle.trim() || !ticketDesc.trim()) return;

    const ticketNum = `TIK-PITL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket: SPBUTicket = {
      id: `TIK-${Date.now()}`,
      ticket_number: ticketNum,
      site_id: currentSite.id,
      site_code: currentSite.site_code,
      site_name: currentSite.site_name,
      terminal_id: ticketTerminal,
      category: ticketCategory,
      priority: ticketPriority,
      status: 'Open (Menunggu)',
      title: ticketTitle,
      description: ticketDesc,
      reported_by: `${currentUser.name} (PWS)`,
      reported_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
      assigned_to: 'Rizky Ramadhan (Teknisi)',
    };

    saveTicket(newTicket);
    setTickets(prev => [newTicket, ...prev]);
    setIsTicketModalOpen(false);
    setTicketTitle('');
    setTicketDesc('');

    await createTicketApi(newTicket);
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Top Banner: Supervisor / PWS Scope & Quick Switcher */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
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
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                  PORTAL PENGAWAS SITE (PWS)
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {currentUser.roleTitle}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#0B2545] mt-1 tracking-tight">
                {currentSite.site_name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Pengawas: <strong className="text-slate-800">{currentUser.name}</strong> | Lokasi: {currentSite.location}
              </p>
            </div>
          </div>

          {/* Quick Header Site Switcher & Ticket Action */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              value={siteId}
              onChange={(e) => setSiteId(Number(e.target.value))}
              aria-label="Pilih Site SPBU"
              className="min-h-[44px] px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {SAMPLE_SITES.map(s => (
                <option key={s.id} value={s.id}>{s.site_code} - {s.site_name}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setIsTicketModalOpen(true)}
              className="min-h-[44px] px-4 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Laporkan Kendala SPBU</span>
            </button>
          </div>

        </div>
      </div>

      {/* Single Module Tabs Navigation */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-1.5 flex overflow-x-auto gap-1">
        <button
          type="button"
          onClick={() => handleTabSwitch('overview')}
          className={`min-h-[44px] px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors flex-1 justify-center ${
            activeTab === 'overview'
              ? 'bg-[#0B2545] text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-300" />
          <span>Ikhtisar & Kesiapan SPBU</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch('tickets')}
          className={`min-h-[44px] px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors flex-1 justify-center ${
            activeTab === 'tickets'
              ? 'bg-[#0B2545] text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-300" />
          <span>Pusat Tiket Kendala</span>
          {openSiteTickets.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[11px] font-black flex items-center justify-center">
              {openSiteTickets.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch('schedule')}
          className={`min-h-[44px] px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors flex-1 justify-center ${
            activeTab === 'schedule'
              ? 'bg-[#0B2545] text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-300" />
          <span>Perencanaan & Jadwal PM</span>
          {upcomingSitePlans.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-black flex items-center justify-center">
              {upcomingSitePlans.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch('reports')}
          className={`min-h-[44px] px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors flex-1 justify-center ${
            activeTab === 'reports'
              ? 'bg-[#0B2545] text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4 text-red-300" />
          <span>Arsip Berita Acara & Pengesahan</span>
          {pendingSignOffReports.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[11px] font-black flex items-center justify-center animate-pulse">
              {pendingSignOffReports.length}
            </span>
          )}
        </button>
      </div>

      {/* ==================================================== */}
      {/* MODUL 1: IKHTISAR & STATUS KESIAPAN OPERASIONAL SPBU */}
      {/* ==================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-5 animate-in fade-in-50 duration-150">
          
          {/* Operational Readiness Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Kesiapan POS</span>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 flex items-center gap-1.5 mt-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Normal</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">POS-01 & POS-02 Online</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Dispenser BBM</span>
              <div className="text-xl sm:text-2xl font-extrabold text-[#0B2545] flex items-center gap-1.5 mt-1">
                <CheckCircle2 className="w-5 h-5 text-blue-700" />
                <span>Komunikasi OK</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Loop Converter & Totalizer Sinkron</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Level Air Tangki ATG</span>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 flex items-center gap-1.5 mt-1">
                <span>0.0 mm</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Bebas Kontaminasi Air</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Kendala Terbuka</span>
              <div className={`text-xl sm:text-2xl font-extrabold flex items-center gap-1.5 mt-1 ${
                openSiteTickets.length > 0 ? 'text-red-600' : 'text-slate-800'
              }`}>
                {openSiteTickets.length > 0 && <AlertTriangle className="w-5 h-5 text-red-500" />}
                <span>{openSiteTickets.length} Tiket</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {openSiteTickets.length > 0 ? 'Menunggu Penanganan Teknisi' : 'Forecourt Beroperasi Normal'}
              </span>
            </div>
          </div>

          {/* Forecourt & POS Technical Health Details */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#0B2545]">
                  Status Komponen Teknis di {currentSite.site_name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pemantauan real-time status perangkat keras POS PINSYST, FMS, sensor ATG, dan loop converter dispenser
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                Operasional Hijau
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-blue-600" />
                    Terminal POS Kasir
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between"><span>Advantech POS-01:</span><strong className="text-emerald-700">Online</strong></div>
                  <div className="flex justify-between"><span>Printer Epson TM-T82:</span><strong className="text-slate-800">Ready</strong></div>
                  <div className="flex justify-between"><span>EDC Mandiri & BNU:</span><strong className="text-emerald-700">Terhubung</strong></div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Automatic Tank Gauge (ATG)
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between"><span>Konsol Veeder-Root TLS-450:</span><strong className="text-emerald-700">Normal</strong></div>
                  <div className="flex justify-between"><span>Probe Tangki Pertamax:</span><strong className="text-slate-800">Water 0.0 mm</strong></div>
                  <div className="flex justify-between"><span>Probe Tangki Dexlite:</span><strong className="text-slate-800">Water 0.0 mm</strong></div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-600" />
                    Kelistrikan & Forecourt
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between"><span>Dispenser Tatsuno 4-Nozzle:</span><strong className="text-emerald-700">Tersinkron</strong></div>
                  <div className="flex justify-between"><span>UPS ICA 1200VA:</span><strong className="text-slate-800">224V Stabil</strong></div>
                  <div className="flex justify-between"><span>Grounding System:</span><strong className="text-emerald-700">1.2 V (Aman)</strong></div>
                </div>
              </div>
            </div>
          </div>

          {/* SOP Checklist Kesiapan Operasional Harian SPBU */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3.5">
            <h3 className="text-base font-extrabold text-[#0B2545]">
              Checklist Kesiapan Operasional Harian Pengawas (PWS)
            </h3>
            <p className="text-xs text-slate-500">
              Verifikasi fisik sebelum buka shift kasir SPBU untuk mencegah kendala antrean pelanggan
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs text-slate-700">
              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                <span>Pemeriksaan visual display dispenser & nozzle bebas tetesan BBM</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                <span>Kertas struk printer thermal terisi cukup pada POS-01 dan POS-02</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                <span>Konektivitas EDC (Wi-Fi Access Point) dan jaringan forecourt beroperasi normal</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                <span>Uji pompa emergency stop dan APAR pemadam api dalam radius siap pakai</span>
              </label>
            </div>
          </div>

          {/* Quick Action Footer */}
          <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-slate-100 rounded-xl border border-slate-200">
            <div className="text-xs text-slate-600">
              Perlu melakukan inspeksi teknis mandiri atau checklist pemeliharaan?
            </div>
            <button
              type="button"
              onClick={() => onStartExecution(currentSite, 'PREVENTIVE_MAINTENANCE', 'POS-01')}
              className="min-h-[44px] px-5 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
            >
              <Wrench className="w-4 h-4 text-blue-300" />
              <span>Mulai Formulir Pemeriksaan PM</span>
            </button>
          </div>

        </div>
      )}

      {/* ==================================================== */}
      {/* MODUL 2: PUSAT TIKET KENDALA SPBU (FULL-PAGE VIEW)  */}
      {/* ==================================================== */}
      {activeTab === 'tickets' && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          
          {/* Header & Filter Controls */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-[#0B2545]">
                  Daftar Kendala & Gangguan Teknis di {currentSite.site_name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Laporan kerusakan dispenser, ATG, printer struk, EDC, atau POS untuk ditindaklanjuti teknisi
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsTicketModalOpen(true)}
                className="min-h-[44px] px-4 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 self-start sm:self-auto shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat Tiket Masalah Baru</span>
              </button>
            </div>

            {/* Ticket Search & Filter Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari tiket, nomor, kendala..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  className="w-full min-h-[44px] pl-9 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <select
                  value={ticketStatusFilter}
                  onChange={(e) => setTicketStatusFilter(e.target.value)}
                  aria-label="Filter status tiket"
                  className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="ALL">Semua Status Tiket</option>
                  <option value="Open (Menunggu)">Open (Menunggu)</option>
                  <option value="Sedang Ditangani">Sedang Ditangani</option>
                  <option value="Selesai (Resolved)">Selesai (Resolved)</option>
                </select>
              </div>

              <div>
                <select
                  value={ticketPriorityFilter}
                  onChange={(e) => setTicketPriorityFilter(e.target.value)}
                  aria-label="Filter prioritas tiket"
                  className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="ALL">Semua Prioritas</option>
                  <option value="Darurat">Darurat</option>
                  <option value="Tinggi">Tinggi</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Rendah">Rendah</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ticket List Cards */}
          {filteredTickets.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">Tidak ada tiket kendala yang cocok</h4>
              <p className="text-xs text-slate-500 mt-1">
                Seluruh dispenser, terminal POS, dan ATG di SPBU ini beroperasi normal tanpa gangguan aktif.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((t) => {
                const isEmergency = t.priority === 'Darurat';
                const isResolved = t.status === 'Selesai (Resolved)';

                return (
                  <div 
                    key={t.id}
                    className={`bg-white rounded-xl p-4 sm:p-5 border transition-all shadow-2xs ${
                      isEmergency && !isResolved
                        ? 'border-red-500 ring-1 ring-red-500/30'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 text-xs">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                            {t.ticket_number}
                          </span>
                          <span className={`font-bold px-2 py-0.5 rounded-full ${
                            t.priority === 'Darurat' ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            Prioritas: {t.priority}
                          </span>
                          <span className={`font-bold px-2 py-0.5 rounded-full ${
                            t.status === 'Selesai (Resolved)' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {t.status}
                          </span>
                          <span className="text-slate-500">
                            Alat: <strong className="text-slate-700">{t.terminal_id}</strong>
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 mt-1">{t.title}</h4>
                        <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                          {t.description}
                        </p>

                        <div className="text-[11px] text-slate-500 pt-1">
                          Dilaporkan oleh: <strong className="text-slate-700">{t.reported_by}</strong> pada {t.reported_at} {t.assigned_to && `| Teknisi Ditugaskan: ${t.assigned_to}`}
                        </div>

                        {t.resolution_notes && (
                          <div className="mt-2 p-2.5 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-200">
                            <strong>Solusi Perbaikan:</strong> {t.resolution_notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ==================================================== */}
      {/* MODUL 3: PERENCANAAN & JADWAL PM (FULL-PAGE VIEW)   */}
      {/* ==================================================== */}
      {activeTab === 'schedule' && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-[#0B2545]">
                  Jadwal Pemeliharaan & Kunjungan Teknisi ke {currentSite.site_name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rencana inspeksi berkala 14 harian untuk menjamin integritas forecourt dan POS
                </p>
              </div>

              <div>
                <select
                  value={planStatusFilter}
                  onChange={(e) => setPlanStatusFilter(e.target.value)}
                  aria-label="Filter status jadwal PM"
                  className="min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none"
                >
                  <option value="ALL">Semua Status Jadwal</option>
                  <option value="Terjadwal">Terjadwal</option>
                  <option value="Mendekati Waktu">Mendekati Waktu</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>
            </div>
          </div>

          {filteredPlans.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
              <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">Tidak ada jadwal kunjungan terdaftar</h4>
              <p className="text-xs text-slate-500 mt-1">
                Hubungi Administrator IT Central jika diperlukan kunjungan PM darurat ke site ini.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPlans.map((p) => (
                <div 
                  key={p.id}
                  className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-700" />
                        {p.scheduled_date}
                      </span>
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {WORK_TYPE_LABEL[p.plan_type as WorkType] || p.plan_type}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        p.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                      }`}>
                        {p.status}
                      </span>
                    </div>

                    <div className="text-slate-700 font-medium">{p.notes}</div>

                    <div className="text-slate-500 flex items-center gap-3 flex-wrap pt-0.5">
                      <span>Teknisi Ditugaskan: <strong className="text-slate-800">{p.assigned_technician}</strong></span>
                      <span>&bull;</span>
                      <span>Target Peralatan: <strong className="font-mono text-slate-800">{p.terminal_id}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => onStartExecution(currentSite, p.plan_type, p.terminal_id)}
                      className="min-h-[44px] px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Wrench className="w-3.5 h-3.5 text-blue-300" />
                      <span>Mulai Eksekusi PM</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ==================================================== */}
      {/* MODUL 4: ARSIP BERITA ACARA & PENGESAHAN PWS        */}
      {/* ==================================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-5 animate-in fade-in-50 duration-150">
          
          {/* Priority Section: Berita Acara Menunggu Pengesahan PWS */}
          {pendingSignOffReports.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-5 border border-amber-300 space-y-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-amber-700 flex-shrink-0" />
                <div>
                  <h3 className="text-base font-extrabold text-amber-950">
                    Laporan Hasil PM Menunggu Pengesahan PWS ({pendingSignOffReports.length})
                  </h3>
                  <p className="text-xs text-amber-800">
                    Teknisi telah menyelesaikan checklist teknis di lapangan. Lakukan verifikasi dan berikan tanda tangan digital resmi.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                {pendingSignOffReports.map((r) => (
                  <div 
                    key={r.id}
                    className="bg-white p-4 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">#{r.id}</span>
                        <span className="font-semibold text-slate-600">{r.execution_date}</span>
                        <span className="font-bold text-slate-900">Teknisi: {r.technician_name}</span>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-300">Menunggu TTD</span>
                      </div>
                      <p className="text-slate-600 line-clamp-1">{r.findings_summary || 'Tidak ada catatan temuan kritis.'}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenReportPdf(r)}
                      className="min-h-[44px] px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors flex-shrink-0"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Review & Sahkan Berita Acara</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Archive Filter & Search Bar */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-[#0B2545]">
                  Arsip Dokumen Berita Acara Resmi {currentSite.site_name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rekam jejak digital berita acara pemeliharaan yang telah tersimpan di cloud database Turso
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={reportTypeFilter}
                  onChange={(e) => setReportTypeFilter(e.target.value)}
                  aria-label="Filter jenis kegiatan berita acara"
                  className="min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none"
                >
                  <option value="ALL">Semua Jenis Kegiatan</option>
                  <option value="PREVENTIVE_MAINTENANCE">Preventive Maintenance</option>
                  <option value="MECHANICAL_PM">PM Teknik (Dispenser & Tangki)</option>
                  <option value="QUICK_CHECK">Pengecekan Aja</option>
                  <option value="CORRECTIVE_REPAIR">Perbaikan (Repair)</option>
                </select>
              </div>
            </div>

            <div className="relative pt-2 border-t border-slate-100">
              <Search className="w-4 h-4 absolute left-3 top-5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari ID laporan, nama teknisi, atau temuan..."
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                className="w-full min-h-[44px] pl-9 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Reports Archive List */}
          {filteredReports.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">Tidak ada Berita Acara yang ditemukan</h4>
              <p className="text-xs text-slate-500 mt-1">
                Laporan Berita Acara akan otomatis tersimpan di sini setelah diselesaikan teknisi dan disahkan PWS.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((r) => (
                <div 
                  key={r.id}
                  className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 hover:border-slate-300 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">#{r.id}</span>
                      <span className="font-semibold text-slate-600">{r.execution_date}</span>
                      <span className="font-bold text-slate-900">
                        {WORK_TYPE_LABEL[r.work_type] || r.work_type}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                        {r.overall_status}
                      </span>
                    </div>
                    <div className="text-slate-600 mt-1 line-clamp-1">
                      {r.findings_summary || 'Pemeriksaan forecourt dan terminal PINSYST dalam batas normal.'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Teknisi: <strong className="text-slate-700">{r.technician_name}</strong> &bull; PWS: <strong className="text-slate-700">{r.supervisor_name}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenReportPdf(r)}
                    className="min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-colors flex-shrink-0 shadow-2xs"
                  >
                    <FileText className="w-4 h-4 text-red-300" />
                    <span>Buka PDF Resmi</span>
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* MODAL: BUAT TIKET KENDALA SPBU BARU */}
      {isTicketModalOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-300 overflow-hidden my-8 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="p-4 bg-[#0B2545] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Laporkan Kendala di {currentSite.site_name}</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Tiket akan langsung masuk ke layar pantau Teknisi & Administrator IT Central
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTicketModalOpen(false)}
                className="w-8 h-8 rounded text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center font-bold text-lg"
              >
                X
              </button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Terminal / Posisi Alat</label>
                  <input
                    type="text"
                    required
                    value={ticketTerminal}
                    onChange={(e) => setTicketTerminal(e.target.value)}
                    placeholder="Contoh: POS-01, Nozzle 2"
                    className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Prioritas Masalah</label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value as any)}
                    className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Darurat">Darurat (Pompa Mati)</option>
                    <option value="Tinggi">Tinggi (Mengganggu)</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Rendah">Rendah</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kategori Kerusakan</label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value as any)}
                  className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="Dispenser & Forecourt">Dispenser Pompa / Nozzle BBM</option>
                  <option value="ATG & Tangki Pendam">ATG & Tangki Pendam</option>
                  <option value="POS Terminal & Software">POS Terminal & Software PINSYST</option>
                  <option value="Printer Struk & Periferal">Printer Struk / Barcode Scanner</option>
                  <option value="EDC & Jaringan">Mesin EDC & Access Point Wi-Fi</option>
                  <option value="Kelistrikan & Power">Kelistrikan & Power UPS</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Judul Ringkasan Masalah</label>
                <input
                  type="text"
                  required
                  value={ticketTitle}
                  onChange={(e) => setTicketTitle(e.target.value)}
                  placeholder="Contoh: Nozzle Pertamax selang bocor / Printer POS macet"
                  className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Deskripsi Detail Gangguan</label>
                <textarea
                  rows={3}
                  required
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  placeholder="Jelaskan kronologi kejadian dan dampak pada transaksi penjualan SPBU..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Kirim Tiket ke Teknisi & Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
