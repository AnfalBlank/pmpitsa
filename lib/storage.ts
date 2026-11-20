import { EMPTY_CLEANING } from './cleaning';
import { 
  PMReport, 
  Site, 
  UserSession, 
  SPBUTicket, 
  MaintenancePlan, 
  TicketStatus,
  FuelProduct,
  AtgBrandConfig,
  DispenserBrandConfig,
  HardwareMasterConfig,
  SystemThresholdSettings
} from './types';
import { 
  SAMPLE_SITES, 
  createDefaultPMReport, 
  HISTORICAL_REPORTS, 
  DEFAULT_USERS, 
  SAMPLE_TICKETS, 
  SAMPLE_MAINTENANCE_PLANS,
  DEFAULT_FUEL_PRODUCTS,
  DEFAULT_ATG_BRANDS,
  DEFAULT_DISPENSER_BRANDS,
  DEFAULT_HARDWARE_CONFIGS,
  DEFAULT_SYSTEM_SETTINGS,
  INITIAL_PINSYST_FEATURES
} from './sample-data';

const STORAGE_KEY_CURRENT = 'pertamina_pm_current_draft_v1';
const STORAGE_KEY_REPORTS = 'pertamina_pm_all_reports_v1';
const STORAGE_KEY_SELECTED_SITE = 'pertamina_pm_selected_site_id';
const STORAGE_KEY_USER = 'pertamina_pm_current_user_v1';
const STORAGE_KEY_TICKETS = 'pertamina_pm_tickets_v1';
const STORAGE_KEY_PLANS = 'pertamina_pm_plans_v1';
const STORAGE_KEY_SITES = 'pertamina_pm_sites_v1';
const STORAGE_KEY_PRODUCTS = 'pertamina_pm_products_v1';
const STORAGE_KEY_ATG = 'pertamina_pm_atg_v1';
const STORAGE_KEY_DISPENSERS = 'pertamina_pm_dispensers_v1';
const STORAGE_KEY_HARDWARE = 'pertamina_pm_hardware_v1';
const STORAGE_KEY_SETTINGS = 'pertamina_pm_settings_v1';

export function getCurrentUser(): UserSession | null {
  if (typeof window === 'undefined') return null;
  // Always check active session in sessionStorage first for clean portal gate
  const sessionSaved = sessionStorage.getItem(STORAGE_KEY_USER);
  if (sessionSaved) {
    try {
      const parsed = JSON.parse(sessionSaved);
      if (parsed && parsed.id) return parsed;
    } catch {
      // fallback
    }
  }
  return null;
}

export function setCurrentUser(user: UserSession): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
}

export function logoutUser(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY_USER);
  localStorage.removeItem(STORAGE_KEY_USER);
}

export function getSelectedSiteId(): number {
  if (typeof window === 'undefined') return 1;
  const saved = localStorage.getItem(STORAGE_KEY_SELECTED_SITE);
  return saved ? parseInt(saved, 10) : 1;
}

export function setSelectedSiteId(id: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_SELECTED_SITE, id.toString());
}

/**
 * Turns a default report into a blank DRAFT for a new job: new lifecycle,
 * no signatures/photos and no sample text. Checklist defaults ('B') stay.
 */
export function blankDraft(r: PMReport): PMReport {
  return {
    ...r,
    status: 'DRAFT',
    synced_to_server: false,
    findings_summary: '',
    action_plan: '',
    repair_details: {
      category: 'Hardware POS',
      reported_problem: '',
      root_cause: '',
      action_taken: '',
      sparepart_replaced: '',
      parts_replaced: [],
      post_repair_status: 'B',
      notes: '',
      affected_unit: '',
      affected_serial: '',
      work_start: '',
      work_end: '',
      test_notes: '',
    },
    quick_check_details: {
      pos_system_online: 'B',
      dispenser_communication: 'B',
      edc_transaction_ready: 'B',
      atg_tank_monitor: 'B',
      printer_thermal_status: 'B',
      general_notes: '',
    },
    attachments: [],
    cleaning: { ...EMPTY_CLEANING },
    technician_signature: undefined,
    technician_signed_at: undefined,
    supervisor_signature: undefined,
    supervisor_signed_at: undefined,
    finalized_at: undefined,
    finalized_by: undefined,
    revision: undefined,
    revision_log: undefined,
    gdrive: undefined,
    gdrive_pdf_id: undefined,
    ticket_id: undefined,
    ticket_number: undefined,
  };
}

