export type ChecklistStatus = 'B' | 'R' | 'X'; // B: Baik, R: Rusak, X: Tidak Ada
export type FeatureStatus = 'OK' | 'ISSUE' | 'NA';
export type PMOverallStatus = 'Selesai (Normal)' | 'Perlu Tindak Lanjut' | 'Kritis (Perbaikan Segera)';
export type UserRole = 'TECHNICIAN' | 'SUPERVISOR' | 'ADMIN';
export type WorkType = 'PREVENTIVE_MAINTENANCE' | 'QUICK_CHECK' | 'CORRECTIVE_REPAIR';

export type TicketPriority = 'Rendah' | 'Sedang' | 'Tinggi' | 'Darurat';
export type TicketStatus = 'Open (Menunggu)' | 'Sedang Ditangani' | 'Selesai (Resolved)';
export type TicketCategory = 
  | 'Dispenser & Forecourt' 
  | 'ATG & Tangki Pendam' 
  | 'POS Terminal & Software' 
  | 'Printer Struk & Periferal' 
  | 'EDC & Jaringan' 
  | 'Kelistrikan & Power' 
  | 'Lainnya';

export interface SPBUTicket {
  id: string;
  ticket_number: string; // Contoh: TIK-PITL-2026-0042
  site_id: number;
  site_code: string;
  site_name: string;
  terminal_id: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  title: string;
  description: string;
  reported_by: string; // Nama pelapor kasir / PWS
  reported_at: string;
  assigned_to?: string; // Teknisi yang ditugaskan
  resolved_at?: string;
  resolution_notes?: string;
}

export interface MaintenancePlan {
  id: string;
  site_id: number;
  site_code: string;
  site_name: string;
  terminal_id: string;
  plan_type: WorkType;
  scheduled_date: string;
  assigned_technician: string;
  supervisor_pws: string;
  status: 'Terjadwal' | 'Mendekati Waktu' | 'Overdue (Terlewat)' | 'Selesai';
  notes: string;
}

export interface UserSession {
  id: string;
  name: string;
  role: UserRole;
  roleTitle: string;
  employeeId: string;
  phone: string;
  assignedSiteId: number;
}

export interface Site {
  id: number;
  site_code: string;
  site_name: string;
  location: string;
  regional: string;
  contact_person: string;
}

export interface CorrectiveRepairDetails {
  category: 'Hardware POS' | 'Printer / Scanner' | 'Dispenser & Forecourt' | 'ATG & Tangki' | 'EDC & Jaringan' | 'Lainnya';
  reported_problem: string;
  root_cause: string;
  action_taken: string;
  sparepart_replaced: string;
  post_repair_status: ChecklistStatus;
  notes: string;
  /** Unit / komponen yang rusak, mis. "Printer Epson TM-T82 kasir 1" */
  affected_unit?: string;
  affected_serial?: string;
  /** Waktu mulai & selesai pengerjaan (HH:MM) */
  work_start?: string;
  work_end?: string;
  /** Uraian uji fungsi setelah perbaikan */
  test_notes?: string;
}

export interface QuickCheckDetails {
  pos_system_online: ChecklistStatus;
  dispenser_communication: ChecklistStatus;
  edc_transaction_ready: ChecklistStatus;
  atg_tank_monitor: ChecklistStatus;
  printer_thermal_status: ChecklistStatus;
  general_notes: string;
}

export interface SoftwareInventory {
  pos_pinsyst_version: string;
  printer_server_version: string;
  export_module_version: string;
  imex_module_version: string;
  operating_system: string;
  database_backup_status: ChecklistStatus;
  notes: string;
}

export interface HardwareSpecs {
  pc_brand_model: string;
  cpu: string;
  ram_gb: number;
  storage_type: 'SSD' | 'HDD';
  storage_capacity_gb: number;
  storage_free_gb: number;
  fan_cleanliness: ChecklistStatus;
  heatsink_condition: ChecklistStatus;
  airflow_condition: ChecklistStatus;
  notes: string;
}

export interface TankItem {
  id: string;
  tank_number: string;
  product_name: string;
  capacity_liters: number;
  level_sensor_status: ChecklistStatus;
  water_sensor_status: ChecklistStatus;
  temp_sensor_status: ChecklistStatus;
}

export interface NozzleItem {
  id: string;
  pump_number: number;
  nozzle_number: number;
  product_name: string;
  status: ChecklistStatus;
  meter_reading: string;
}

export interface ForecourtFMS {
  dispenser_count: number;
  total_nozzles: number;
  atg_brand: string;
  atg_controller_status: ChecklistStatus;
  dispenser_interface_box: ChecklistStatus; // Interface converter loop RS485 / Current Loop
  metrology_seal_status: ChecklistStatus; // Segel Tera Metrologi Legal
  tanks: TankItem[];
  nozzles: NozzleItem[];
}

export interface EDCItem {
  id: string;
  brand_type: string;
  serial_number: string;
  physical_status: ChecklistStatus;
  connection_status: ChecklistStatus;
  notes: string;
}

export interface PeripheralsInventory {
  display_touchscreen: {
    status: ChecklistStatus;
    notes: string;
  };
  receipt_printer: {
    status: ChecklistStatus;
    thermal_head: ChecklistStatus;
    auto_cutter: ChecklistStatus;
    notes: string;
  };
  barcode_scanner: {
    status: ChecklistStatus;
    notes: string;
  };
  cash_drawer: {
    status: ChecklistStatus;
    notes: string;
  };
}

