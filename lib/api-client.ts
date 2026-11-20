import { PMReport, SPBUTicket, MaintenancePlan, UserSession, Site, GDriveArchiveInfo } from './types';
import { fitReportForUpload } from './image-compress';

export const SESSION_EXPIRED_EVENT = 'pm:session-expired';

/** fetch wrapper: sends the session cookie and broadcasts when the server session is gone. */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, { credentials: 'same-origin', ...init });
  if (res.status === 401 && typeof window !== 'undefined' && !input.startsWith('/api/auth/login')) {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }
  return res;
}

/**
 * Reads a JSON response safely. When the server (or the hosting platform) answers
 * with HTML / plain text — e.g. "Request Entity Too Large" — return a clear
 * { success: false } instead of throwing Safari's "The string did not match the
 * expected pattern".
 */
export async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (res.status === 413 || /too large|payload/i.test(text)) {
      return {
        success: false,
        code: 'TOO_LARGE',
        message: 'Ukuran Berita Acara (foto) terlalu besar untuk dikirim. Kurangi jumlah foto lalu coba lagi.',
      };
    }
    if (res.status === 504 || res.status === 408) {
      return { success: false, code: 'TIMEOUT', message: 'Server terlalu lama merespons. Periksa koneksi lalu coba lagi.' };
    }
    return {
      success: false,
      code: `HTTP_${res.status}`,
      message: `Server mengembalikan respons tidak terduga (kode ${res.status}). Coba lagi beberapa saat lagi.`,
    };
  }
}

export async function logoutApi(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  } catch {}
}

export async function checkSessionApi(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' });
    return res.ok;
  } catch {
    return true; // offline: don't force logout
  }
}

export async function fetchUsersApi(): Promise<any[] | null> {
  try {
    const res = await apiFetch('/api/users');
    const data = await readJson(res);
    if (data.success && Array.isArray(data.users)) return data.users;
  } catch {}
  return null;
}

export async function setUserDivisionApi(id: string, division: 'IT' | 'TEKNIK'): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await apiFetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, division }) });
    return await readJson(res);
  } catch (err: any) {
    return { success: false, message: 'Gagal terhubung ke server: ' + err.message };
  }
}

export async function createUserApi(payload: any): Promise<{ success: boolean; message?: string; id?: string }> {
  try {
    const res = await apiFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await readJson(res);
  } catch (err: any) {
    return { success: false, message: 'Gagal terhubung ke server: ' + err.message };
  }
}

export async function loginApi(username: string, password: string): Promise<{ success: boolean; user?: UserSession; rbac?: any; message?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return await readJson(res);
  } catch (err: any) {
    return { success: false, message: 'Gagal terhubung ke server login: ' + err.message };
  }
}

/** Returns null when the server can't be reached (never mistake an error for "no data"). */
export async function fetchReportsApi(siteId?: number | 'ALL'): Promise<PMReport[] | null> {
  try {
    const url = siteId && siteId !== 'ALL' ? `/api/reports?site_id=${siteId}` : '/api/reports';
    const res = await apiFetch(url);
    const data = await readJson(res);
    if (data.success && Array.isArray(data.reports)) {
      return data.reports;
    }
  } catch (err) {
    console.warn('Gagal memuat laporan dari server Turso, menggunakan cache offline:', err);
  }
  return null;
}