/**
 * Drafts saved before a form change get the current PINSYST feature titles
 * (status/findings stay) and the cleaning checklist. Finalised BA are untouched.
 */
export function upgradeDraft(r: PMReport): PMReport {
  if (!r || (r.status && r.status !== 'DRAFT') || (!r.status && r.synced_to_server)) return r;
  const byId = new Map(INITIAL_PINSYST_FEATURES.map((f) => [f.id, f]));
  return {
    ...r,
    features_checklist: (r.features_checklist || []).map((f) => {
      const cur = byId.get(f.id);
      return cur ? { ...f, code: cur.code, title: cur.title, description: cur.description } : f;
    }),
    cleaning: { ...EMPTY_CLEANING, ...(r.cleaning || {}) },
  };
}

export function getCurrentReport(): PMReport {
  if (typeof window === 'undefined') {
    return createDefaultPMReport(SAMPLE_SITES[0], DEFAULT_USERS[0]);
  }

  const raw = localStorage.getItem(STORAGE_KEY_CURRENT);
  if (raw) {
    try {
      return upgradeDraft(JSON.parse(raw));
    } catch {
      // fallback
    }
  }

  const siteId = getSelectedSiteId();
  const site = SAMPLE_SITES.find(s => s.id === siteId) || SAMPLE_SITES[0];
  const user = getCurrentUser() || DEFAULT_USERS[0];
  // A brand-new device starts with an editable, blank draft
  const initial = blankDraft(createDefaultPMReport(site, user));
  localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(initial));
  return initial;
}

export function saveCurrentReport(report: PMReport): void {
  if (typeof window === 'undefined') return;
  report.updated_at = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(report));
}

export function getAllReports(): PMReport[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY_REPORTS);
  if (raw !== null) {
    try {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    } catch {
      // fallback
    }
  }
  return [];
}

export function saveAllReports(reports: PMReport[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
}

/** Insert/replace a report in the local list and as the open report (no status change). */
export function upsertLocalReport(report: PMReport): PMReport {
  if (typeof window === 'undefined') return report;
  const all = getAllReports();
  const idx = all.findIndex(r => r.id === report.id);
  const list = idx >= 0 ? all.map(r => (r.id === report.id ? report : r)) : [report, ...all];
  localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(list));
  const curRaw = localStorage.getItem(STORAGE_KEY_CURRENT);
  try {
    if (!curRaw || JSON.parse(curRaw).id === report.id) localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(report));
  } catch {
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(report));
  }
  return report;
}

/** Finalise on the device: the BA is locked (PENDING_SYNC) until the server confirms it. */
export function submitReport(report: PMReport): PMReport {
  if (typeof window === 'undefined') return report;
  const updated: PMReport = {
    ...report,
    updated_at: new Date().toISOString(),
    status: report.status === 'FINAL' ? 'FINAL' : 'PENDING_SYNC',
  };
  localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(updated));
  return upsertLocalReport(updated);
}

export function getAllTickets(): SPBUTicket[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY_TICKETS);
  if (raw !== null) {
    try {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    } catch {
      // fallback
    }
  }
  return [];
}

export function saveAllTickets(tickets: SPBUTicket[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
}

export function saveTicket(ticket: SPBUTicket): SPBUTicket {
  if (typeof window === 'undefined') return ticket;
  const all = getAllTickets();
  const existingIdx = all.findIndex(t => t.id === ticket.id);
  let updatedList: SPBUTicket[];
  if (existingIdx >= 0) {
    updatedList = [...all];
    updatedList[existingIdx] = ticket;
  } else {
    updatedList = [ticket, ...all];
  }
  localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(updatedList));
  return ticket;
}

export function updateTicketStatus(
  ticketId: string, 
  status: TicketStatus, 
  resolutionNotes?: string,
  assignedTo?: string
): void {
  if (typeof window === 'undefined') return;
  const all = getAllTickets();
  const updatedList = all.map(t => {
    if (t.id === ticketId) {
      return {
        ...t,
        status,
        ...(resolutionNotes ? { resolution_notes: resolutionNotes, resolved_at: new Date().toISOString().replace('T', ' ').substring(0, 16) } : {}),
        ...(assignedTo ? { assigned_to: assignedTo } : {}),
      };
    }
    return t;
  });
  localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(updatedList));
}

