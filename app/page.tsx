'use client';

import React, { useState, useEffect } from 'react';
import { AppSidebar, AppModule } from '@/components/navigation/AppSidebar';
import { MobileTopBar } from '@/components/navigation/MobileTopBar';
import { TopContextBar } from '@/components/navigation/TopContextBar';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import { SectionTabs, TabKey, tabOrderFor, firstStepFor } from '@/components/SectionTabs';
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
import { SAMPLE_SITES, createDefaultPMReport, newReportId } from '@/lib/sample-data';
import { awaitingApproval, isFinal, isLocked, missingForFinalize, reportStatus } from '@/lib/report-status';
import { baNumber } from '@/lib/work-type';
import { 
  getCurrentReport, 
  saveCurrentReport, 
  submitReport, 
  upsertLocalReport,
  blankDraft,
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
  uploadBaToDriveApi,
  downloadBaPdfApi,
  fetchPlansApi, 
  fetchReportsApi,
  fetchReportByIdApi,
  approveReportApi,
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
  // ADMIN may open the form only to revise a finalised BA (see adminEditing)
  ADMIN: ['overview', 'tickets', 'schedule', 'reports', 'config', 'users', 'preview', 'form'],
  SUPERVISOR: ['overview', 'tickets', 'schedule', 'reports', 'preview'],
  TECHNICIAN: ['overview', 'tickets', 'schedule', 'reports', 'landing', 'preview', 'form'],
};

