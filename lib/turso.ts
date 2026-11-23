import { createClient, Client } from '@libsql/client';
import { 
  SAMPLE_SITES, 
  SAMPLE_TICKETS, 
  SAMPLE_MAINTENANCE_PLANS, 
  HISTORICAL_REPORTS,
  DEFAULT_FUEL_PRODUCTS,
  DEFAULT_ATG_BRANDS,
  DEFAULT_DISPENSER_BRANDS,
  DEFAULT_HARDWARE_CONFIGS,
  DEFAULT_SYSTEM_SETTINGS
} from './sample-data';

import { hashPassword } from './password';

function requireEnv(name: 'TURSO_DATABASE_URL' | 'TURSO_AUTH_TOKEN'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} belum dikonfigurasi di environment. Set variabel ini di .env.local (lokal) atau di pengaturan environment hosting.`);
  }
  return value;
}

let tursoClient: Client | null = null;

export function getTursoClient(): Client {
  if (!tursoClient) {
    tursoClient = createClient({
      url: requireEnv('TURSO_DATABASE_URL'),
      authToken: requireEnv('TURSO_AUTH_TOKEN'),
    });
  }
  return tursoClient;
}

let schemaReady: Promise<void> | null = null;

/**
 * Create tables if they don't exist yet. Idempotent and runs once per server
 * process. Safe to call from every route; it never inserts data.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = createSchema().catch((err) => {
      schemaReady = null; // retry on the next request
      throw err;
    });
  }
  return schemaReady;
}

async function createSchema(): Promise<void> {
  const db = getTursoClient();
  // 1. Users Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      role_title TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      phone TEXT NOT NULL,
      assigned_site_id INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  // 1b. Technician division (IT / TEKNIK)
  const userCols = await db.execute('PRAGMA table_info(users);');
  if (!userCols.rows.some((r) => String(r.name) === 'division')) {
    try {
      await db.execute("ALTER TABLE users ADD COLUMN division TEXT DEFAULT 'IT';");
    } catch {
      // another instance added it concurrently
    }
  }

  // 2. Sites Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sites (
      id INTEGER PRIMARY KEY,
      site_code TEXT UNIQUE NOT NULL,
      site_name TEXT NOT NULL,
      location TEXT NOT NULL,
      regional TEXT NOT NULL,
      contact_person TEXT NOT NULL
    );
  `);
  // 2b. Per-site forecourt configuration (pumps, nozzles, tanks, brands) as JSON
  const siteCols = await db.execute('PRAGMA table_info(sites);');
  if (!siteCols.rows.some((r) => String(r.name) === 'forecourt_config')) {
    try {
      await db.execute('ALTER TABLE sites ADD COLUMN forecourt_config TEXT;');
    } catch {
      // another instance added it concurrently
    }
  }

  // 3. Tickets Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      ticket_number TEXT UNIQUE NOT NULL,
      site_id INTEGER NOT NULL,
      site_code TEXT NOT NULL,
      site_name TEXT NOT NULL,
      terminal_id TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      reported_by TEXT NOT NULL,
      reported_at TEXT NOT NULL,
      assigned_to TEXT,
      resolved_at TEXT,
      resolution_notes TEXT
    );
  `);

  // 3b. Ticket division (IT / TEKNIK)
  const ticketCols = await db.execute('PRAGMA table_info(tickets);');
  if (!ticketCols.rows.some((r) => String(r.name) === 'division')) {
    try {
      await db.execute("ALTER TABLE tickets ADD COLUMN division TEXT DEFAULT 'IT';");
    } catch {
      // another instance added it concurrently
    }
  }

  // 4. Maintenance Plans Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS maintenance_plans (
      id TEXT PRIMARY KEY,
      site_id INTEGER NOT NULL,
      site_code TEXT NOT NULL,
      site_name TEXT NOT NULL,
      terminal_id TEXT NOT NULL,
      plan_type TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      assigned_technician TEXT NOT NULL,
      supervisor_pws TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT
    );
  `);

  // 5. PM Reports Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS pm_reports (
      id TEXT PRIMARY KEY,
      work_type TEXT NOT NULL,
      site_id INTEGER NOT NULL,
      site_code TEXT NOT NULL,
      site_name TEXT NOT NULL,
      terminal_id TEXT NOT NULL,
      execution_date TEXT NOT NULL,
      technician_name TEXT NOT NULL,
      technician_phone TEXT NOT NULL,
      supervisor_name TEXT NOT NULL,
      overall_status TEXT NOT NULL,
      findings_summary TEXT,
      action_plan_summary TEXT,
      technician_signature TEXT,
      technician_signed_at TEXT,
      supervisor_signature TEXT,
      supervisor_signed_at TEXT,
      report_data TEXT NOT NULL,
      synced_to_server INTEGER DEFAULT 1,
      gdrive_pdf_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 6. Fuel Products Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS fuel_products (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      octane_cetane TEXT NOT NULL,
      badge_color TEXT NOT NULL,
      default_capacity_liters INTEGER NOT NULL,
      price_usd_per_liter REAL NOT NULL,
      status TEXT NOT NULL,
      notes TEXT
    );
  `);

  // 7. ATG Brands Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS atg_brands (
      id TEXT PRIMARY KEY,
      brand_name TEXT NOT NULL,
      model_series TEXT NOT NULL,
      protocol TEXT NOT NULL,
      default_port INTEGER NOT NULL,
      baud_rate TEXT NOT NULL,
      support_water_detection INTEGER NOT NULL,
      support_temperature_comp INTEGER NOT NULL,
      status TEXT NOT NULL,
      notes TEXT
    );
  `);

  // 8. Dispenser Brands Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS dispenser_brands (
      id TEXT PRIMARY KEY,
      brand_name TEXT NOT NULL,
      series_model TEXT NOT NULL,
      interface_protocol TEXT NOT NULL,
      max_nozzles INTEGER NOT NULL,
      pulse_ratio TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT
    );
  `);

  // 9. Hardware Master Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS hardware_configs (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      brand_model TEXT NOT NULL,
      specs_description TEXT NOT NULL,
      default_os_firmware TEXT,
      status TEXT NOT NULL
    );
  `);

  // 10. System Settings Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT
    );
  `);

  // Photos / signatures of a BA uploaded in small chunks before the (small) BA itself
  await db.execute(`
    CREATE TABLE IF NOT EXISTS report_parts (
      report_id TEXT NOT NULL,
      part_id TEXT NOT NULL,
      idx INTEGER NOT NULL,
      total INTEGER NOT NULL,
      data TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (report_id, part_id, idx, user_id)
    );
  `);

  // Notifications per user / role (+ SPBU) and who has read them
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link_module TEXT,
      link_id TEXT,
      target_user_id TEXT,
      target_role TEXT,
      target_site_id INTEGER,
      actor_id TEXT
    );
  `);
  await db.execute('CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);');
  // Daily readiness checklist by the Pengawas (one per SPBU per day)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS daily_checks (
      id TEXT PRIMARY KEY,
      site_id INTEGER NOT NULL,
      site_code TEXT NOT NULL,
      site_name TEXT NOT NULL,
      check_date TEXT NOT NULL,
      submitted_by_id TEXT NOT NULL,
      submitted_by_name TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      status TEXT NOT NULL,
      items TEXT NOT NULL,
      ticket_numbers TEXT
    );
  `);
  await db.execute('CREATE INDEX IF NOT EXISTS idx_daily_checks_date ON daily_checks(check_date);');

  // Audit trail (append-only: no API updates or deletes these rows)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      at TEXT NOT NULL,
      user_id TEXT,
      user_name TEXT,
      user_role TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      entity_label TEXT,
      site_id INTEGER,
      summary TEXT NOT NULL,
      details TEXT,
      ip TEXT,
      user_agent TEXT
    );
  `);
  await db.execute('CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_logs(at);');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS notification_reads (
      notification_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      read_at TEXT NOT NULL,
      PRIMARY KEY (notification_id, user_id)
    );
  `);
}

/**
 * Create the schema and seed sample/default data into empty tables.
 * Only reachable through the guarded /api/init-db route.
 */
export async function initTursoDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    await ensureSchema();
    await seedSampleData(getTursoClient());
    return { success: true, message: "Database Turso berhasil diinisialisasi dan di-seed." };
  } catch (err: any) {
    console.error("Gagal menginisialisasi database Turso:", err);
    return { success: false, message: err.message || "Gagal menginisialisasi database" };
  }
}

async function seedSampleData(db: Client): Promise<void> {
  // Seed default users if empty
  const userCheck = await db.execute("SELECT COUNT(*) as count FROM users;");
  const userCount = Number(userCheck.rows[0]?.count ?? 0);
  if (userCount === 0) {
    const defaultUsers = [
      {
        id: "USR-001",
        username: "teknisi",
        password: "password123",
        name: "Rizky Ramadhan",
        role: "TECHNICIAN",
        role_title: "Teknisi Lapangan POS & FMS",
        employee_id: "FMS-ENG-042",
        phone: "+670 7733 9102",
        assigned_site_id: 1,
      },
      {
        id: "USR-002",
        username: "supervisor",
        password: "password123",
        name: "Armando Da Costa",
        role: "SUPERVISOR",
        role_title: "Pengawas (PWS) Site SPBU Dili",
        employee_id: "SPV-DILI-001",
        phone: "+670 7723 8812",
        assigned_site_id: 1,
      },
      {
        id: "USR-003",
        username: "admin",
        password: "password123",
        name: "Ir. Hendra Kusuma",
        role: "ADMIN",
        role_title: "Administrator IT & Forecourt Central",
        employee_id: "ADMIN-PITL-01",
        phone: "+62 811 9922 4411",
        assigned_site_id: 1,
      },
      {
        id: "USR-004",
        username: "spv_baucau",
        password: "password123",
        name: "Jose Manuel Pereira",
        role: "SUPERVISOR",
        role_title: "Pengawas (PWS) Site SPBU Baucau",
        employee_id: "SPV-BAU-002",
        phone: "+670 7741 2290",
        assigned_site_id: 2,
      },
      {
        id: "USR-005",
        username: "teknisi_central",
        password: "password123",
        name: "Ahmad Fauzi",
        role: "TECHNICIAN",
        role_title: "Teknisi Elektrikal & ATG Forecourt",
        employee_id: "FMS-ENG-055",
        phone: "+62 812 3344 5566",
        assigned_site_id: 4,
      },
    ];

    for (const u of defaultUsers) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO users (id, username, password, name, role, role_title, employee_id, phone, assigned_site_id, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [u.id, u.username, await hashPassword(u.password), u.name, u.role, u.role_title, u.employee_id, u.phone, u.assigned_site_id, new Date().toISOString()],
      });
    }
  }

  // Seed sites if empty
  const siteCheck = await db.execute("SELECT COUNT(*) as count FROM sites;");
  const siteCount = Number(siteCheck.rows[0]?.count ?? 0);
  if (siteCount === 0) {
    for (const s of SAMPLE_SITES) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO sites (id, site_code, site_name, location, regional, contact_person)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [s.id, s.site_code, s.site_name, s.location, s.regional, s.contact_person],
      });
    }
  }

  // Check if dummy transactional data has been cleared
  const dummyCheck = await db.execute("SELECT value FROM system_settings WHERE key = 'dummy_data_cleared';");
  const isDummyCleared = dummyCheck.rows.length > 0 && String(dummyCheck.rows[0]?.value) === 'true';

  // Seed tickets only if not explicitly cleared
  const ticketCheck = await db.execute("SELECT COUNT(*) as count FROM tickets;");
  const ticketCount = Number(ticketCheck.rows[0]?.count ?? 0);
  if (!isDummyCleared && ticketCount === 0) {
    for (const t of SAMPLE_TICKETS) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO tickets (
                id, ticket_number, site_id, site_code, site_name, terminal_id, 
                category, priority, status, title, description, reported_by, 
                reported_at, assigned_to, resolved_at, resolution_notes
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          t.id, t.ticket_number, t.site_id, t.site_code, t.site_name, t.terminal_id,
          t.category, t.priority, t.status, t.title, t.description, t.reported_by,
          t.reported_at, t.assigned_to || null, t.resolved_at || null, t.resolution_notes || null,
        ],
      });
    }
  }

  // Seed maintenance plans only if not explicitly cleared
  const planCheck = await db.execute("SELECT COUNT(*) as count FROM maintenance_plans;");
  const planCount = Number(planCheck.rows[0]?.count ?? 0);
  if (!isDummyCleared && planCount === 0) {
    for (const p of SAMPLE_MAINTENANCE_PLANS) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO maintenance_plans (
                id, site_id, site_code, site_name, terminal_id, plan_type,
                scheduled_date, assigned_technician, supervisor_pws, status, notes
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          p.id, p.site_id, p.site_code, p.site_name, p.terminal_id, p.plan_type,
          p.scheduled_date, p.assigned_technician, p.supervisor_pws, p.status, p.notes,
        ],
      });
    }
  }

  // Seed reports only if not explicitly cleared
  const reportCheck = await db.execute("SELECT COUNT(*) as count FROM pm_reports;");
  const reportCount = Number(reportCheck.rows[0]?.count ?? 0);
  if (!isDummyCleared && reportCount === 0) {
    for (const r of HISTORICAL_REPORTS) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO pm_reports (
                id, work_type, site_id, site_code, site_name, terminal_id,
                execution_date, technician_name, technician_phone, supervisor_name,
                overall_status, findings_summary, action_plan_summary,
                technician_signature, technician_signed_at, supervisor_signature,
                supervisor_signed_at, report_data, synced_to_server, gdrive_pdf_id,
                created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          r.id, r.work_type, r.site_id, r.site_code, r.site_name, r.terminal_id,
          r.execution_date, r.technician_name, r.technician_phone, r.supervisor_name,
          r.overall_status, r.findings_summary, r.action_plan,
          r.technician_signature || null, r.technician_signed_at || null,
          r.supervisor_signature || null, r.supervisor_signed_at || null,
          JSON.stringify(r), 1, r.gdrive_pdf_id || null,
          r.created_at, r.updated_at,
        ],
      });
    }
  }

  // Seed fuel products if empty
  const prodCheck = await db.execute("SELECT COUNT(*) as count FROM fuel_products;");
  if (Number(prodCheck.rows[0]?.count ?? 0) === 0) {
    for (const p of DEFAULT_FUEL_PRODUCTS) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO fuel_products (id, code, name, octane_cetane, badge_color, default_capacity_liters, price_usd_per_liter, status, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [p.id, p.code, p.name, p.octane_cetane, p.badge_color, p.default_capacity_liters, p.price_usd_per_liter, p.status, p.notes || null],
      });
    }
  }

  // Seed ATG brands if empty
  const atgCheck = await db.execute("SELECT COUNT(*) as count FROM atg_brands;");
  if (Number(atgCheck.rows[0]?.count ?? 0) === 0) {
    for (const a of DEFAULT_ATG_BRANDS) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO atg_brands (id, brand_name, model_series, protocol, default_port, baud_rate, support_water_detection, support_temperature_comp, status, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [a.id, a.brand_name, a.model_series, a.protocol, a.default_port, a.baud_rate, a.support_water_detection ? 1 : 0, a.support_temperature_comp ? 1 : 0, a.status, a.notes || null],
      });
    }
  }

  // Seed dispenser brands if empty
  const dspCheck = await db.execute("SELECT COUNT(*) as count FROM dispenser_brands;");
  if (Number(dspCheck.rows[0]?.count ?? 0) === 0) {
    for (const d of DEFAULT_DISPENSER_BRANDS) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO dispenser_brands (id, brand_name, series_model, interface_protocol, max_nozzles, pulse_ratio, status, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [d.id, d.brand_name, d.series_model, d.interface_protocol, d.max_nozzles, d.pulse_ratio, d.status, d.notes || null],
      });
    }
  }

  // Seed hardware configs if empty
  const hwCheck = await db.execute("SELECT COUNT(*) as count FROM hardware_configs;");
  if (Number(hwCheck.rows[0]?.count ?? 0) === 0) {
    for (const h of DEFAULT_HARDWARE_CONFIGS) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO hardware_configs (id, category, brand_model, specs_description, default_os_firmware, status)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [h.id, h.category, h.brand_model, h.specs_description, h.default_os_firmware || null, h.status],
      });
    }
  }

  // Seed system settings if empty
  const setCheck = await db.execute("SELECT COUNT(*) as count FROM system_settings;");
  if (Number(setCheck.rows[0]?.count ?? 0) === 0) {
    const defaultSettingsMap: Record<string, string> = {
      max_grounding_volts: String(DEFAULT_SYSTEM_SETTINGS.max_grounding_volts),
      min_ups_volts: String(DEFAULT_SYSTEM_SETTINGS.min_ups_volts),
      max_ups_volts: String(DEFAULT_SYSTEM_SETTINGS.max_ups_volts),
      company_name: DEFAULT_SYSTEM_SETTINGS.company_name,
      country_jurisdiction: DEFAULT_SYSTEM_SETTINGS.country_jurisdiction,
      official_currency: DEFAULT_SYSTEM_SETTINGS.official_currency,
      helpdesk_email: DEFAULT_SYSTEM_SETTINGS.helpdesk_email,
      emergency_phone: DEFAULT_SYSTEM_SETTINGS.emergency_phone,
      pm_routine_interval_days: String(DEFAULT_SYSTEM_SETTINGS.pm_routine_interval_days),
    };

    for (const [key, val] of Object.entries(defaultSettingsMap)) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO system_settings (key, value, description)
              VALUES (?, ?, ?)`,
        args: [key, val, `Setting for ${key}`],
      });
    }
  }
}