export function getAllPlans(): MaintenancePlan[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY_PLANS);
  if (raw !== null) {
    try {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    } catch {
      // fallback
    }
  }
  return [];
}

export function saveAllPlans(plans: MaintenancePlan[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify(plans));
}

export function savePlan(plan: MaintenancePlan): MaintenancePlan {
  if (typeof window === 'undefined') return plan;
  const all = getAllPlans();
  const existingIdx = all.findIndex(p => p.id === plan.id);
  let updatedList: MaintenancePlan[];
  if (existingIdx >= 0) {
    updatedList = [...all];
    updatedList[existingIdx] = plan;
  } else {
    updatedList = [plan, ...all];
  }
  localStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify(updatedList));
  return plan;
}

export function updatePlanStatus(planId: string, status: MaintenancePlan['status']): void {
  if (typeof window === 'undefined') return;
  const all = getAllPlans();
  const updatedList = all.map(p => {
    if (p.id === planId) {
      return { ...p, status };
    }
    return p;
  });
  localStorage.setItem(STORAGE_KEY_PLANS, JSON.stringify(updatedList));
}

export function clearAppSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY_USER);
  localStorage.removeItem(STORAGE_KEY_CURRENT);
  localStorage.removeItem(STORAGE_KEY_REPORTS);
  localStorage.removeItem(STORAGE_KEY_SELECTED_SITE);
  localStorage.removeItem(STORAGE_KEY_USER);
  localStorage.removeItem(STORAGE_KEY_TICKETS);
  localStorage.removeItem(STORAGE_KEY_PLANS);
}

// ----------------------------------------------------
// Master Sites CRUD
// ----------------------------------------------------
export function getAllSites(): Site[] {
  if (typeof window === 'undefined') return SAMPLE_SITES;
  const raw = localStorage.getItem(STORAGE_KEY_SITES);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  return SAMPLE_SITES;
}

export function saveAllSites(sites: Site[]): void {
  if (typeof window === 'undefined' || !Array.isArray(sites)) return;
  localStorage.setItem(STORAGE_KEY_SITES, JSON.stringify(sites));
}

export function saveSite(site: Site): Site {
  if (typeof window === 'undefined') return site;
  const all = getAllSites();
  const existingIdx = all.findIndex(s => s.id === site.id);
  let updatedList: Site[];
  if (existingIdx >= 0) {
    updatedList = [...all];
    updatedList[existingIdx] = site;
  } else {
    updatedList = [...all, site];
  }
  localStorage.setItem(STORAGE_KEY_SITES, JSON.stringify(updatedList));
  return site;
}

export function deleteSite(siteId: number): void {
  if (typeof window === 'undefined') return;
  const all = getAllSites();
  const updatedList = all.filter(s => s.id !== siteId);
  localStorage.setItem(STORAGE_KEY_SITES, JSON.stringify(updatedList));
}

// ----------------------------------------------------
// Master Fuel Products CRUD
// ----------------------------------------------------
export function getAllProducts(): FuelProduct[] {
  if (typeof window === 'undefined') return DEFAULT_FUEL_PRODUCTS;
  const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  return DEFAULT_FUEL_PRODUCTS;
}

export function saveProduct(product: FuelProduct): FuelProduct {
  if (typeof window === 'undefined') return product;
  const all = getAllProducts();
  const existingIdx = all.findIndex(p => p.id === product.id);
  let updatedList: FuelProduct[];
  if (existingIdx >= 0) {
    updatedList = [...all];
    updatedList[existingIdx] = product;
  } else {
    updatedList = [...all, product];
  }
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(updatedList));
  return product;
}

export function deleteProduct(productId: string): void {
  if (typeof window === 'undefined') return;
  const all = getAllProducts();
  const updatedList = all.filter(p => p.id !== productId);
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(updatedList));
}

