'use client';

import React, { useState, useEffect } from 'react';
import { AppSidebar, AppModule } from '@/components/navigation/AppSidebar';
import { MobileTopBar } from '@/components/navigation/MobileTopBar';
import { TopContextBar } from '@/components/navigation/TopContextBar';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import { SectionTabs, TabKey } from '@/components/SectionTabs';
import { BottomBar } from '@/components/BottomBar';
import { LoginPage } from '@/components/auth/LoginPage';

// Modular Single Views
import { OverviewModule } from '@/components/modules/OverviewModule';
import { TicketsModule } from '@/components/modules/TicketsModule';
import { ScheduleModule } from '@/components/modules/ScheduleModule';
import { ReportsModule } from '@/components/modules/ReportsModule';
import { UsersModule } from '@/components/modules/UsersModule';
import { MasterConfigSection } from '@/components/admin/MasterConfigSection';
import { InitiationLanding } from '@/components/sections/InitiationLanding';
import { OfficialPdfPreview } from '@/components/sections/OfficialPdfPreview';

// Technical Form Step Sections
import { GeneralInfoSection } from '@/components/sections/GeneralInfoSection';
import { SoftwareSection } from '@/components/sections/SoftwareSection';
import { HardwareSection } from '@/components/sections/HardwareSection';
import { ForecourtSection } from '@/components/sections/ForecourtSection';
import { EdcSection } from '@/components/sections/EdcSection';
import { PeripheralsSection } from '@/components/sections/PeripheralsSection';
import { NetworkPowerSection } from '@/components/sections/NetworkPowerSection';
import { PinsystChecklistSection } from '@/components/sections/PinsystChecklistSection';
import { FindingsActionPlanSection } from '@/components/sections/FindingsActionPlanSection';
import { SignOffSection } from '@/components/sections/SignOffSection';
import { QuickCheckSection } from '@/components/sections/QuickCheckSection';
import { CorrectiveRepairSection } from '@/components/sections/CorrectiveRepairSection';

import { PMReport, Site, UserSession, SPBUTicket, MaintenancePlan, WorkType } from '@/lib/types';
import { SAMPLE_SITES } from '@/lib/sample-data';
import { 
  getCurrentReport, 
  saveCurrentReport, 
  submitReport, 
  setSelectedSiteId, 
  getCurrentUser, 
  setCurrentUser,
  logoutUser,
  getAllTickets,
  getAllPlans,
  getAllReports,
  getAllSites,
  saveAllSites,
  saveAllTickets,
  saveAllPlans,
  saveAllReports
} from '@/lib/storage';
import { 
  saveReportApi, 
  fetchTicketsApi, 
  fetchPlansApi, 
  fetchReportsApi,
  fetchSitesApi,
  fetchUsersApi,
  logoutApi,
  checkSessionApi,
  SESSION_EXPIRED_EVENT,
} from '@/lib/api-client';
import { useFeedback } from '@/components/feedback/FeedbackProvider';
import { can, siteScope } from '@/lib/rbac';
import { CheckCircle2, ChevronLeft, Building2, UserCheck, ShieldAlert } from 'lucide-react';

// Module access per role. Only technicians can open the PM form / activity landing.
const ROLE_ALLOWED_MODULES: Record<UserSession['role'], AppModule[]> = {
  ADMIN: ['overview', 'tickets', 'schedule', 'reports', 'config', 'users', 'preview'],
  SUPERVISOR: ['overview', 'tickets', 'schedule', 'reports', 'preview'],
  TECHNICIAN: ['overview', 'tickets', 'schedule', 'reports', 'landing', 'preview', 'form'],
};

const MODULE_NAMES: Partial<Record<AppModule, string>> = {
  form: 'Formulir Pemeriksaan PM',
  landing: 'Pemilihan Kegiatan Lapangan',
  config: 'Konfigurasi & Master Data',
  users: 'Manajemen Pengguna',
};