export interface NetworkPower {
  utp_cable_status: ChecklistStatus;
  switch_router_status: ChecklistStatus;
  ip_address: string;
  subnet_mask: string;
  gateway: string;
  dns: string;
  ping_latency_ms: number;
  ups_model: string;
  ups_backup_time_min: number;
  ups_shutdown_test: ChecklistStatus;
  voltage_pn: number; // Phase to Neutral (~220V)
  voltage_pg: number; // Phase to Ground (~220V)
  voltage_ng: number; // Neutral to Ground (< 2.0V)
  room_temp_celsius: number;
  apar_safety_status: ChecklistStatus; // Alat Pemadam Api Ringan di area POS/Forecourt
  emergency_stop_status: ChecklistStatus; // Tombol E-Stop Pemutus Daya Darurat
  notes: string;
}

export interface PinsystFeatureCheck {
  id: number;
  code: string;
  title: string;
  description: string;
  status: FeatureStatus;
  findings: string;
  corrective_action: string;
}

export interface PMAttachment {
  id: string;
  file_name: string;
  file_url: string;
  category:
    | 'Kondisi Hardware'
    | 'Dispenser & ATG'
    | 'EDC & Periferal'
    | 'Temuan Kerusakan'
    | 'Kondisi Umum'
    | 'Sebelum Perbaikan'
    | 'Proses Perbaikan'
    | 'Sesudah Perbaikan'
    | 'Sparepart'
    | 'Lainnya';
  caption: string;
  uploaded_at: string;
}

export interface PMReport {
  id: string;
  work_type: WorkType;
  site_id: number;
  site_code: string;
  site_name: string;
  terminal_id: string;
  technician_name: string;
  technician_phone: string;
  supervisor_name: string; // Nama PWS yang sedang bertugas
  execution_date: string;
  execution_time: string;
  overall_status: PMOverallStatus;
  findings_summary: string;
  action_plan: string;
  next_pm_recommendation_date: string;
  
  // Specific sections
  repair_details?: CorrectiveRepairDetails;
  quick_check_details?: QuickCheckDetails;
  
  software: SoftwareInventory;
  hardware: HardwareSpecs;
  forecourt: ForecourtFMS;
  edc_list: EDCItem[];
  peripherals: PeripheralsInventory;
  network_power: NetworkPower;
  features_checklist: PinsystFeatureCheck[];
  attachments: PMAttachment[];
  
  technician_signature?: string;
  technician_signed_at?: string;
  supervisor_signature?: string;
  supervisor_signed_at?: string;
  
  created_at: string;
  updated_at: string;
  synced_to_server: boolean;
  gdrive_pdf_id?: string;

  /**
   * DRAFT        : being filled in by the technician
   * PENDING_SYNC : finalised on the device, waiting to reach the server (locked)
   * FINAL        : stored on the server (locked; only Admin may revise)
   * Older reports without a status are FINAL when synced_to_server is true.
   */
  status?: ReportStatus;
  finalized_at?: string;
  finalized_by?: string;
  revision?: number;
  revision_log?: { at: string; by: string; note: string }[];

  /** Set when this report is a corrective repair started from a ticket */
  ticket_id?: string;
  ticket_number?: string;

  /** Google Drive archive info, filled by the server after upload */
  gdrive?: GDriveArchiveInfo;
}

export type ReportStatus = 'DRAFT' | 'PENDING_SYNC' | 'FINAL';

export interface GDriveArchiveInfo {
  folder_id: string;
  folder_url: string;
  folder_path: string;
  pdf_file_id: string;
  pdf_url: string;
  pdf_file_name: string;
  /** attachment id -> Drive file id, so photos are only uploaded once */
  photos: Record<string, string>;
  uploaded_at: string;
}

export interface FuelProduct {
  id: string;
  code: string;
  name: string;
  octane_cetane: string;
  badge_color: string;
  default_capacity_liters: number;
  price_usd_per_liter: number;
  status: 'Aktif' | 'Non-aktif';
  notes?: string;
}

export interface AtgBrandConfig {
  id: string;
  brand_name: string;
  model_series: string;
  protocol: string;
  default_port: number;
  baud_rate: string;
  support_water_detection: boolean;
  support_temperature_comp: boolean;
  status: 'Aktif' | 'Non-aktif';
  notes?: string;
}

export interface DispenserBrandConfig {
  id: string;
  brand_name: string;
  series_model: string;
  interface_protocol: string;
  max_nozzles: number;
  pulse_ratio: string;
  status: 'Aktif' | 'Non-aktif';
  notes?: string;
}

export interface HardwareMasterConfig {
  id: string;
  category: 'POS' | 'EDC' | 'PRINTER' | 'UPS' | 'NETWORK';
  brand_model: string;
  specs_description: string;
  default_os_firmware?: string;
  status: 'Aktif' | 'Non-aktif';
}

export interface SystemThresholdSettings {
  max_grounding_volts: number;
  min_ups_volts: number;
  max_ups_volts: number;
  company_name: string;
  country_jurisdiction: string;
  official_currency: string;
  helpdesk_email: string;
  emergency_phone: string;
  pm_routine_interval_days: number;
  turso_sync_enabled: boolean;
  gdrive_backup_folder_id: string;
}
