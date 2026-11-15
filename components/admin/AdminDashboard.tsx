'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  ArrowLeft, 
  Wrench, 
  ShieldAlert, 
  ClipboardCheck, 
  FileText, 
  UserCheck, 
  ChevronRight,
  Download,
  CheckCircle,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Trash2,
  Database,
  Settings
} from 'lucide-react';
import { MasterConfigSection } from './MasterConfigSection';
import { 
  Site, 
  UserSession, 
  SPBUTicket, 
  MaintenancePlan, 
  TicketPriority, 
  TicketStatus, 
  TicketCategory, 
  WorkType, 
  PMReport 
} from '@/lib/types';
import { SAMPLE_SITES } from '@/lib/sample-data';
import { 
  getAllTickets, 
  saveTicket, 
  updateTicketStatus, 
  getAllPlans, 
  savePlan, 
  updatePlanStatus, 
  getAllReports 
} from '@/lib/storage';
import { 
  fetchTicketsApi, 
  createTicketApi, 
  updateTicketApi, 
  deleteTicketApi, 
  fetchPlansApi, 
  createPlanApi, 
  updatePlanApi, 
  deletePlanApi, 
  fetchReportsApi, 
  deleteReportApi 
} from '@/lib/api-client';

interface AdminDashboardProps {
  currentUser: UserSession;
  onBackToMain: () => void;
  onOpenReportPdf: (report: PMReport) => void;
  onStartExecutionFromPlan: (site: Site, workType: WorkType, terminalId: string) => void;
  onStartRepairFromTicket: (ticket: SPBUTicket) => void;
  initialTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
}