export default function Home() {
  const [currentUser, setUser] = useState<UserSession | null>(null);
  const [isClientLoaded, setIsClientLoaded] = useState(false);
  const [currentModule, setCurrentModule] = useState<AppModule>('overview');
  const [report, setReport] = useState<PMReport>(() => getCurrentReport());
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const feedback = useFeedback();
  const [lastSavedText, setLastSavedText] = useState('Tersimpan di perangkat');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Global Data Repositories (synced with Turso Database)
  const [sites, setSites] = useState<Site[]>(() => getAllSites());
  const [tickets, setTickets] = useState<SPBUTicket[]>(() => getAllTickets());
  const [plans, setPlans] = useState<MaintenancePlan[]>(() => getAllPlans());
  const [reports, setReports] = useState<PMReport[]>(() => getAllReports());
  const [usersList, setUsersList] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    const user = getCurrentUser();
    if (user) {
      setUser(user);
    }
    setIsClientLoaded(true);

    // 1. Initial URL-based route resolution (e.g. /dashboard, /setting, /tickets)
    const rawPath = window.location.pathname.replace(/^\//, '').toLowerCase();
    if (rawPath === 'dashboard' || rawPath === 'overview') {
      setCurrentModule('overview');
    } else if (rawPath === 'tickets') {
      setCurrentModule('tickets');
    } else if (rawPath === 'schedule') {
      setCurrentModule('schedule');
    } else if (rawPath === 'reports') {
      setCurrentModule('reports');
    } else if (rawPath === 'setting' || rawPath === 'settings' || rawPath === 'config') {
      setCurrentModule('config');
    } else if (rawPath === 'users') {
      setCurrentModule('users');
    } else if (rawPath === 'form') {
      setCurrentModule('form');
    } else if (rawPath === 'preview') {
      setCurrentModule('preview');
    } else if (rawPath === 'landing') {
      setCurrentModule('landing');
    }

    // 2. Listen for browser back / forward buttons
    const handlePopState = () => {
      const p = window.location.pathname.replace(/^\//, '').toLowerCase();
      if (p === 'dashboard' || p === 'overview') setCurrentModule('overview');
      else if (p === 'tickets') setCurrentModule('tickets');
      else if (p === 'schedule') setCurrentModule('schedule');
      else if (p === 'reports') setCurrentModule('reports');
      else if (p === 'setting' || p === 'settings' || p === 'config') setCurrentModule('config');
      else if (p === 'users') setCurrentModule('users');
      else if (p === 'form') setCurrentModule('form');
      else if (p === 'preview') setCurrentModule('preview');
      else if (p === 'landing') setCurrentModule('landing');
    };
    window.addEventListener('popstate', handlePopState);

    // 3. Initial sync with Turso Database
    const syncCloudData = async () => {
      try {
        const [cloudTickets, cloudPlans, cloudReports, cloudSites] = await Promise.all([
          fetchTicketsApi(),
          fetchPlansApi(),
          fetchReportsApi(),
          fetchSitesApi(),
        ]);
        if (isMounted) {
          if (Array.isArray(cloudTickets)) {
            setTickets(cloudTickets);
            saveAllTickets(cloudTickets);
          }
          if (Array.isArray(cloudPlans)) {
            setPlans(cloudPlans);
            saveAllPlans(cloudPlans);
          }
          if (Array.isArray(cloudReports)) {
            setReports(cloudReports);
            saveAllReports(cloudReports);
          }
          if (cloudSites && cloudSites.length > 0) {
            setSites(cloudSites);
            saveAllSites(cloudSites);
          }
        }

        // Fetch users for RBAC
        try {
          const users = await fetchUsersApi();
          if (isMounted && users) {
            setUsersList(users);
          }
        } catch {}
      } catch (err) {
        console.warn('Sync warning:', err);
      }
    };
    syncCloudData();

    return () => { 
      isMounted = false; 
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Force logout when the server session is missing/expired (e.g. old login before
  // session cookies existed, or 12h shift timeout)
  const expiredHandledRef = React.useRef(false);
  useEffect(() => {
    const onExpired = async () => {
      if (expiredHandledRef.current || !getCurrentUser()) return;
      expiredHandledRef.current = true;
      logoutUser();
      setUser(null);
      await feedback.notify({
        variant: 'warning',
        title: 'Sesi Login Berakhir',
        message: 'Demi keamanan, silakan login kembali untuk melanjutkan.',
        okLabel: 'Login Ulang',
      });
      expiredHandledRef.current = false;
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [feedback]);

  useEffect(() => {
    if (!currentUser) return;
    checkSessionApi().then((ok) => {
      if (!ok) window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    });
  }, [currentUser]);

  // Block modules the role may not open (also covers direct URLs like /form)
  useEffect(() => {
    if (!currentUser) return;
    const allowed = ROLE_ALLOWED_MODULES[currentUser.role] || [];
    if (!allowed.includes(currentModule)) {
      const name = MODULE_NAMES[currentModule] || currentModule;
      setCurrentModule('overview');
      window.history.replaceState(null, '', '/dashboard');
      feedback.notify({
        variant: 'forbidden',
        title: 'Akses Ditolak',
        message: `Modul "${name}" tidak tersedia untuk peran Anda.`,
      });
    }
  }, [currentUser, currentModule, feedback]);

  // Scroll back to top whenever the form step or module changes (important on mobile
  // where the "Lanjut" button sits at the bottom of a long page)
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTab, currentModule]);

  // Auto-save on report change
  const storageErrorShownRef = React.useRef(false);
  const handleReportChange = (updated: PMReport) => {
    setReport(updated);
    try {
      saveCurrentReport(updated);
      storageErrorShownRef.current = false;
      const now = new Date();
      setLastSavedText(`Tersimpan otomatis ${now.toTimeString().substring(0, 5)}`);
    } catch (err: any) {
      setLastSavedText('Gagal simpan otomatis');
      if (!storageErrorShownRef.current) {
        storageErrorShownRef.current = true;
        feedback.notify({
          variant: 'error',
          title: 'Penyimpanan Perangkat Penuh',
          message: 'Perubahan terakhir belum tersimpan otomatis. Kurangi jumlah/ukuran foto lalu simpan draft kembali.',
          detail: err?.message,
        });
      }
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const requirePM = (): boolean => {
    if (currentUser && can(currentUser.role, 'pm.perform')) return true;
    feedback.notify({
      variant: 'forbidden',
      title: 'Akses Ditolak',
      message: 'Pelaksanaan PM, pengecekan, dan perbaikan hanya dapat dilakukan oleh akun Teknisi Lapangan.',
    });
    return false;
  };

  const handleManualSave = () => {
    if (!requirePM()) return;
    try {
      saveCurrentReport(report);
      const now = new Date();
      setLastSavedText(`Draft tersimpan ${now.toTimeString().substring(0, 5)}`);
      feedback.notify({
        variant: 'success',
        title: 'Draft Tersimpan',
        message: `Draft pemeriksaan ${report.site_name} (${report.terminal_id}) tersimpan di perangkat ini pukul ${now.toTimeString().substring(0, 5)}.`,
      });
    } catch (err: any) {
      feedback.notify({
        variant: 'error',
        title: 'Gagal Menyimpan Draft',
        message: 'Penyimpanan perangkat penuh atau tidak tersedia. Hapus beberapa foto lalu coba lagi.',
        detail: err?.message,
      });
    }
  };

  const handleSubmitFinal = async () => {
    if (!requirePM()) return;
    const updated = submitReport(report);
    setReport(updated);
    setReports(prev => [updated, ...prev.filter(r => r.id !== updated.id)]);
    await feedback.run(() => saveReportApi(updated), {
      pending: 'Mengirim Berita Acara ke server...',
      success: {
        title: 'Berita Acara Tersimpan',
        message: <>Laporan <strong>#{updated.id}</strong> untuk {updated.site_name} berhasil disinkronkan ke database.</>,
      },
      error: {
        title: 'Gagal Sinkron ke Server',
        message: 'Laporan sudah tersimpan di perangkat ini. Buka halaman Berita Acara lalu tekan "Sinkron" lagi saat koneksi tersedia.',
      },
    });
  };

  const handleSelectSite = (site: Site) => {
    setSelectedSiteId(site.id);
    const updated: PMReport = {
      ...report,
      site_id: site.id,
      site_code: site.site_code,
      site_name: site.site_name,
      supervisor_name: site.contact_person.split(' (')[0],
    };
    handleReportChange(updated);
    showToast(`Lokasi aktif SPBU dialihkan ke: ${site.site_name}`);
  };

  const handleLoginSuccess = (user: UserSession, selectedSite: Site) => {
    setUser(user);
    setCurrentUser(user);

    let updated = { ...report };
    if (user.role === 'TECHNICIAN') {
      updated.technician_name = `${user.name} (${user.employeeId})`;
      updated.technician_phone = user.phone;
    } else if (user.role === 'SUPERVISOR') {
      updated.supervisor_name = user.name;
    }

    if (selectedSite.id !== report.site_id) {
      updated.site_id = selectedSite.id;
      updated.site_code = selectedSite.site_code;
      updated.site_name = selectedSite.site_name;
    }

    handleReportChange(updated);
    showToast(`Berhasil masuk sebagai ${user.name} [${user.role}]`);
    setCurrentModule('overview');
    window.history.pushState(null, '', '/dashboard');
  };

  const handleLogout = async () => {
    const ok = await feedback.confirm({
      title: 'Keluar dari Akun?',
      message: 'Draft yang belum disinkronkan tetap tersimpan di perangkat ini.',
      confirmLabel: 'Keluar',
    });
    if (!ok) return;
    await logoutApi();
    logoutUser();
    setUser(null);
    window.history.pushState(null, '', '/');
  };

  const handleSelectPastReport = (pastReport: PMReport) => {
    setReport(pastReport);
    setCurrentModule('preview');
    window.history.pushState(null, '', '/preview');
    showToast(`Membuka Berita Acara #${pastReport.id}`);
  };

  const handleStartExecutionFromPlan = (site: Site, workType: WorkType, terminalId: string) => {
    if (!requirePM()) return;
    setSelectedSiteId(site.id);
    const updated: PMReport = {
      ...report,
      site_id: site.id,
      site_code: site.site_code,
      site_name: site.site_name,
      terminal_id: terminalId || report.terminal_id,
      work_type: workType,
      supervisor_name: site.contact_person.split(' (')[0],
    };
    handleReportChange(updated);
    if (workType === 'QUICK_CHECK') {
      setActiveTab('quick_check');
    } else if (workType === 'CORRECTIVE_REPAIR') {
      setActiveTab('corrective_repair');
    } else {
      setActiveTab('software');
    }
    setCurrentModule('form');
    window.history.pushState(null, '', '/form');
    showToast(`Memulai ${workTypeLabels[workType]} untuk ${site.site_name}`);
  };

  const handleStartRepairFromTicket = (ticket: SPBUTicket) => {
    if (!requirePM()) return;
    setSelectedSiteId(ticket.site_id);
    const targetSite = sites.find(s => s.id === ticket.site_id) || sites[0] || SAMPLE_SITES[0];
    
    let repairCat: any = 'Lainnya';
    if (ticket.category === 'POS Terminal & Software') repairCat = 'Hardware POS';
    else if (ticket.category === 'Printer Struk & Periferal') repairCat = 'Printer / Scanner';
    else if (ticket.category === 'Dispenser & Forecourt') repairCat = 'Dispenser & Forecourt';
    else if (ticket.category === 'ATG & Tangki Pendam') repairCat = 'ATG & Tangki';
    else if (ticket.category === 'EDC & Jaringan') repairCat = 'EDC & Jaringan';

    const updated: PMReport = {
      ...report,
      site_id: ticket.site_id,
      site_code: ticket.site_code,
      site_name: ticket.site_name,
      terminal_id: ticket.terminal_id,
      work_type: 'CORRECTIVE_REPAIR',
      supervisor_name: targetSite ? targetSite.contact_person.split(' (')[0] : report.supervisor_name,
      repair_details: {
        category: repairCat,
        reported_problem: `[${ticket.ticket_number}] ${ticket.title}: ${ticket.description}`,
        root_cause: '',
        action_taken: '',
        sparepart_replaced: '',
        post_repair_status: 'B',
        notes: `Pelapor tiket: ${ticket.reported_by} (${ticket.reported_at})`,
      },
    };
    handleReportChange(updated);
    setActiveTab('corrective_repair');
    setCurrentModule('form');
    window.history.pushState(null, '', '/form');
    showToast(`Membuka form perbaikan untuk tiket ${ticket.ticket_number}`);
  };

  const handleProceedFromLanding = () => {
    if (!requirePM()) return;
    if (report.work_type === 'QUICK_CHECK') {
      setActiveTab('quick_check');
    } else if (report.work_type === 'CORRECTIVE_REPAIR') {
      setActiveTab('corrective_repair');
    } else {
      setActiveTab('software');
    }
    setCurrentModule('form');
    window.history.pushState(null, '', '/form');
  };

  const handleSelectModule = (mod: AppModule) => {
    if (!currentUser) return;
    const allowed = ROLE_ALLOWED_MODULES[currentUser.role] || [];
    if (!allowed.includes(mod)) {
      feedback.notify({
        variant: 'forbidden',
        title: 'Akses Ditolak',
        message: `Modul "${MODULE_NAMES[mod] || mod}" tidak tersedia untuk peran Anda.`,
      });
      return;
    }
    setCurrentModule(mod);
    const slug = mod === 'overview' ? 'dashboard' : mod === 'config' ? 'setting' : mod;
    window.history.pushState(null, '', `/${slug}`);
  };

  // ---- Data scoping: Supervisor only ever sees their own SPBU ----
  const scope = siteScope(currentUser);
  const visibleSites = scope === null ? sites : sites.filter((s) => s.id === scope);
  const visibleTickets = scope === null ? tickets : tickets.filter((t) => t.site_id === scope);
  const visiblePlans = scope === null ? plans : plans.filter((p) => p.site_id === scope);
  const visibleReports = scope === null ? reports : reports.filter((r) => r.site_id === scope);

  const currentSite: Site =
    (scope !== null ? visibleSites[0] : undefined) ||
    sites.find((s) => s.id === report.site_id) ||
    sites[0] ||
    SAMPLE_SITES[0];
  const assignedSite = sites.find((s) => s.id === currentUser?.assignedSiteId);

  const workTypeLabels = {
    PREVENTIVE_MAINTENANCE: 'Preventive Maintenance (PM)',
    QUICK_CHECK: 'Pengecekan Aja',
    CORRECTIVE_REPAIR: 'Perbaikan (Repair)',
  };

  if (!isClientLoaded) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-white rounded-xl p-2 shadow-lg mb-3 flex items-center justify-center animate-pulse">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-pertamina-timor.png"
            alt="Pertamina International Timor"
            className="max-w-full max-h-full object-contain"
          />
        </div>
        <p className="text-white text-xs font-semibold tracking-wider">
          Memuat Portal Pertamina International Timor, S.A...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* 1. Desktop Left Sidebar Navigation */}
      <AppSidebar
        currentUser={currentUser}
        currentSite={currentSite}
        currentModule={currentModule}
        onSelectModule={handleSelectModule}
        onLogout={handleLogout}
      />

      {/* 2. Mobile Top Bar */}
      <MobileTopBar
        currentUser={currentUser}
        currentSite={assignedSite}
        onSelectModule={handleSelectModule}
        onLogout={handleLogout}
      />

      {/* 3. Main Workspace Container (offset by sidebar on desktop, padded bottom for mobile nav) */}
      <div className="flex-1 min-w-0 flex flex-col lg:pl-64 xl:pl-72 pb-28 lg:pb-8">
        
        {/* Desktop Top Context Bar */}
        <TopContextBar
          currentSite={assignedSite}
          currentModule={currentModule}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* ========================================================= */}
        {/* PURE SINGLE MODULE VIEW ROUTER (NO NESTED DUPLICATE TABS) */}
        {/* ========================================================= */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1">

          {scope !== null && ['overview', 'tickets', 'schedule', 'reports'].includes(currentModule) && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs text-blue-950">
              <Building2 className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
              <span>
                Mode Pengawas: data yang ditampilkan hanya untuk{' '}
                <strong>{assignedSite ? `${assignedSite.site_code} · ${assignedSite.site_name}` : `SPBU #${currentUser.assignedSiteId}`}</strong>.
                Anda dapat melihat data dan membuat tiket kendala untuk SPBU ini.
              </span>
            </div>
          )}
          
          {/* MODUL 1: IKHTISAR & STATUS SPBU */}
          {currentModule === 'overview' && (
            <OverviewModule
              currentUser={currentUser}
              currentSite={currentSite}
              sites={visibleSites}
              tickets={visibleTickets}
              plans={visiblePlans}
              reports={visibleReports}
              onStartExecution={handleStartExecutionFromPlan}
              onOpenCreateTicket={() => handleSelectModule('tickets')}
              onOpenCreatePlan={() => handleSelectModule('schedule')}
              onOpenReportPdf={handleSelectPastReport}
              onNavigateToModule={handleSelectModule}
            />
          )}

          {/* MODUL 2: PUSAT TIKET GANGGUAN & KENDALA */}
          {currentModule === 'tickets' && (
            <TicketsModule
              currentUser={currentUser}
              tickets={visibleTickets}
              sites={visibleSites}
              usersList={usersList}
              onTicketsUpdated={(updated) => setTickets(updated)}
              onStartRepairFromTicket={handleStartRepairFromTicket}
            />
          )}

          {/* MODUL 3: PERENCANAAN & JADWAL PM */}
          {currentModule === 'schedule' && (
            <ScheduleModule
              currentUser={currentUser}
              plans={visiblePlans}
              sites={visibleSites}
              usersList={usersList}
              onPlansUpdated={(updated) => setPlans(updated)}
              onStartExecutionFromPlan={handleStartExecutionFromPlan}
            />
          )}

          {/* MODUL 4: ARSIP BERITA ACARA RESMI */}
          {currentModule === 'reports' && (
            <ReportsModule
              currentUser={currentUser}
              reports={visibleReports}
              sites={visibleSites}
              onReportsUpdated={(updated) => setReports(updated)}
              onOpenReportPdf={handleSelectPastReport}
            />
          )}

          {/* ACCESS RESTRICTION FALLBACK (RBAC 403) */}
          {(currentModule === 'config' || currentModule === 'users') && currentUser.role !== 'ADMIN' && (
            <div className="bg-white rounded-xl border border-red-200 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xs my-8">
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-[#0B2545]">Akses Modul Dibatasi (RBAC 403)</h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                Modul ini hanya dapat diakses dan dikonfigurasi oleh <strong>Administrator IT & Forecourt Central</strong>. Akun Anda saat ini terdaftar dengan peran <strong>{currentUser.role} ({currentUser.name})</strong>.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentModule('overview')}
                  className="min-h-[44px] px-5 py-2 bg-[#0B2545] hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                >
                  Kembali ke Ikhtisar SPBU
                </button>
              </div>
            </div>
          )}

          {/* MODUL 5: KONFIGURASI & MASTER DATA SPBU (ADMIN ONLY) */}
          {currentModule === 'config' && currentUser.role === 'ADMIN' && (
            <div className="space-y-6">
              <div className="pb-1">
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  Pengaturan data site SPBU, katalog produk BBM Timor Leste (USD), brand ATG, dispenser forecourt, dan ambang batas kelistrikan/grounding.
                </p>
              </div>

              <MasterConfigSection />
            </div>
          )}

          {/* MODUL 6: MANAJEMEN USER & RBAC (ADMIN ONLY) */}
          {currentModule === 'users' && currentUser.role === 'ADMIN' && (
            <UsersModule
              currentUser={currentUser}
              usersList={usersList}
              sites={sites}
              onUsersUpdated={(updated) => setUsersList(updated)}
            />
          )}

          {/* MODUL 7: HALAMAN PEMILIHAN KEGIATAN BARU */}
          {currentModule === 'landing' && (
            <InitiationLanding
              report={report}
              sites={sites}
              onChange={handleReportChange}
              onProceedToForm={handleProceedFromLanding}
              currentUser={currentUser}
              onOpenAdminPortal={() => setCurrentModule('overview')}
              onOpenTicketModal={() => setCurrentModule('tickets')}
            />
          )}

          {/* MODUL 8: PRATINJAU RESMI PDF BERITA ACARA */}
          {currentModule === 'preview' && (
            <OfficialPdfPreview
              report={report}
              canSync={can(currentUser.role, 'pm.perform')}
              onBackToForm={can(currentUser.role, 'pm.perform') ? () => setCurrentModule('form') : undefined}
              onBackToList={() => {
                setCurrentModule('reports');
                window.history.pushState(null, '', '/reports');
              }}
              onSyncToServer={handleSubmitFinal}
            />
          )}

          {/* MODUL 9: FORMULIR CHECKLIST INSPEKSI PM */}
          {currentModule === 'form' && (
            <div className="space-y-5">
              
              {/* Form Context & Breadcrumb Bar */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-2xs px-4 sm:px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  
                  <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setCurrentModule('overview')}
                      className="min-h-[44px] flex-shrink-0 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-600" />
                      <span className="hidden sm:inline">Kembali ke Ikhtisar</span>
                      <span className="sm:hidden">Kembali</span>
                    </button>

                    <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-800 min-w-0">
                      <span className="font-bold text-red-600 uppercase text-[10px] tracking-wider hidden sm:inline">
                        Modul:
                      </span>
                      <span className="font-bold text-slate-900 truncate">
                        {workTypeLabels[report.work_type]}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700">
                      <Building2 className="w-3.5 h-3.5 text-blue-700 flex-shrink-0" />
                      <span className="font-bold text-slate-900 truncate max-w-[200px]">
                        {report.site_name}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-blue-900 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                        {report.terminal_id}
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hidden sm:inline-flex">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                      <span className="text-slate-500">PWS:</span>
                      <span className="font-bold text-slate-900">{report.supervisor_name}</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Stepper Tabs based on Work Type */}
              <SectionTabs
                activeTab={activeTab}
                onSelectTab={setActiveTab}
                report={report}
              />

              {/* Form Step Workspace */}
              <div className="mt-4">
                {activeTab === 'info' && (
                  <GeneralInfoSection report={report} onChange={handleReportChange} sites={sites} />
                )}
                {activeTab === 'quick_check' && (
                  <QuickCheckSection report={report} onChange={handleReportChange} />
                )}
                {activeTab === 'corrective_repair' && (
                  <CorrectiveRepairSection report={report} onChange={handleReportChange} />
                )}
                {activeTab === 'software' && (
                  <SoftwareSection report={report} onChange={handleReportChange} />
                )}
                {activeTab === 'hardware' && (
                  <HardwareSection report={report} onChange={handleReportChange} />
                )}
                {activeTab === 'forecourt' && (
                  <ForecourtSection report={report} onChange={handleReportChange} />
                )}
                {activeTab === 'edc' && (
                  <EdcSection report={report} onChange={handleReportChange} />
                )}
                {activeTab === 'peripherals' && (
                  <PeripheralsSection report={report} onChange={handleReportChange} />
                )}
                {activeTab === 'network' && (
                  <NetworkPowerSection report={report} onChange={handleReportChange} />
                )}
                {activeTab === 'features' && (
                  <PinsystChecklistSection report={report} onChange={handleReportChange} />
                )}
                {activeTab === 'action' && (
                  <FindingsActionPlanSection report={report} onChange={handleReportChange} />
                )}
                {activeTab === 'signoff' && (
                  <SignOffSection report={report} onChange={handleReportChange} />
                )}
              </div>

              {/* Sticky Bottom Actions Bar */}
              <BottomBar
                activeTab={activeTab}
                onSelectTab={setActiveTab}
                report={report}
                onSaveDraft={handleManualSave}
                onSubmitReport={handleSubmitFinal}
                onViewPdf={() => setCurrentModule('preview')}
                onBackToLanding={() => setCurrentModule('overview')}
              />
            </div>
          )}

        </main>
      </div>

      {/* 4. Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentUser={currentUser}
        currentModule={currentModule}
        onSelectModule={handleSelectModule}
        onLogout={handleLogout}
      />


      {/* Feedback Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 left-4 right-4 sm:left-auto z-50 bg-[#0B2545] text-white text-xs font-semibold px-4 py-3 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2 max-w-sm transition-all animate-in fade-in-50"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