/** Full Berita Acara (with photos & signatures) by id. */
export async function fetchReportByIdApi(id: string): Promise<{ success: boolean; report?: PMReport; message?: string; code?: string }> {
  try {
    const res = await apiFetch(`/api/reports?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
    return await readJson(res);
  } catch (err: any) {
    return { success: false, message: 'Gagal terhubung ke server: ' + err.message };
  }
}

/** Pengawas validates (approves) a final Berita Acara of their SPBU. */
export async function approveReportApi(
  id: string
): Promise<{ success: boolean; approval?: PMReport['approval']; driveUpdated?: boolean; message?: string; code?: string }> {
  try {
    const res = await apiFetch('/api/reports/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    return await readJson(res);
  } catch (err: any) {
    return { success: false, message: 'Gagal terhubung ke server: ' + err.message };
  }
}

export async function saveReportApi(report: PMReport): Promise<{ success: boolean; report?: PMReport; message?: string }> {
  try {
    // Photos make up most of a BA: shrink them until the request fits the hosting limit
    const fitted = await fitReportForUpload(report);
    if (!fitted.fits) {
      return {
        success: false,
        message: `Ukuran Berita Acara ${(fitted.bytes / 1024 / 1024).toFixed(1)} MB masih terlalu besar meski foto sudah dikecilkan. Hapus beberapa foto lalu coba lagi.`,
      };
    }
    const res = await apiFetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fitted.report),
    });
    return await readJson(res);
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Downloads the official BA PDF (generated on the server).
 * Uses the stored copy when the report is synced, otherwise sends the draft.
 */
export async function downloadBaPdfApi(
  report: PMReport,
  opts: { draft?: boolean } = {}
): Promise<{ success: boolean; fileName?: string; message?: string; code?: string }> {
  try {
    const res = opts.draft
      ? await apiFetch('/api/reports/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify((await fitReportForUpload(report)).report),
        })
      : await apiFetch(`/api/reports/pdf?id=${encodeURIComponent(report.id)}`);
    if (!res.ok) {
      const data = await readJson(res).catch(() => ({}));
      return { success: false, code: data.code, message: data.message || `Server mengembalikan status ${res.status}` };
    }
    const blob = await res.blob();
    const disp = res.headers.get('Content-Disposition') || '';
    const fileName = /filename="([^"]+)"/.exec(disp)?.[1] || `BA_${report.site_code}_${report.execution_date}.pdf`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { success: true, fileName };
  } catch (err: any) {
    return { success: false, message: 'Gagal terhubung ke server: ' + err.message };
  }
}

export async function driveStatusApi(): Promise<boolean | null> {
  try {
    const res = await apiFetch('/api/reports/drive', { cache: 'no-store' });
    const data = await readJson(res);
    return data.success ? !!data.configured : null;
  } catch {
    return null;
  }
}

/** Uploads the stored BA PDF + documentation photos to Google Drive. */
export async function uploadBaToDriveApi(
  reportId: string
): Promise<{ success: boolean; gdrive?: GDriveArchiveInfo; message?: string; code?: string }> {
  try {
    const res = await apiFetch('/api/reports/drive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reportId }),
    });
    return await readJson(res);
  } catch (err: any) {
    return { success: false, message: 'Gagal terhubung ke server: ' + err.message };
  }
}

export async function cleanDummyDataApi(): Promise<{ success: boolean; message?: string; retained?: any }> {
  try {
    const res = await apiFetch('/api/admin/clean-dummy-data', { method: 'POST' });
    return await readJson(res);
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function deleteReportApi(reportId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await apiFetch(`/api/reports?id=${encodeURIComponent(reportId)}`, {
      method: 'DELETE',
    });
    return await readJson(res);
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function fetchTicketsApi(filters?: { site_id?: number | 'ALL'; status?: string; search?: string }): Promise<SPBUTicket[] | null> {
  try {
    const params = new URLSearchParams();
    if (filters?.site_id && filters.site_id !== 'ALL') params.set('site_id', String(filters.site_id));
    if (filters?.status && filters.status !== 'ALL') params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);

    const res = await apiFetch(`/api/tickets?${params.toString()}`);
    const data = await readJson(res);
    if (data.success && Array.isArray(data.tickets)) {
      return data.tickets;
    }
  } catch (err) {
    console.warn('Gagal memuat tiket dari Turso, menggunakan cache offline:', err);
  }
  return null;
}

export async function createTicketApi(ticket: Partial<SPBUTicket>): Promise<{ success: boolean; ticket?: SPBUTicket; message?: string }> {
  try {
    const res = await apiFetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticket),
    });
    return await readJson(res);
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function updateTicketApi(id: string, status?: string, resolution_notes?: string, assigned_to?: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await apiFetch('/api/tickets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, resolution_notes, assigned_to }),
    });
    return await readJson(res);
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function deleteTicketApi(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await apiFetch(`/api/tickets?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return await readJson(res);
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function fetchPlansApi(filters?: { site_id?: number | 'ALL'; status?: string }): Promise<MaintenancePlan[] | null> {
  try {
    const params = new URLSearchParams();
    if (filters?.site_id && filters.site_id !== 'ALL') params.set('site_id', String(filters.site_id));
    if (filters?.status && filters.status !== 'ALL') params.set('status', filters.status);

    const res = await apiFetch(`/api/plans?${params.toString()}`);
    const data = await readJson(res);
    if (data.success && Array.isArray(data.plans)) {
      return data.plans;
    }
  } catch (err) {
    console.warn('Gagal memuat jadwal dari Turso, menggunakan cache offline:', err);
  }
  return null;
}

export async function createPlanApi(plan: Partial<MaintenancePlan>): Promise<{ success: boolean; plan?: MaintenancePlan; message?: string }> {
  try {
    const res = await apiFetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    });
    return await readJson(res);
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function updatePlanApi(id: string, status?: string, notes?: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await apiFetch('/api/plans', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, notes }),
    });
    return await readJson(res);
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function deletePlanApi(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await apiFetch(`/api/plans?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return await readJson(res);
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function fetchSitesApi(): Promise<Site[]> {
  try {
    const res = await apiFetch('/api/sites');
    const data = await readJson(res);
    if (data.success && Array.isArray(data.sites)) {
      return data.sites;
    }
  } catch (err) {
    console.warn('Gagal memuat sites dari server Turso:', err);
  }
  return [];
}

export async function createSiteApi(site: Partial<Site>): Promise<{ success: boolean; site?: Site; message?: string }> {
  try {
    const res = await apiFetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(site),
    });
    return await readJson(res);
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function updateSiteApi(site: Site): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await apiFetch('/api/sites', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(site),
    });
    return await readJson(res);
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function deleteSiteApi(id: number): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await apiFetch(`/api/sites?id=${id}`, {
      method: 'DELETE',
    });
    return await readJson(res);
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/** Save the pump / nozzle / tank / brand setup of one SPBU */
export async function updateSiteForecourtApi(
  siteId: number,
  forecourt: Site['forecourt']
): Promise<{ success: boolean; message?: string; code?: string; forecourt?: Site['forecourt'] }> {
  try {
    const res = await apiFetch('/api/sites', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: siteId, forecourt }),
    });
    return await readJson(res);
  } catch (err: any) {
    return { success: false, message: 'Gagal terhubung ke server: ' + err.message };
  }
}

export interface AppNotification {
  id: string;
  created_at: string;
  type: string;
  title: string;
  message: string;
  link_module?: 'tickets' | 'schedule' | 'reports' | 'preview' | 'overview';
  link_id?: string;
  read: boolean;
}

export async function fetchNotificationsApi(): Promise<{ notifications: AppNotification[]; unread: number } | null> {
  try {
    const res = await apiFetch('/api/notifications', { cache: 'no-store' });
    const data = await readJson(res);
    if (data.success) return { notifications: data.notifications, unread: data.unread };
  } catch {}
  return null;
}

export async function markNotificationsReadApi(payload: { ids?: string[]; all?: boolean }): Promise<boolean> {
  try {
    const res = await apiFetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return (await readJson(res)).success === true;
  } catch {
    return false;
  }
}

export interface AuditItem {
  id: string;
  at: string;
  user_id: string | null;
  user_name: string | null;
  user_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  site_id: number | null;
  summary: string;
  details: any;
  ip: string | null;
  user_agent: string | null;
}

export async function fetchAuditApi(params: Record<string, string | number | undefined>): Promise<{ items: AuditItem[]; total: number } | null> {
  try {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && q.set(k, String(v)));
    const res = await apiFetch(`/api/audit?${q.toString()}`, { cache: 'no-store' });
    const data = await readJson(res);
    if (data.success) return { items: data.items, total: data.total };
  } catch {}
  return null;
}

export async function fetchDailyChecksApi(date?: string): Promise<{ date: string; checks: import('./daily-checklist').DailyCheck[] } | null> {
  try {
    const res = await apiFetch(`/api/daily-checks${date ? `?date=${date}` : ''}`, { cache: 'no-store' });
    const data = await readJson(res);
    if (data.success) return { date: data.date, checks: data.checks };
  } catch {}
  return null;
}

export async function submitDailyCheckApi(payload: {
  items: { key: string; ok: boolean; note?: string }[];
  create_tickets: string[];
}): Promise<{ success: boolean; message?: string; code?: string; check?: import('./daily-checklist').DailyCheck; ticket_numbers?: string[] }> {
  try {
    const res = await apiFetch('/api/daily-checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await readJson(res);
  } catch (err: any) {
    return { success: false, message: 'Gagal terhubung ke server: ' + err.message };
  }
}

export async function fetchMasterConfigApi(): Promise<{
  success: boolean;
  products: any[];
  atgBrands: any[];
  dispenserBrands: any[];
  hardwareConfigs: any[];
  settings: any;
}> {
  try {
    const res = await apiFetch('/api/config');
    const data = await readJson(res);
    if (data.success) {
      return data;
    }
  } catch (err) {
    console.warn('Gagal memuat master config dari Turso:', err);
  }
  return {
    success: false,
    products: [],
    atgBrands: [],
    dispenserBrands: [],
    hardwareConfigs: [],
    settings: null,
  };
}

export async function saveMasterConfigApi(section: 'settings' | 'product' | 'atg' | 'dispenser' | 'hardware', payload: { item?: any; settings?: any }): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await apiFetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section, ...payload }),
    });
    return await readJson(res);
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function deleteMasterConfigItemApi(section: 'product' | 'atg' | 'dispenser' | 'hardware', id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await apiFetch(`/api/config?section=${section}&id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return await readJson(res);
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}