type AdminTab = 'overview' | 'tickets' | 'schedule' | 'reports' | 'users' | 'config';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onBackToMain,
  onOpenReportPdf,
  onStartExecutionFromPlan,
  onStartRepairFromTicket,
  initialTab,
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab || 'overview');

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabSwitch = (tab: AdminTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };
  const [tickets, setTickets] = useState<SPBUTicket[]>(() => getAllTickets());
  const [plans, setPlans] = useState<MaintenancePlan[]>(() => getAllPlans());
  const [reports, setReports] = useState<PMReport[]>(() => getAllReports());

  // Ticket filters
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('ALL');
  const [ticketSiteFilter, setTicketSiteFilter] = useState<number | 'ALL'>('ALL');

  // Schedule filters
  const [planSiteFilter, setPlanSiteFilter] = useState<number | 'ALL'>('ALL');
  const [planStatusFilter, setPlanStatusFilter] = useState<string>('ALL');

  // Reports filters
  const [reportSiteFilter, setReportSiteFilter] = useState<number | 'ALL'>('ALL');

  // Modals state
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [selectedTicketForUpdate, setSelectedTicketForUpdate] = useState<SPBUTicket | null>(null);

  // New Ticket Form state
  const [newTicketSiteId, setNewTicketSiteId] = useState<number>(SAMPLE_SITES[0].id);
  const [newTicketTerminal, setNewTicketTerminal] = useState('POS-01');
  const [newTicketCategory, setNewTicketCategory] = useState<TicketCategory>('Dispenser & Forecourt');
  const [newTicketPriority, setNewTicketPriority] = useState<TicketPriority>('Tinggi');
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketDesc, setNewTicketDesc] = useState('');
  const [newTicketReporter, setNewTicketReporter] = useState(currentUser.name);

  // New Plan Form state
  const [newPlanSiteId, setNewPlanSiteId] = useState<number>(SAMPLE_SITES[0].id);
  const [newPlanTerminal, setNewPlanTerminal] = useState('POS-01 & ISLANDS');
  const [newPlanType, setNewPlanType] = useState<WorkType>('PREVENTIVE_MAINTENANCE');
  const [newPlanDate, setNewPlanDate] = useState('2026-11-25');
  const [newPlanTech, setNewPlanTech] = useState('Rizky Ramadhan');
  const [newPlanSpv, setNewPlanSpv] = useState('Armando Da Costa');
  const [newPlanNotes, setNewPlanNotes] = useState('');

  // User Management State (Admin RBAC)
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('password123');
  const [newFullName, setNewFullName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'TECHNICIAN' | 'SUPERVISOR' | 'ADMIN'>('TECHNICIAN');
  const [newUserSiteId, setNewUserSiteId] = useState<number>(1);
  const [newUserPhone, setNewUserPhone] = useState('');

  // Ticket Update state
  const [updateStatus, setUpdateStatus] = useState<TicketStatus>('Sedang Ditangani');
  const [updateNotes, setUpdateNotes] = useState('');
  const [updateAssigned, setUpdateAssigned] = useState('');
  const [isTursoConnected, setIsTursoConnected] = useState(true);

  // Sync with Turso Database on mount
  useEffect(() => {
    let isMounted = true;
    const syncFromTurso = async () => {
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
          setIsTursoConnected(true);
        }

        // Fetch users for Admin RBAC
        try {
          const uRes = await fetch('/api/users');
          const uData = await uRes.json();
          if (isMounted && uData.success && Array.isArray(uData.users)) {
            setUsersList(uData.users);
          }
        } catch {
          // fallback
        }
      } catch (err) {
        console.warn('Sync Turso warning:', err);
        if (isMounted) setIsTursoConnected(false);
      }
    };
    syncFromTurso();
    return () => { isMounted = false; };
  }, []);

  // Refresh data helper
  const reloadData = async () => {
    setTickets(getAllTickets());
    setPlans(getAllPlans());
    setReports(getAllReports());
    try {
      const [cloudTickets, cloudPlans, cloudReports] = await Promise.all([
        fetchTicketsApi(),
        fetchPlansApi(),
        fetchReportsApi(),
      ]);
      if (cloudTickets && cloudTickets.length > 0) setTickets(cloudTickets);
      if (cloudPlans && cloudPlans.length > 0) setPlans(cloudPlans);
      if (cloudReports && cloudReports.length > 0) setReports(cloudReports);
    } catch {
      // fallback
    }
  };

  // Metrics calculation
  const totalSites = SAMPLE_SITES.length;
  const openTickets = tickets.filter(t => t.status !== 'Selesai (Resolved)');
  const emergencyTickets = tickets.filter(t => t.priority === 'Darurat' && t.status !== 'Selesai (Resolved)');
  const overduePlans = plans.filter(p => p.status === 'Overdue (Terlewat)');
  const upcomingPlans = plans.filter(p => p.status === 'Mendekati Waktu');

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchSearch = 
        t.ticket_number.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        t.title.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        t.site_name.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        t.reported_by.toLowerCase().includes(ticketSearch.toLowerCase());
      
      const matchStatus = 
        ticketStatusFilter === 'ALL' || t.status === ticketStatusFilter;

      const matchSite = 
        ticketSiteFilter === 'ALL' || t.site_id === ticketSiteFilter;

      return matchSearch && matchStatus && matchSite;
    });
  }, [tickets, ticketSearch, ticketStatusFilter, ticketSiteFilter]);

  // Filtered plans
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      const matchSite = planSiteFilter === 'ALL' || p.site_id === planSiteFilter;
      const matchStatus = planStatusFilter === 'ALL' || p.status === planStatusFilter;
      return matchSite && matchStatus;
    });
  }, [plans, planSiteFilter, planStatusFilter]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      return reportSiteFilter === 'ALL' || r.site_id === reportSiteFilter;
    });
  }, [reports, reportSiteFilter]);

  // Handle create ticket (CRUD Create)
  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketTitle.trim() || !newTicketDesc.trim()) return;

    const targetSite = SAMPLE_SITES.find(s => s.id === newTicketSiteId) || SAMPLE_SITES[0];
    const ticketNum = `TIK-PITL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTicket: SPBUTicket = {
      id: `TIK-${Date.now()}`,
      ticket_number: ticketNum,
      site_id: targetSite.id,
      site_code: targetSite.site_code,
      site_name: targetSite.site_name,
      terminal_id: newTicketTerminal,
      category: newTicketCategory,
      priority: newTicketPriority,
      status: 'Open (Menunggu)',
      title: newTicketTitle,
      description: newTicketDesc,
      reported_by: newTicketReporter,
      reported_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
      assigned_to: 'Rizky Ramadhan (Teknisi)',
    };

    saveTicket(newTicket);
    setTickets(prev => [newTicket, ...prev]);
    setIsNewTicketModalOpen(false);
    setNewTicketTitle('');
    setNewTicketDesc('');

    // Persist to Turso
    await createTicketApi(newTicket);
  };

  // Handle delete ticket (CRUD Delete)
  const handleDeleteTicket = async (ticketId: string) => {
    if (window.confirm('Hapus tiket kendala ini secara permanen?')) {
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      await deleteTicketApi(ticketId);
    }
  };

  // Handle create plan (CRUD Create)
  const handleCreatePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSite = SAMPLE_SITES.find(s => s.id === newPlanSiteId) || SAMPLE_SITES[0];

    const newPlan: MaintenancePlan = {
      id: `PLAN-${Date.now()}`,
      site_id: targetSite.id,
      site_code: targetSite.site_code,
      site_name: targetSite.site_name,
      terminal_id: newPlanTerminal,
      plan_type: newPlanType,
      scheduled_date: newPlanDate,
      assigned_technician: newPlanTech,
      supervisor_pws: newPlanSpv,
      status: 'Terjadwal',
      notes: newPlanNotes || 'Jadwal pemeliharaan berkala',
    };

    savePlan(newPlan);
    setPlans(prev => [newPlan, ...prev]);
    setIsNewPlanModalOpen(false);
    setNewPlanNotes('');

    // Persist to Turso
    await createPlanApi(newPlan);
  };

  // Handle delete plan (CRUD Delete)
  const handleDeletePlan = async (planId: string) => {
    if (window.confirm('Hapus jadwal pemeliharaan ini?')) {
      setPlans(prev => prev.filter(p => p.id !== planId));
      await deletePlanApi(planId);
    }
  };

  // Handle update ticket (CRUD Update)
  const handleTicketUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketForUpdate) return;

    updateTicketStatus(
      selectedTicketForUpdate.id,
      updateStatus,
      updateNotes,
      updateAssigned || selectedTicketForUpdate.assigned_to
    );

    const ticketId = selectedTicketForUpdate.id;
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          status: updateStatus,
          resolution_notes: updateNotes,
          assigned_to: updateAssigned || t.assigned_to,
        };
      }
      return t;
    }));

    setSelectedTicketForUpdate(null);

    // Persist to Turso
    await updateTicketApi(ticketId, updateStatus, updateNotes, updateAssigned);
  };

  // Handle delete report (CRUD Delete)
  const handleDeleteReport = async (reportId: string) => {
    if (window.confirm(`Hapus Berita Acara #${reportId} dari database Turso?`)) {
      setReports(prev => prev.filter(r => r.id !== reportId));
      await deleteReportApi(reportId);
    }
  };

  // Handle create user (Admin RBAC)
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newFullName.trim()) return;

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          name: newFullName.trim(),
          role: newUserRole,
          role_title: newUserRole === 'ADMIN' ? 'Administrator IT & Forecourt Central' : newUserRole === 'SUPERVISOR' ? 'Pengawas (PWS) Site SPBU' : 'Teknisi Lapangan POS & FMS',
          employee_id: `USR-${Date.now().toString().slice(-4)}`,
          phone: newUserPhone || '+670 7700 0000',
          assigned_site_id: newUserSiteId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsNewUserModalOpen(false);
        setNewUsername('');
        setNewFullName('');
        setNewUserPhone('');
        const uRes = await fetch('/api/users');
        const uData = await uRes.json();
        if (uData.success) setUsersList(uData.users);
      }
    } catch (err: any) {
      alert('Gagal membuat user baru: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Navigation: Clean & Spacious */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/90 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-start gap-3.5">
            <button
              type="button"
              onClick={onBackToMain}
              className="min-h-[44px] min-w-[44px] px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-300 shadow-2xs"
              title="Kembali ke Halaman Utama"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Kembali</span>
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-[#0B2545] border border-blue-200">
                  PORTAL SPV & ADMIN IT
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Pertamina International Timor, S.A.
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#0B2545] mt-1 tracking-tight">
                Dashboard Pengawasan & Manajemen Tiket SPBU
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Pemantauan kesiapan teknis SPBU, tindak lanjut keluhan lapangan, dan perencanaan jadwal pemeliharaan.
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsNewTicketModalOpen(true)}
              className="min-h-[44px] px-4 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Tiket Kendala</span>
            </button>

            <button
              type="button"
              onClick={() => setIsNewPlanModalOpen(true)}
              className="min-h-[44px] px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span>Jadwalkan PM</span>
            </button>
          </div>

        </div>
      </div>

      {/* Main Tabs Navigation */}
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
          <Building2 className="w-4 h-4" />
          <span>Ikhtisar & Status SPBU</span>
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
          <AlertTriangle className="w-4 h-4" />
          <span>Pusat Tiket SPBU</span>
          {openTickets.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[11px] font-black flex items-center justify-center">
              {openTickets.length}
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
          <Calendar className="w-4 h-4" />
          <span>Perencanaan & Jadwal PM</span>
          {upcomingPlans.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-black flex items-center justify-center">
              {upcomingPlans.length}
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
          <FileText className="w-4 h-4" />
          <span>Arsip Berita Acara</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch('users')}
          className={`min-h-[44px] px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors flex-1 justify-center ${
            activeTab === 'users'
              ? 'bg-[#0B2545] text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>User & RBAC</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch('config')}
          className={`min-h-[44px] px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors flex-1 justify-center ${
            activeTab === 'config'
              ? 'bg-[#0B2545] text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Konfigurasi & Master Data</span>
        </button>
      </div>

      {/* TAB 1: IKHTISAR & STATUS SPBU */}
      {activeTab === 'overview' && (
        <div className="space-y-6">

          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Site SPBU</span>
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2545]">
                {totalSites}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                3 Site Timor Leste, 2 COCO Jabodetabek
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Tiket Terbuka</span>
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">
                {openTickets.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {emergencyTickets.length > 0 ? `${emergencyTickets.length} status darurat!` : 'Tidak ada tiket darurat'}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">PM Bulan Ini</span>
                <Calendar className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
                {plans.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {upcomingPlans.length} mendekati jadwal pelaksanaan
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Kepatuhan SLA</span>
                <CheckCircle2 className="w-4 h-4 text-[#ED1C24]" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-900">
                94.8%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Rata-rata respons teknisi 2.4 jam
              </div>
            </div>

          </div>

          {/* SPBU Monitoring Grid */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-[#0B2545]">
                  Status Kesiapan Operasional SPBU
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Informasi pengawas bertugas, kondisi peralatan forecourt, dan riwayat terakhir
                </p>
              </div>

              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 self-start sm:self-auto">
                Semua Sistem Beroperasi
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {SAMPLE_SITES.map((site) => {
                const siteTickets = tickets.filter(t => t.site_id === site.id && t.status !== 'Selesai (Resolved)');
                const sitePlans = plans.filter(p => p.site_id === site.id);
                const nextPlan = sitePlans.find(p => p.status === 'Mendekati Waktu' || p.status === 'Terjadwal');

                return (
                  <div key={site.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Left: Site Info */}
                      <div className="space-y-1 max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
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
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                          <UserCheck className="w-3.5 h-3.5 text-blue-700" />
                          <span>PWS / Penanggung Jawab:</span>
                          <span className="font-semibold text-slate-800">{site.contact_person}</span>
                        </div>
                      </div>

                      {/* Middle: Live Health Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Kondisi POS & FMS</span>
                          <span className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Normal Aktif
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Tiket Kendala</span>
                          {siteTickets.length > 0 ? (
                            <span className="font-bold text-red-600 flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                              {siteTickets.length} Terbuka
                            </span>
                          ) : (
                            <span className="font-bold text-slate-600 flex items-center gap-1 mt-0.5">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                              0 Kendala
                            </span>
                          )}
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Jadwal PM Terdekat</span>
                          <span className="font-medium text-slate-800 mt-0.5 block truncate">
                            {nextPlan ? `${nextPlan.scheduled_date} (${nextPlan.plan_type === 'PREVENTIVE_MAINTENANCE' ? 'PM' : 'Cek'})` : 'Belum dijadwalkan'}
                          </span>
                        </div>
                      </div>

                      {/* Right Actions */}
                      <div className="flex items-center gap-2 self-start lg:self-center flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setNewTicketSiteId(site.id);
                            setIsNewTicketModalOpen(true);
                          }}
                          className="min-h-[40px] px-3 py-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Lapor Kendala</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onStartExecutionFromPlan(site, 'PREVENTIVE_MAINTENANCE', 'POS-01');
                          }}
                          className="min-h-[40px] px-3.5 py-1.5 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <Wrench className="w-3.5 h-3.5 text-blue-300" />
                          <span>Mulai PM</span>
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}


      {/* TAB 2: PUSAT TIKET KENDALA SPBU */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          
          {/* Ticket Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-[#0B2545]">
                  Daftar Tiket Kendala SPBU
                </h3>
                <p className="text-xs text-slate-500">
                  Laporan masalah dari kasir atau pengawas SPBU untuk segera ditindaklanjuti teknisi
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsNewTicketModalOpen(true)}
                className="min-h-[44px] px-4 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 self-start sm:self-auto shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat Tiket Baru</span>
              </button>
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
              
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari tiket, kendala, nomor, pelapor..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  className="w-full min-h-[44px] pl-9 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <select
                  value={ticketStatusFilter}
                  onChange={(e) => setTicketStatusFilter(e.target.value)}
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
                  value={ticketSiteFilter}
                  onChange={(e) => setTicketSiteFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                  className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="ALL">Semua Site SPBU</option>
                  {SAMPLE_SITES.map(s => (
                    <option key={s.id} value={s.id}>{s.site_code} - {s.site_name}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Ticket List Cards */}
          <div className="space-y-3">
            {filteredTickets.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">Tidak ada tiket kendala yang cocok</h4>
                <p className="text-xs text-slate-500 mt-1">Semua tiket kendala telah ditangani atau filter pencarian tidak menemukan hasil.</p>
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isEmergency = t.priority === 'Darurat';
                const isHigh = t.priority === 'Tinggi';
                const isResolved = t.status === 'Selesai (Resolved)';
                const isInProgress = t.status === 'Sedang Ditangani';

                return (
                  <div 
                    key={t.id} 
                    className={`bg-white rounded-xl p-4 sm:p-5 border transition-all shadow-2xs ${
                      isEmergency && !isResolved
                        ? 'border-red-500 ring-1 ring-red-500/30'
                        : isHigh && !isResolved
                        ? 'border-amber-400'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      
                      {/* Left: Ticket Header & Info */}
                      <div className="space-y-2 flex-1">
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                            {t.ticket_number}
                          </span>

                          {/* Priority Badge */}
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            isEmergency 
                              ? 'bg-red-100 text-red-800 border-red-300' 
                              : isHigh 
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-blue-100 text-blue-800 border-blue-200'
                          }`}>
                            Prioritas: {t.priority}
                          </span>

                          {/* Status Badge */}
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            isResolved
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : isInProgress
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}>
                            {t.status}
                          </span>

                          <span className="text-xs text-slate-500">
                            Kategori: <strong className="text-slate-700">{t.category}</strong>
                          </span>
                        </div>

                        <h4 className="text-base font-extrabold text-slate-900">
                          {t.title}
                        </h4>

                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                          {t.description}
                        </p>

                        {/* Metadata Row */}
                        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-1">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-blue-700" />
                            <span className="font-semibold text-slate-800">{t.site_name}</span>
                            <span className="font-mono text-[11px] bg-slate-100 px-1 rounded">({t.terminal_id})</span>
                          </div>

                          <div>
                            Pelapor: <strong className="text-slate-800">{t.reported_by}</strong>
                          </div>

                          <div>
                            Waktu: <span className="font-mono text-slate-600">{t.reported_at}</span>
                          </div>

                          {t.assigned_to && (
                            <div className="flex items-center gap-1 text-blue-900 font-medium">
                              <UserCheck className="w-3.5 h-3.5" />
                              Teknisi: {t.assigned_to}
                            </div>
                          )}
                        </div>

                        {/* Resolution Notes if Resolved */}
                        {isResolved && t.resolution_notes && (
                          <div className="mt-2 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900">
                            <strong className="block text-[11px] uppercase tracking-wider text-emerald-800">
                              Catatan Solusi ({t.resolved_at}):
                            </strong>
                            {t.resolution_notes}
                          </div>
                        )}

                      </div>

                      {/* Right: Actions */}
                      <div className="flex md:flex-col items-center gap-2 flex-shrink-0 pt-2 md:pt-0">
                        
                        {/* Action: Convert to Repair Session */}
                        {!isResolved && (
                          <button
                            type="button"
                            onClick={() => onStartRepairFromTicket(t)}
                            className="w-full min-h-[44px] px-3.5 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                            title="Buka form perbaikan untuk tiket ini"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Jalankan Perbaikan</span>
                          </button>
                        )}

                        {/* Action: Update Status or Assign */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTicketForUpdate(t);
                            setUpdateStatus(t.status);
                            setUpdateNotes(t.resolution_notes || '');
                            setUpdateAssigned(t.assigned_to || '');
                          }}
                          className="w-full min-h-[44px] px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
                          <span>Update Tiket</span>
                        </button>

                        {/* Action: Delete Ticket (Admin Only RBAC) */}
                        {currentUser.role === 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTicket(t.id)}
                            className="w-full min-h-[38px] px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                            title="Hapus Tiket (Hak Akses Admin IT)"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            <span>Hapus Tiket</span>
                          </button>
                        )}

                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}


      {/* TAB 3: PERENCANAAN & JADWAL PM */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-[#0B2545]">
                  Rencana Jadwal Pemeliharaan (PM Schedule)
                </h3>
                <p className="text-xs text-slate-500">
                  Kalender jadwal pemeliharaan rutin dwi-mingguan dan bulanan seluruh SPBU
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsNewPlanModalOpen(true)}
                className="min-h-[44px] px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 self-start sm:self-auto shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Jadwal Baru</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <select
                value={planSiteFilter}
                onChange={(e) => setPlanSiteFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="ALL">Semua Site SPBU</option>
                {SAMPLE_SITES.map(s => (
                  <option key={s.id} value={s.id}>{s.site_code} - {s.site_name}</option>
                ))}
              </select>

              <select
                value={planStatusFilter}
                onChange={(e) => setPlanStatusFilter(e.target.value)}
                className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="ALL">Semua Status Jadwal</option>
                <option value="Mendekati Waktu">Mendekati Waktu (&lt; 7 Hari)</option>
                <option value="Terjadwal">Terjadwal</option>
                <option value="Overdue (Terlewat)">Overdue (Terlewat)</option>
                <option value="Selesai">Selesai</option>
              </select>
            </div>
          </div>

          {/* Schedule Table / Cards */}
          <div className="space-y-3">
            {filteredPlans.map((p) => {
              const targetSite = SAMPLE_SITES.find(s => s.id === p.site_id) || SAMPLE_SITES[0];
              const isOverdue = p.status === 'Overdue (Terlewat)';
              const isUpcoming = p.status === 'Mendekati Waktu';
              const isDone = p.status === 'Selesai';

              return (
                <div 
                  key={p.id}
                  className={`bg-white rounded-xl p-4 sm:p-5 border transition-all shadow-2xs ${
                    isOverdue 
                      ? 'border-red-400 bg-red-50/20' 
                      : isUpcoming 
                      ? 'border-amber-400 bg-amber-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Left: Schedule details */}
                    <div className="space-y-2 flex-1">
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-700" />
                          {p.scheduled_date}
                        </span>

                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          isOverdue 
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : isUpcoming
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : isDone
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          {p.status}
                        </span>

                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200">
                          {p.plan_type === 'PREVENTIVE_MAINTENANCE' 
                            ? 'Preventive Maintenance (PM)' 
                            : p.plan_type === 'QUICK_CHECK' 
                            ? 'Pengecekan Aja' 
                            : 'Perbaikan'}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900">
                        {p.site_name}
                      </h4>

                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                        {p.notes}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                        <div>
                          Terminal ID: <strong className="font-mono text-slate-800">{p.terminal_id}</strong>
                        </div>
                        <div>
                          Teknisi Bertugas: <strong className="text-slate-800">{p.assigned_technician}</strong>
                        </div>
                        <div>
                          Pengawas PWS: <strong className="text-slate-800">{p.supervisor_pws}</strong>
                        </div>
                      </div>

                    </div>

                    {/* Right: Action */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!isDone && (
                        <button
                          type="button"
                          onClick={() => onStartExecutionFromPlan(targetSite, p.plan_type, p.terminal_id)}
                          className="min-h-[44px] px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors"
                        >
                          <Wrench className="w-3.5 h-3.5 text-blue-300" />
                          <span>Mulai Eksekusi Form</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          const nextStatus = isDone ? 'Terjadwal' : 'Selesai';
                          updatePlanStatus(p.id, nextStatus as MaintenancePlan['status']);
                          reloadData();
                        }}
                        className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold border transition-colors ${
                          isDone
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {isDone ? 'Tandai Belum Selesai' : 'Tandai Selesai'}
                      </button>

                      {/* Action: Delete Plan (Admin Only RBAC) */}
                      {currentUser.role === 'ADMIN' && (
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(p.id)}
                          className="min-h-[44px] px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                          title="Hapus Jadwal (Hak Akses Admin IT)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Hapus</span>
                        </button>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}


      {/* TAB 4: ARSIP BERITA ACARA PER SPBU */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-[#0B2545]">
                  Arsip Laporan & Berita Acara Hasil Pekerjaan
                </h3>
                <p className="text-xs text-slate-500">
                  Semua Berita Acara resmi yang telah ditandatangani dan disinkronkan ke server pusat
                </p>
              </div>

              <div className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300 self-start sm:self-auto">
                Total Arsip: {filteredReports.length} Laporan
              </div>
            </div>

            {/* Filter */}
            <div className="pt-2 border-t border-slate-100">
              <select
                value={reportSiteFilter}
                onChange={(e) => setReportSiteFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="w-full sm:max-w-xs min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="ALL">Semua Site SPBU</option>
                {SAMPLE_SITES.map(s => (
                  <option key={s.id} value={s.id}>{s.site_code} - {s.site_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Reports List */}
          <div className="space-y-3">
            {filteredReports.map((r) => {
              return (
                <div 
                  key={r.id}
                  className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 hover:border-slate-300 shadow-2xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                        #{r.id}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                        {r.work_type === 'PREVENTIVE_MAINTENANCE' 
                          ? 'Preventive Maintenance' 
                          : r.work_type === 'QUICK_CHECK' 
                          ? 'Pengecekan Aja' 
                          : 'Perbaikan'}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        r.overall_status === 'Selesai (Normal)'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {r.overall_status}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900">
                      {r.site_name}
                    </h4>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {r.findings_summary || 'Tidak ada catatan temuan khusus.'}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-1">
                      <div>
                        Tanggal: <strong className="font-mono text-slate-700">{r.execution_date}</strong>
                      </div>
                      <div>
                        Teknisi: <strong className="text-slate-800">{r.technician_name}</strong>
                      </div>
                      <div>
                        PWS: <strong className="text-slate-800">{r.supervisor_name}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenReportPdf(r)}
                      className="min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-red-400" />
                      <span>Buka Berita Acara</span>
                    </button>

                    {/* Action: Delete Report (Admin Only RBAC) */}
                    {currentUser.role === 'ADMIN' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteReport(r.id)}
                        className="min-h-[44px] px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                        title="Hapus Laporan (Hak Akses Admin IT)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Hapus</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}


      {/* TAB 5: MANAJEMEN USER & RBAC */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-[#0B2545]">
                  Daftar Akun Pengguna & Hak Akses (RBAC)
                </h3>
                <p className="text-xs text-slate-500">
                  Pengaturan otentikasi dan hak akses peran teknisi, pengawas site, dan administrator IT di Turso Database
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsNewUserModalOpen(true)}
                className="min-h-[44px] px-4 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 self-start sm:self-auto shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Akun Baru</span>
              </button>
            </div>

            {/* RBAC Privilege Matrix Explanation */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-900 block mb-2 uppercase text-[11px] tracking-wider">
                Matriks Hak Akses (RBAC Matrix) Pertamina International Timor
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="font-bold text-emerald-800 block text-xs">Teknisi Lapangan (TECHNICIAN)</span>
                  <ul className="text-[11px] text-slate-600 space-y-1 mt-1.5 list-disc list-inside">
                    <li>Mengisi form PM 10 modul</li>
                    <li>Upload foto dokumentasi fisik</li>
                    <li>Uji grounding & tegangan listrik</li>
                    <li>Tanda tangan digital teknisi</li>
                  </ul>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="font-bold text-blue-900 block text-xs">Pengawas Site (SUPERVISOR / PWS)</span>
                  <ul className="text-[11px] text-slate-600 space-y-1 mt-1.5 list-disc list-inside">
                    <li>Monitoring kesiapan SPBU</li>
                    <li>Review & sahkan Berita Acara</li>
                    <li>Tanda tangan digital pengawas</li>
                    <li>Buat tiket gangguan SPBU</li>
                  </ul>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="font-bold text-purple-900 block text-xs">Administrator IT (ADMIN)</span>
                  <ul className="text-[11px] text-slate-600 space-y-1 mt-1.5 list-disc list-inside">
                    <li>Akses seluruh 5 site SPBU</li>
                    <li>Disposisi teknisi pada helpdesk</li>
                    <li>Kalender jadwal maintenance PM</li>
                    <li>Manajemen user & hak hapus (CRUD)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* User Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                    <th className="p-3.5">Nama & NIK</th>
                    <th className="p-3.5">Username</th>
                    <th className="p-3.5">Peran (Role)</th>
                    <th className="p-3.5">Site Penugasan</th>
                    <th className="p-3.5">Kontak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersList.map((u) => {
                    const assignedSite = SAMPLE_SITES.find(s => s.id === u.assignedSiteId);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{u.name}</div>
                          <div className="text-[11px] font-mono text-slate-500">{u.employeeId}</div>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-800">
                          {u.username}
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : u.role === 'SUPERVISOR'
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}>
                            {u.roleTitle || u.role}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-700 font-medium">
                          {u.role === 'SUPERVISOR' 
                            ? (assignedSite ? `${assignedSite.site_code} (${assignedSite.site_name.split(' ')[2] || assignedSite.site_name})` : `Site #${u.assignedSiteId}`)
                            : u.role === 'TECHNICIAN'
                            ? 'Lintas Seluruh Site (Mobile)'
                            : 'Pusat (Seluruh SPBU)'}
                        </td>
                        <td className="p-3.5 font-mono text-slate-600">
                          {u.phone}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: MASTER KONFIGURASI SPBU, ATG, PRODUK & SISTEM */}
      {activeTab === 'config' && (
        <MasterConfigSection />
      )}

      {/* MODAL: BUAT TIKET KENDALA SPBU BARU */}
      {isNewTicketModalOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-300 overflow-hidden my-8">
            
            <div className="p-4 bg-[#0B2545] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Buat Tiket Kendala SPBU Baru</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Laporan kerusakan atau gangguan sistem POS PINSYST & FMS
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewTicketModalOpen(false)}
                className="w-8 h-8 rounded text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center font-bold text-lg"
              >
                X
              </button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="p-5 space-y-4">
              
              {/* Site Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Site / Lokasi SPBU
                </label>
                <select
                  value={newTicketSiteId}
                  onChange={(e) => setNewTicketSiteId(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  {SAMPLE_SITES.map(s => (
                    <option key={s.id} value={s.id}>{s.site_code} - {s.site_name}</option>
                  ))}
                </select>
              </div>

              {/* Terminal & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Terminal / Alat
                  </label>
                  <input
                    type="text"
                    value={newTicketTerminal}
                    onChange={(e) => setNewTicketTerminal(e.target.value)}
                    placeholder="Contoh: POS-01, Nozzle 2"
                    className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Prioritas Kendala
                  </label>
                  <select
                    value={newTicketPriority}
                    onChange={(e) => setNewTicketPriority(e.target.value as TicketPriority)}
                    className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    <option value="Darurat">Darurat (Macet Total)</option>
                    <option value="Tinggi">Tinggi (Mengganggu)</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Rendah">Rendah</option>
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Kategori Kerusakan
                </label>
                <select
                  value={newTicketCategory}
                  onChange={(e) => setNewTicketCategory(e.target.value as TicketCategory)}
                  className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="Dispenser & Forecourt">Dispenser & Forecourt</option>
                  <option value="ATG & Tangki Pendam">ATG & Tangki Pendam</option>
                  <option value="POS Terminal & Software">POS Terminal & Software</option>
                  <option value="Printer Struk & Periferal">Printer Struk & Periferal</option>
                  <option value="EDC & Jaringan">EDC & Jaringan</option>
                  <option value="Kelistrikan & Power">Kelistrikan & Power</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ringkasan Masalah (Judul)
                </label>
                <input
                  type="text"
                  value={newTicketTitle}
                  onChange={(e) => setNewTicketTitle(e.target.value)}
                  placeholder="Contoh: Auto-cutter printer POS-01 macet tidak memotong kertas"
                  className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Deskripsi Lengkap Kendala
                </label>
                <textarea
                  rows={3}
                  value={newTicketDesc}
                  onChange={(e) => setNewTicketDesc(e.target.value)}
                  placeholder="Jelaskan gejala kerusakan, pesan error yang muncul, dan frekuensi kendala..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                  required
                />
              </div>

              {/* Reporter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Pelapor (Kasir / PWS)
                </label>
                <input
                  type="text"
                  value={newTicketReporter}
                  onChange={(e) => setNewTicketReporter(e.target.value)}
                  className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                  required
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTicketModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 bg-[#ED1C24] hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Kirim Tiket Kendala
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* MODAL: TAMBAH JADWAL MAINTENANCE BARU */}
      {isNewPlanModalOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-300 overflow-hidden my-8">
            
            <div className="p-4 bg-[#0B2545] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Jadwalkan Maintenance SPBU Baru</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Rencanakan kunjungan teknisi untuk PM, Pengecekan, atau Perbaikan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewPlanModalOpen(false)}
                className="w-8 h-8 rounded text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center font-bold text-lg"
              >
                X
              </button>
            </div>

            <form onSubmit={handleCreatePlanSubmit} className="p-5 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Site / Lokasi SPBU
                </label>
                <select
                  value={newPlanSiteId}
                  onChange={(e) => setNewPlanSiteId(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  {SAMPLE_SITES.map(s => (
                    <option key={s.id} value={s.id}>{s.site_code} - {s.site_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Jenis Kegiatan
                  </label>
                  <select
                    value={newPlanType}
                    onChange={(e) => setNewPlanType(e.target.value as WorkType)}
                    className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    <option value="PREVENTIVE_MAINTENANCE">Preventive Maintenance (PM)</option>
                    <option value="QUICK_CHECK">Pengecekan Aja</option>
                    <option value="CORRECTIVE_REPAIR">Perbaikan (Repair)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tanggal Pelaksanaan
                  </label>
                  <input
                    type="date"
                    value={newPlanDate}
                    onChange={(e) => setNewPlanDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Teknisi Ditugaskan
                  </label>
                  <input
                    type="text"
                    value={newPlanTech}
                    onChange={(e) => setNewPlanTech(e.target.value)}
                    className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Pengawas PWS
                  </label>
                  <input
                    type="text"
                    value={newPlanSpv}
                    onChange={(e) => setNewPlanSpv(e.target.value)}
                    className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Catatan / Lingkup Khusus
                </label>
                <textarea
                  rows={2}
                  value={newPlanNotes}
                  onChange={(e) => setNewPlanNotes(e.target.value)}
                  placeholder="Contoh: Kalibrasi totalisator nozzle pulau 1 dan pembersihan filter dispenser"
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewPlanModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Simpan Jadwal
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* MODAL: UPDATE TIKET STATUS & CATATAN SOLUSI */}
      {selectedTicketForUpdate && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-300 overflow-hidden my-8">
            
            <div className="p-4 bg-[#0B2545] text-white flex items-center justify-between">
              <div>
                <span className="font-mono text-xs bg-blue-900 px-2 py-0.5 rounded text-blue-200">
                  {selectedTicketForUpdate.ticket_number}
                </span>
                <h3 className="text-base font-bold mt-1">Update Status Tiket Kendala</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicketForUpdate(null)}
                className="w-8 h-8 rounded text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center font-bold text-lg"
              >
                X
              </button>
            </div>

            <form onSubmit={handleTicketUpdateSubmit} className="p-5 space-y-4">
              
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div className="font-bold text-slate-900">{selectedTicketForUpdate.title}</div>
                <div className="text-slate-500 mt-1">{selectedTicketForUpdate.site_name} | {selectedTicketForUpdate.terminal_id}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Status Tiket
                </label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value as TicketStatus)}
                  className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="Open (Menunggu)">Open (Menunggu)</option>
                  <option value="Sedang Ditangani">Sedang Ditangani</option>
                  <option value="Selesai (Resolved)">Selesai (Resolved)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Teknisi yang Ditugaskan
                </label>
                <input
                  type="text"
                  value={updateAssigned}
                  onChange={(e) => setUpdateAssigned(e.target.value)}
                  placeholder="Nama teknisi pelaksana"
                  className="w-full min-h-[44px] px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Catatan Solusi / Tindak Lanjut
                </label>
                <textarea
                  rows={3}
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  placeholder="Tuliskan tindakan perbaikan yang telah dilakukan dan status akhir sparepart..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTicketForUpdate(null)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Simpan Perubahan
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* MODAL: TAMBAH USER / AKUN RBAC BARU */}
      {isNewUserModalOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-300 overflow-hidden my-8">
            <div className="p-4 bg-[#0B2545] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Tambah Akun Pengguna Baru (RBAC)</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Simpan akun baru langsung ke Database Turso
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewUserModalOpen(false)}
                className="w-8 h-8 rounded text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center font-bold text-lg"
              >
                X
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nama Lengkap Petugas</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Contoh: Domingos Da Silva"
                  className="w-full min-h-[44px] px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Username Login</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Contoh: domingos"
                    className="w-full min-h-[44px] px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full min-h-[44px] px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Peran (Role RBAC)</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full min-h-[44px] px-3 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="TECHNICIAN">Teknisi Lapangan</option>
                    <option value="SUPERVISOR">Pengawas Site (PWS)</option>
                    <option value="ADMIN">Administrator IT Central</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {newUserRole === 'SUPERVISOR' ? 'Site Penugasan Pengawas (PWS)' : 'Lingkup Penugasan'}
                  </label>
                  {newUserRole === 'SUPERVISOR' ? (
                    <select
                      value={newUserSiteId}
                      onChange={(e) => setNewUserSiteId(Number(e.target.value))}
                      className="w-full min-h-[44px] px-3 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      {SAMPLE_SITES.map(s => (
                        <option key={s.id} value={s.id}>{s.site_code} - {s.site_name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="min-h-[44px] px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 flex items-center">
                      {newUserRole === 'TECHNICIAN' ? 'Lintas Seluruh Site (Mobile)' : 'Pusat (Seluruh SPBU)'}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nomor Telepon / WhatsApp</label>
                <input
                  type="text"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  placeholder="+670 7700 0000"
                  className="w-full min-h-[44px] px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewUserModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg font-bold shadow-xs"
                >
                  Simpan User ke Turso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};