// ----------------------------------------------------
// Master ATG Brands CRUD
// ----------------------------------------------------
export function getAllAtgBrands(): AtgBrandConfig[] {
  if (typeof window === 'undefined') return DEFAULT_ATG_BRANDS;
  const raw = localStorage.getItem(STORAGE_KEY_ATG);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  return DEFAULT_ATG_BRANDS;
}

export function saveAtgBrand(atg: AtgBrandConfig): AtgBrandConfig {
  if (typeof window === 'undefined') return atg;
  const all = getAllAtgBrands();
  const existingIdx = all.findIndex(a => a.id === atg.id);
  let updatedList: AtgBrandConfig[];
  if (existingIdx >= 0) {
    updatedList = [...all];
    updatedList[existingIdx] = atg;
  } else {
    updatedList = [...all, atg];
  }
  localStorage.setItem(STORAGE_KEY_ATG, JSON.stringify(updatedList));
  return atg;
}

export function deleteAtgBrand(atgId: string): void {
  if (typeof window === 'undefined') return;
  const all = getAllAtgBrands();
  const updatedList = all.filter(a => a.id !== atgId);
  localStorage.setItem(STORAGE_KEY_ATG, JSON.stringify(updatedList));
}

// ----------------------------------------------------
// Master Dispenser Brands CRUD
// ----------------------------------------------------
export function getAllDispenserBrands(): DispenserBrandConfig[] {
  if (typeof window === 'undefined') return DEFAULT_DISPENSER_BRANDS;
  const raw = localStorage.getItem(STORAGE_KEY_DISPENSERS);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  return DEFAULT_DISPENSER_BRANDS;
}

export function saveDispenserBrand(dsp: DispenserBrandConfig): DispenserBrandConfig {
  if (typeof window === 'undefined') return dsp;
  const all = getAllDispenserBrands();
  const existingIdx = all.findIndex(d => d.id === dsp.id);
  let updatedList: DispenserBrandConfig[];
  if (existingIdx >= 0) {
    updatedList = [...all];
    updatedList[existingIdx] = dsp;
  } else {
    updatedList = [...all, dsp];
  }
  localStorage.setItem(STORAGE_KEY_DISPENSERS, JSON.stringify(updatedList));
  return dsp;
}

export function deleteDispenserBrand(dspId: string): void {
  if (typeof window === 'undefined') return;
  const all = getAllDispenserBrands();
  const updatedList = all.filter(d => d.id !== dspId);
  localStorage.setItem(STORAGE_KEY_DISPENSERS, JSON.stringify(updatedList));
}

// ----------------------------------------------------
// Master Hardware Configs CRUD
// ----------------------------------------------------
export function getAllHardwareConfigs(): HardwareMasterConfig[] {
  if (typeof window === 'undefined') return DEFAULT_HARDWARE_CONFIGS;
  const raw = localStorage.getItem(STORAGE_KEY_HARDWARE);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  return DEFAULT_HARDWARE_CONFIGS;
}

export function saveHardwareConfig(hw: HardwareMasterConfig): HardwareMasterConfig {
  if (typeof window === 'undefined') return hw;
  const all = getAllHardwareConfigs();
  const existingIdx = all.findIndex(h => h.id === hw.id);
  let updatedList: HardwareMasterConfig[];
  if (existingIdx >= 0) {
    updatedList = [...all];
    updatedList[existingIdx] = hw;
  } else {
    updatedList = [...all, hw];
  }
  localStorage.setItem(STORAGE_KEY_HARDWARE, JSON.stringify(updatedList));
  return hw;
}

export function deleteHardwareConfig(hwId: string): void {
  if (typeof window === 'undefined') return;
  const all = getAllHardwareConfigs();
  const updatedList = all.filter(h => h.id !== hwId);
  localStorage.setItem(STORAGE_KEY_HARDWARE, JSON.stringify(updatedList));
}

// ----------------------------------------------------
// Master System Settings
// ----------------------------------------------------
export function getSystemSettings(): SystemThresholdSettings {
  if (typeof window === 'undefined') return DEFAULT_SYSTEM_SETTINGS;
  const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.company_name) return parsed;
    } catch {}
  }
  return DEFAULT_SYSTEM_SETTINGS;
}

export function saveSystemSettings(settings: SystemThresholdSettings): SystemThresholdSettings {
  if (typeof window === 'undefined') return settings;
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  return settings;
}