const USERS_CACHE_KEY = 'pertamina_pm_users_v1';

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
  /** Admin is revising a finalised BA in the form */
  const [adminEditing, setAdminEditing] = useState(false);
  const feedback = useFeedback();
  const [lastSavedText, setLastSavedText] = useState('Tersimpan di perangkat');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Global Data Repositories (synced with Turso Database)
  const [sites, setSites] = useState<Site[]>(() => getAllSites());
  const [tickets, setTickets] = useState<SPBUTicket[]>(() => getAllTickets());
  const [plans, setPlans] = useState<MaintenancePlan[]>(() => getAllPlans());
  const [reports, setReports] = useState<PMReport[]>(() => getAllReports());
  const [usersList, setUsersListState] = useState<any[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(USERS_CACHE_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const setUsersList = (list: any[]) => {
    setUsersListState(list);
    try {
      localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(list));
    } catch {}
  };

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

    return () => { 
      isMounted = false; 
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // ---- Server sync -------------------------------------------------------
  // Runs after login / session restore, when the app comes back to the
  // foreground, when the connection returns, and every minute. A failed
  // request never replaces the lists (no more "only 1 BA" after an error).
  const syncingRef = React.useRef(false);
  const refreshFromServer = React.useCallback(async () => {
    if (syncingRef.current || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    syncingRef.current = true;
    try {
      // Users load in parallel (they used to wait for every other request)
      fetchUsersApi()
        .then((users) => users && setUsersList(users))
        .catch(() => {});
      const [cloudTickets, cloudPlans, cloudReports, cloudSites] = await Promise.all([
        fetchTicketsApi(),
        fetchPlansApi(),
        fetchReportsApi(),
        fetchSitesApi(),
      ]);
      if (cloudTickets) {
        setTickets(cloudTickets);
        saveAllTickets(cloudTickets);
      }
      if (cloudPlans) {
        setPlans(cloudPlans);
        saveAllPlans(cloudPlans);
      }
      if (cloudReports) {
        setReports((prev) => {
          const byId = new Map(prev.map((r) => [r.id, r]));
          // Keep BAs that exist only on this device (drafts / finalised but not yet sent)
          const localOnly = prev.filter((r) => reportStatus(r) !== 'FINAL' && !cloudReports.some((c) => c.id === r.id));
          const merged = [
            ...localOnly,
            ...cloudReports.map((c) => {
              // Keep an already-loaded full copy when nothing changed on the server
              const local = byId.get(c.id);
              return local && !local._summary && local.updated_at === c.updated_at && !!local.approval === !!c.approval ? local : c;
            }),
          ];
          saveAllReports(merged);
          return merged;
        });
        // Keep the open BA in step with the server (e.g. a new approval)
        setReport((prev) => {
          const c = cloudReports.find((x) => x.id === prev.id);
          if (!c || prev._summary || !isFinal(prev)) return prev;
          if (c.updated_at === prev.updated_at && !!c.approval === !!prev.approval) return prev;
          return { ...prev, approval: c.approval, revision: c.revision, gdrive: c.gdrive, updated_at: c.updated_at };
        });
      }
      if (cloudSites && cloudSites.length > 0) {
        setSites(cloudSites);
        saveAllSites(cloudSites);
      }
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    refreshFromServer();
    const onVisible = () => document.visibilityState === 'visible' && refreshFromServer();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', refreshFromServer);
    const timer = setInterval(() => document.visibilityState === 'visible' && refreshFromServer(), 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', refreshFromServer);
      clearInterval(timer);
    };
  }, [currentUser?.id, refreshFromServer]);

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
      return;
    }
    if (currentModule === 'form') {
      if (can(currentUser.role, 'report.edit') && !can(currentUser.role, 'pm.perform') && !adminEditing) {
        setCurrentModule('reports');
        window.history.replaceState(null, '', '/reports');
        feedback.notify({
          variant: 'info',
          title: 'Pilih Berita Acara',
          message: 'Admin membuka formulir melalui tombol "Ubah Berita Acara" pada Berita Acara yang sudah final.',
        });
      } else if (can(currentUser.role, 'pm.perform') && isLocked(report)) {
        setCurrentModule('preview');
        window.history.replaceState(null, '', '/preview');
        feedback.notify({
          variant: 'info',
          title: 'Berita Acara Terkunci',
          message: 'Berita Acara ini sudah difinalisasi sehingga tidak dapat diubah lagi. Perubahan hanya dapat dilakukan oleh Admin.',
        });
      }
    }
  }, [currentUser, currentModule, feedback, adminEditing, report]);

  // Opening the activity landing with a finalised BA (e.g. direct URL / reload) starts a new BA
  useEffect(() => {
    if (!currentUser || currentModule !== 'landing' || !can(currentUser.role, 'pm.perform') || !isLocked(report)) return;
    const site = sites.find((s) => s.id === report.site_id) || sites[0] || SAMPLE_SITES[0];
    handleReportChange(freshReportFor(site, report.work_type));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, currentModule, report]);

  // A step from another work type must never stay open (e.g. after switching PM -> CM)
  useEffect(() => {
    if (!tabOrderFor(report.work_type).includes(activeTab)) setActiveTab(firstStepFor(report.work_type));
  }, [report.work_type, activeTab]);

  // Scroll back to top whenever the form step or module changes (important on mobile
  // where the "Lanjut" button sits at the bottom of a long page)
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTab, currentModule]);

  // Auto-save on report change
  const storageErrorShownRef = React.useRef(false);
  const lockedNoticeRef = React.useRef(0);
  const handleReportChange = (updated: PMReport) => {
    if (isLocked(updated) && !adminEditing) {
      // Finalised BA: technicians/supervisors can't change it any more
      if (Date.now() - lockedNoticeRef.current > 4000) {
        lockedNoticeRef.current = Date.now();
        feedback.notify({
          variant: 'forbidden',
          title: 'Berita Acara Terkunci',
          message: 'Berita Acara yang sudah difinalisasi hanya dapat diubah oleh Admin.',
        });
      }
      return;
    }
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

  const applyDriveInfo = (id: string, gdrive: PMReport['gdrive']) => {
    if (!gdrive) return;
    const patch = (r: PMReport) => (r.id === id ? { ...r, gdrive, gdrive_pdf_id: gdrive.pdf_file_id } : r);
    setReport((prev) => {
      const next = patch(prev);
      if (next !== prev) upsertLocalReport(next);
      return next;
    });
    setReports((prev) => {
      const next = prev.map(patch);
      saveAllReports(next);
      return next;
    });
  };

  const driveLink = (gdrive: NonNullable<PMReport['gdrive']>) => (
    <a href={gdrive.folder_url} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline break-words">
      {gdrive.folder_path}
    </a>
  );

  /** Server confirmed the BA: store the FINAL copy everywhere */
  const markFinal = (final: PMReport) => {
    upsertLocalReport(final);
    setReport((prev) => (prev.id === final.id ? final : prev));
    setReports((prev) => {
      const next = [final, ...prev.filter((r) => r.id !== final.id)];
      saveAllReports(next);
      return next;
    });
  };

  /** Server rejected the content (incomplete / id clash): unlock so the technician can fix it */
  const reopenDraft = (r: PMReport, newId = false) => {
    const draft: PMReport = { ...r, status: 'DRAFT', ...(newId ? { id: newReportId() } : {}) };
    setReports((prev) => {
      const next = prev.filter((x) => x.id !== r.id);
      saveAllReports(next);
      return next;
    });
    setReport(draft);
    saveCurrentReport(draft);
  };

  const sendFinalToServer = async (pending: PMReport) => {
    const result: any = await feedback.run(
      async () => {
        const saved: any = await saveReportApi(pending);
        if (!saved.success) return saved;
        markFinal(saved.report);
        const drive = saved.alreadyFinal && saved.report?.gdrive ? { success: true, gdrive: saved.report.gdrive } : await uploadBaToDriveApi(pending.id);
        return { success: true, drive, final: saved.report };
      },
      {
        pending: 'Menyimpan Berita Acara final & mengarsipkan ke Google Drive...',
        success: (r: any) =>
          r.drive?.success
            ? {
                title: 'Berita Acara Final Tersimpan',
                message: (
                  <>
                    Berita Acara <strong>#{baNumber(pending)}</strong> sudah final dan terkunci, tersimpan di server, serta PDF &amp; foto dokumentasinya tersimpan di
                    Google Drive: {driveLink(r.drive.gdrive)}
                  </>
                ),
              }
            : {
                title: 'Berita Acara Final Tersimpan',
                message: (
                  <>
                    Berita Acara <strong>#{baNumber(pending)}</strong> sudah final dan tersimpan di server, tetapi belum masuk Google Drive
                    {r.drive?.code === 'DRIVE_NOT_CONFIGURED' ? ' (Google Drive belum diaktifkan oleh Admin).' : '.'} Tekan &quot;Arsipkan ke Google
                    Drive&quot; di halaman pratinjau untuk mencoba lagi.
                    {r.drive?.message && <span className="block mt-1 text-[11px] font-mono text-slate-500 break-words">{r.drive.message}</span>}
                  </>
                ),
              },
        error: {
          title: 'Belum Terkirim ke Server',
          message:
            'Berita Acara sudah final dan tersimpan aman di perangkat ini. Aplikasi akan mengirimkannya otomatis saat koneksi tersedia, atau tekan "Kirim Ulang" di halaman pratinjau.',
        },
      }
    );
    if (!result.success && (result.code === 'INCOMPLETE' || result.code === 'ID_CONFLICT')) {
      reopenDraft(pending, result.code === 'ID_CONFLICT');
    } else if (result.success && result.drive?.success && result.drive.gdrive) {
      applyDriveInfo(pending.id, result.drive.gdrive);
    }
  };

  const handleSubmitFinal = async () => {
    if (!requirePM()) return;
    if (isLocked(report)) {
      if (reportStatus(report) === 'PENDING_SYNC') await sendFinalToServer(report);
      return;
    }
    const missing = missingForFinalize(report);
    if (missing.length) {
      feedback.notify({
        variant: 'warning',
        title: 'Berita Acara Belum Lengkap',
        message: (
          <>
            Lengkapi dulu sebelum finalisasi:
            <ul className="mt-1 text-left list-disc pl-5">{missing.map((m) => <li key={m}>{m}</li>)}</ul>
          </>
        ),
      });
      return;
    }
    const pending = submitReport(report); // locked + stored on the device first
    setReport(pending);
    setReports((prev) => [pending, ...prev.filter((r) => r.id !== pending.id)]);
    await sendFinalToServer(pending);
  };

  // Auto-resend finalised BAs that didn't reach the server (offline in the field)
  const resendingRef = React.useRef(false);
  useEffect(() => {
    if (!currentUser || !can(currentUser.role, 'report.sync')) return;
    const resend = async () => {
      if (resendingRef.current || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
      const pending = getAllReports().filter((r) => reportStatus(r) === 'PENDING_SYNC');
      if (!pending.length) return;
      resendingRef.current = true;
      let sent = 0;
      for (const r of pending) {
        const saved: any = await saveReportApi(r);
        if (saved.success && saved.report) {
          markFinal(saved.report);
          sent++;
          const drive = await uploadBaToDriveApi(r.id);
          if (drive.success && drive.gdrive) applyDriveInfo(r.id, drive.gdrive);
        }
      }
      resendingRef.current = false;
      if (sent) showToast(`${sent} Berita Acara final berhasil dikirim ke server.`);
    };
    const t = setTimeout(resend, 3000);
    window.addEventListener('online', resend);
    return () => {
      clearTimeout(t);
      window.removeEventListener('online', resend);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  /** Admin: open a finalised BA in the form to revise it */
  const handleAdminEdit = async (target: PMReport) => {
    if (!currentUser || !can(currentUser.role, 'report.edit')) return;
    const ok = await feedback.confirm({
      title: 'Ubah Berita Acara Final?',
      message: 'Perubahan akan disimpan sebagai revisi baru, tercatat atas nama Anda, dan arsip PDF di Google Drive diperbarui.',
      confirmLabel: 'Ya, Ubah',
    });
    if (!ok) return;
    const full = await feedback.run(
      async () => {
        const f = await loadFullReport(target);
        return f ? { success: true as const, report: f } : { success: false as const, message: 'Dokumen lengkap belum dapat dimuat.' };
      },
      { pending: 'Memuat Berita Acara lengkap...', success: { title: 'Siap Diubah' }, error: { title: 'Gagal Memuat Berita Acara' } }
    );
    if (!full.success) return;
    setAdminEditing(true);
    setReport({ ...full.report });
    setActiveTab('info');
    setCurrentModule('form');
    window.history.pushState(null, '', '/form');
  };

  const leaveAdminEdit = (id: string) => {
    setAdminEditing(false);
    const original = reports.find((r) => r.id === id);
    if (original) setReport(original);
    setCurrentModule('preview');
    window.history.pushState(null, '', '/preview');
  };

  const handleAdminCancelEdit = async () => {
    const ok = await feedback.confirm({
      title: 'Batalkan Perubahan?',
      message: 'Perubahan yang belum disimpan akan dibuang. Berita Acara final tidak berubah.',
      confirmLabel: 'Buang Perubahan',
      danger: true,
    });
    if (ok) leaveAdminEdit(report.id);
  };

  const handleAdminSaveRevision = async () => {
    const missing = missingForFinalize(report);
    if (missing.length) {
      feedback.notify({ variant: 'warning', title: 'Berita Acara Belum Lengkap', message: `Lengkapi: ${missing.join(', ')}.` });
      return;
    }
    const result: any = await feedback.run(
      async () => {
        const saved: any = await saveReportApi(report);
        if (!saved.success) return saved;
        markFinal(saved.report);
        const drive = await uploadBaToDriveApi(report.id);
        return { success: true, final: saved.report, drive };
      },
      {
        pending: 'Menyimpan revisi Berita Acara...',
        success: (r: any) => ({
          title: `Revisi ${r.final?.revision ?? ''} Tersimpan`,
          message: r.drive?.success ? (
            <>Perubahan tersimpan di server dan arsip Google Drive diperbarui: {driveLink(r.drive.gdrive)}</>
          ) : (
            'Perubahan tersimpan di server. Arsip Google Drive belum diperbarui; gunakan tombol "Perbarui Arsip Drive" di pratinjau.'
          ),
        }),
        error: { title: 'Gagal Menyimpan Revisi', message: 'Perubahan belum tersimpan. Periksa koneksi lalu coba lagi.' },
      }
    );
    if (result.success) {
      if (result.drive?.success && result.drive.gdrive) applyDriveInfo(report.id, result.drive.gdrive);
      setAdminEditing(false);
      setCurrentModule('preview');
      window.history.pushState(null, '', '/preview');
    }
  };

  /** Re-upload (or first upload) of an already-synced BA to Google Drive */
  const handleUploadToDrive = async (target: PMReport) => {
    const result = await feedback.run(() => uploadBaToDriveApi(target.id), {
      pending: 'Mengunggah Berita Acara & foto ke Google Drive...',
      success: (r) => ({
        title: 'Tersimpan di Google Drive',
        message: <>PDF Berita Acara dan foto dokumentasi tersimpan di: {r.gdrive && driveLink(r.gdrive)}</>,
      }),
      error: { title: 'Gagal Mengunggah ke Google Drive', message: 'Periksa koneksi internet, atau hubungi Admin bila Google Drive belum dikonfigurasi.' },
    });
    if (result.success) applyDriveInfo(target.id, result.gdrive);
  };

  const handleDownloadPdf = async (target: PMReport) => {
    // Technicians get the PDF of exactly what is on screen (may be an unsynced draft)
    const draft = can(currentUser?.role, 'pm.perform') && !isFinal(target) && !target._summary;
    await feedback.run(() => downloadBaPdfApi(target, { draft }), {
      pending: 'Menyiapkan PDF Berita Acara...',
      success: (r) => ({
        title: 'PDF Berhasil Diunduh',
        message: <>File <strong className="break-all">{r.fileName}</strong> tersimpan di folder unduhan perangkat Anda.</>,
      }),
      error: { title: 'Gagal Membuat PDF', message: 'PDF Berita Acara tidak dapat dibuat. Coba lagi beberapa saat.' },
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

  const [loadingFullReport, setLoadingFullReport] = useState(false);

  /** List items are summaries: fetch the full BA (photos, signatures) from the server. */
  const loadFullReport = async (r: PMReport): Promise<PMReport | null> => {
    if (!r._summary) return r;
    const res = await fetchReportByIdApi(r.id);
    if (!res.success || !res.report) return null;
    const full = { ...res.report, synced_to_server: true };
    setReports((prev) => {
      const next = prev.map((x) => (x.id === full.id ? full : x));
      saveAllReports(next);
      return next;
    });
    return full;
  };

  const handleSelectPastReport = async (pastReport: PMReport) => {
    setReport(pastReport);
    setCurrentModule('preview');
    window.history.pushState(null, '', '/preview');
    if (!pastReport._summary) return;
    setLoadingFullReport(true);
    const full = await loadFullReport(pastReport);
    setLoadingFullReport(false);
    if (full) {
      setReport((prev) => (prev.id === full.id ? full : prev));
    } else {
      feedback.notify({
        variant: 'error',
        title: 'Gagal Memuat Berita Acara',
        message: 'Dokumen lengkap (foto & tanda tangan) belum dapat dimuat. Periksa koneksi lalu buka kembali.',
      });
    }
  };

  /** Pengawas validates the BA of their own SPBU */
  const handleApproveReport = async (target: PMReport) => {
    if (!currentUser || !can(currentUser.role, 'report.approve')) return;
    const ok = await feedback.confirm({
      title: 'Setujui Berita Acara?',
      message: (
        <>
          Anda menyatakan isi Berita Acara <strong>#{baNumber(target)}</strong> ({target.site_name}) sudah sesuai. Stempel
          &quot;DISETUJUI&quot; dengan nama Anda akan tampil pada lembar pengesahan.
        </>
      ),
      confirmLabel: 'Ya, Setujui',
    });
    if (!ok) return;
    const result = await feedback.run(() => approveReportApi(target.id), {
      pending: 'Menyimpan validasi Pengawas...',
      success: (r) => ({
        title: 'Berita Acara Disetujui',
        message: `Berita Acara #${baNumber(target)} sudah divalidasi${r.approval?.by ? ` oleh ${r.approval.by}` : ''}.`,
      }),
      error: { title: 'Gagal Menyimpan Validasi', message: 'Validasi belum tersimpan. Periksa koneksi lalu coba lagi.' },
    });
    if (result.success && result.approval) {
      const approval = result.approval;
      const patch = (r: PMReport) => (r.id === target.id ? { ...r, approval } : r);
      setReport((prev) => patch(prev));
      setReports((prev) => {
        const next = prev.map(patch);
        saveAllReports(next);
        return next;
      });
    }
  };

  /** A blank Berita Acara (new ID, no signatures/photos) for a new job. */
  const freshReportFor = (site: Site, workType: WorkType): PMReport =>
    blankDraft(createDefaultPMReport(site, currentUser || undefined, workType));

  /** Continue the open draft, or start a new BA when the current one was already submitted. */
  const draftBase = (site: Site, workType: WorkType): PMReport =>
    isLocked(report) ? freshReportFor(site, workType) : { ...report, ticket_id: undefined, ticket_number: undefined };

  const handleStartExecutionFromPlan = (site: Site, workType: WorkType, terminalId: string) => {
    if (!requirePM()) return;
    setSelectedSiteId(site.id);
    const updated: PMReport = {
      ...draftBase(site, workType),
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
      ...draftBase(targetSite, 'CORRECTIVE_REPAIR'),
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
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
    if (adminEditing && mod !== 'form') {
      leaveAdminEdit(report.id);
      if (mod === 'preview') return;
    }
    if ((mod === 'landing' || mod === 'form') && isLocked(report) && can(currentUser.role, 'pm.perform')) {
      const site = sites.find((s) => s.id === report.site_id) || sites[0] || SAMPLE_SITES[0];
      handleReportChange(freshReportFor(site, report.work_type));
      showToast('Berita Acara sebelumnya sudah terkirim — memulai Berita Acara baru.');
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
    QUICK_CHECK: 'Pengecekan (Quick Check)',
    CORRECTIVE_REPAIR: 'Corrective Maintenance (CM)',
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
              canSync={can(currentUser.role, 'pm.perform') && !isFinal(report)}
              onBackToForm={can(currentUser.role, 'pm.perform') && !isLocked(report) ? () => setCurrentModule('form') : undefined}
              onAdminEdit={can(currentUser.role, 'report.edit') && isFinal(report) ? () => handleAdminEdit(report) : undefined}
              onApprove={
                can(currentUser.role, 'report.approve') && awaitingApproval(report) && (scope === null || report.site_id === scope)
                  ? () => handleApproveReport(report)
                  : undefined
              }
              loadingFull={loadingFullReport || !!report._summary}
              onBackToList={() => {
                setCurrentModule('reports');
                window.history.pushState(null, '', '/reports');
              }}
              onSyncToServer={handleSubmitFinal}
              onDownloadPdf={() => handleDownloadPdf(report)}
              onUploadToDrive={
                isFinal(report) && (can(currentUser.role, 'report.sync') || can(currentUser.role, 'report.delete'))
                  ? () => handleUploadToDrive(report)
                  : undefined
              }
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

              {adminEditing && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-xs text-amber-900">
                  <strong>Mode revisi Admin.</strong> Anda mengubah Berita Acara final #{baNumber(report)}
                  {report.revision ? ` (revisi saat ini: ${report.revision})` : ''}. Tekan &quot;Simpan Revisi&quot; di bawah untuk menyimpan, atau &quot;Batal&quot;.
                </div>
              )}

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
                  <CorrectiveRepairSection step="diagnosis" report={report} onChange={handleReportChange} />
                )}
                {activeTab === 'cm_action' && (
                  <CorrectiveRepairSection step="action" report={report} onChange={handleReportChange} />
                )}
                {activeTab === 'cm_test' && (
                  <CorrectiveRepairSection step="test" report={report} onChange={handleReportChange} />
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
                onSubmitReport={adminEditing ? handleAdminSaveRevision : handleSubmitFinal}
                adminEdit={adminEditing}
                onCancelEdit={handleAdminCancelEdit}
                missing={missingForFinalize(report)}
                onViewPdf={() => {
                  setCurrentModule('preview');
                  window.history.pushState(null, '', '/preview');
                }}
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
