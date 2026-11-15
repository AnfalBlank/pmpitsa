import { PMReport, SPBUTicket, MaintenancePlan, UserSession, Site } from './types';

export async function loginApi(username: string, password: string): Promise<{ success: boolean; user?: UserSession; rbac?: any; message?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: 'Gagal terhubung ke server login: ' + err.message };
  }
}

export async function fetchReportsApi(siteId?: number | 'ALL'): Promise<PMReport[]> {
  try {
    const url = siteId && siteId !== 'ALL' ? `/api/reports?site_id=${siteId}` : '/api/reports';
    const res = await fetch(url);
    const data = await res.json();
    if (data.success && Array.isArray(data.reports)) {
      return data.reports;
    }
  } catch (err) {
    console.warn('Gagal memuat laporan dari server Turso, menggunakan cache offline:', err);
  }
  return [];
}

export async function saveReportApi(report: PMReport): Promise<{ success: boolean; report?: PMReport; message?: string }> {
  try {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function cleanDummyDataApi(): Promise<{ success: boolean; message?: string; retained?: any }> {
  try {
    const res = await fetch('/api/admin/clean-dummy-data', { method: 'POST' });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function deleteReportApi(reportId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/reports?id=${encodeURIComponent(reportId)}`, {
      method: 'DELETE',
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function fetchTicketsApi(filters?: { site_id?: number | 'ALL'; status?: string; search?: string }): Promise<SPBUTicket[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.site_id && filters.site_id !== 'ALL') params.set('site_id', String(filters.site_id));
    if (filters?.status && filters.status !== 'ALL') params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);

    const res = await fetch(`/api/tickets?${params.toString()}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.tickets)) {
      return data.tickets;
    }
  } catch (err) {
    console.warn('Gagal memuat tiket dari Turso, menggunakan cache offline:', err);
  }
  return [];
}

export async function createTicketApi(ticket: Partial<SPBUTicket>): Promise<{ success: boolean; ticket?: SPBUTicket; message?: string }> {
  try {
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticket),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function updateTicketApi(id: string, status?: string, resolution_notes?: string, assigned_to?: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch('/api/tickets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, resolution_notes, assigned_to }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function deleteTicketApi(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/tickets?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function fetchPlansApi(filters?: { site_id?: number | 'ALL'; status?: string }): Promise<MaintenancePlan[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.site_id && filters.site_id !== 'ALL') params.set('site_id', String(filters.site_id));
    if (filters?.status && filters.status !== 'ALL') params.set('status', filters.status);

    const res = await fetch(`/api/plans?${params.toString()}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.plans)) {
      return data.plans;
    }
  } catch (err) {
    console.warn('Gagal memuat jadwal dari Turso, menggunakan cache offline:', err);
  }
  return [];
}

export async function createPlanApi(plan: Partial<MaintenancePlan>): Promise<{ success: boolean; plan?: MaintenancePlan; message?: string }> {
  try {
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function updatePlanApi(id: string, status?: string, notes?: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch('/api/plans', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, notes }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function deletePlanApi(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/plans?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function fetchSitesApi(): Promise<Site[]> {
  try {
    const res = await fetch('/api/sites');
    const data = await res.json();
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
    const res = await fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(site),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function updateSiteApi(site: Site): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch('/api/sites', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(site),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function deleteSiteApi(id: number): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/sites?id=${id}`, {
      method: 'DELETE',
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
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
    const res = await fetch('/api/config');
    const data = await res.json();
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
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section, ...payload }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function deleteMasterConfigItemApi(section: 'product' | 'atg' | 'dispenser' | 'hardware', id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/config?section=${section}&id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}



