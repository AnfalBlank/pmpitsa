import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { getTursoClient, ensureSchema } from '@/lib/turso';
import { 
  FuelProduct, 
  AtgBrandConfig, 
  DispenserBrandConfig, 
  HardwareMasterConfig, 
  SystemThresholdSettings 
} from '@/lib/types';
import { 
  DEFAULT_FUEL_PRODUCTS, 
  DEFAULT_ATG_BRANDS, 
  DEFAULT_DISPENSER_BRANDS, 
  DEFAULT_HARDWARE_CONFIGS, 
  DEFAULT_SYSTEM_SETTINGS 
} from '@/lib/sample-data';

export async function GET() {
  try {
    await ensureSchema();
    const db = getTursoClient();

    // 1. Products
    const prodRes = await db.execute('SELECT * FROM fuel_products ORDER BY id ASC;');
    const products: FuelProduct[] = prodRes.rows.map(r => ({
      id: String(r.id),
      code: String(r.code),
      name: String(r.name),
      octane_cetane: String(r.octane_cetane),
      badge_color: String(r.badge_color),
      default_capacity_liters: Number(r.default_capacity_liters),
      price_usd_per_liter: Number(r.price_usd_per_liter),
      status: r.status === 'Aktif' ? 'Aktif' : 'Non-aktif',
      notes: r.notes ? String(r.notes) : undefined,
    }));

    // 2. ATG Brands
    const atgRes = await db.execute('SELECT * FROM atg_brands ORDER BY id ASC;');
    const atgBrands: AtgBrandConfig[] = atgRes.rows.map(r => ({
      id: String(r.id),
      brand_name: String(r.brand_name),
      model_series: String(r.model_series),
      protocol: String(r.protocol),
      default_port: Number(r.default_port),
      baud_rate: String(r.baud_rate),
      support_water_detection: Boolean(r.support_water_detection),
      support_temperature_comp: Boolean(r.support_temperature_comp),
      status: r.status === 'Aktif' ? 'Aktif' : 'Non-aktif',
      notes: r.notes ? String(r.notes) : undefined,
    }));

    // 3. Dispenser Brands
    const dspRes = await db.execute('SELECT * FROM dispenser_brands ORDER BY id ASC;');
    const dispenserBrands: DispenserBrandConfig[] = dspRes.rows.map(r => ({
      id: String(r.id),
      brand_name: String(r.brand_name),
      series_model: String(r.series_model),
      interface_protocol: String(r.interface_protocol),
      max_nozzles: Number(r.max_nozzles),
      pulse_ratio: String(r.pulse_ratio),
      status: r.status === 'Aktif' ? 'Aktif' : 'Non-aktif',
      notes: r.notes ? String(r.notes) : undefined,
    }));

    // 4. Hardware Master
    const hwRes = await db.execute('SELECT * FROM hardware_configs ORDER BY id ASC;');
    const hardwareConfigs: HardwareMasterConfig[] = hwRes.rows.map(r => ({
      id: String(r.id),
      category: r.category as HardwareMasterConfig['category'],
      brand_model: String(r.brand_model),
      specs_description: String(r.specs_description),
      default_os_firmware: r.default_os_firmware ? String(r.default_os_firmware) : undefined,
      status: r.status === 'Aktif' ? 'Aktif' : 'Non-aktif',
    }));

    // 5. System Settings
    const setRes = await db.execute('SELECT * FROM system_settings;');
    const settingsMap: Record<string, string> = {};
    for (const row of setRes.rows) {
      settingsMap[String(row.key)] = String(row.value);
    }

    const settings: SystemThresholdSettings = {
      max_grounding_volts: Number(settingsMap.max_grounding_volts || DEFAULT_SYSTEM_SETTINGS.max_grounding_volts),
      min_ups_volts: Number(settingsMap.min_ups_volts || DEFAULT_SYSTEM_SETTINGS.min_ups_volts),
      max_ups_volts: Number(settingsMap.max_ups_volts || DEFAULT_SYSTEM_SETTINGS.max_ups_volts),
      company_name: settingsMap.company_name || DEFAULT_SYSTEM_SETTINGS.company_name,
      country_jurisdiction: settingsMap.country_jurisdiction || DEFAULT_SYSTEM_SETTINGS.country_jurisdiction,
      official_currency: settingsMap.official_currency || DEFAULT_SYSTEM_SETTINGS.official_currency,
      helpdesk_email: settingsMap.helpdesk_email || DEFAULT_SYSTEM_SETTINGS.helpdesk_email,
      emergency_phone: settingsMap.emergency_phone || DEFAULT_SYSTEM_SETTINGS.emergency_phone,
      pm_routine_interval_days: Number(settingsMap.pm_routine_interval_days || DEFAULT_SYSTEM_SETTINGS.pm_routine_interval_days),
      turso_sync_enabled: true,
      gdrive_backup_folder_id: settingsMap.gdrive_backup_folder_id || DEFAULT_SYSTEM_SETTINGS.gdrive_backup_folder_id,
    };

    return NextResponse.json({
      success: true,
      products: products.length > 0 ? products : DEFAULT_FUEL_PRODUCTS,
      atgBrands: atgBrands.length > 0 ? atgBrands : DEFAULT_ATG_BRANDS,
      dispenserBrands: dispenserBrands.length > 0 ? dispenserBrands : DEFAULT_DISPENSER_BRANDS,
      hardwareConfigs: hardwareConfigs.length > 0 ? hardwareConfigs : DEFAULT_HARDWARE_CONFIGS,
      settings,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err.message,
      products: DEFAULT_FUEL_PRODUCTS,
      atgBrands: DEFAULT_ATG_BRANDS,
      dispenserBrands: DEFAULT_DISPENSER_BRANDS,
      hardwareConfigs: DEFAULT_HARDWARE_CONFIGS,
      settings: DEFAULT_SYSTEM_SETTINGS,
    });
  }
}

export async function POST(req: Request) {
  try {
    const auth = requireSession(req, 'config.manage');
    if (auth.error) return auth.error;
    const session = auth.session;
    await ensureSchema();
    const db = getTursoClient();
    const body = await req.json();
    const { section, item, settings } = body;

    if (section === 'settings' && settings) {
      for (const [key, val] of Object.entries(settings)) {
        await db.execute({
          sql: `INSERT INTO system_settings (key, value, description)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          args: [key, String(val), `Setting for ${key}`],
        });
      }
      return NextResponse.json({ success: true, message: 'Pengaturan sistem berhasil disimpan ke Turso.' });
    }

    if (section === 'product' && item) {
      const p: FuelProduct = item;
      const id = p.id || `PRD-${Date.now()}`;
      await db.execute({
        sql: `INSERT INTO fuel_products (id, code, name, octane_cetane, badge_color, default_capacity_liters, price_usd_per_liter, status, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                code = excluded.code,
                name = excluded.name,
                octane_cetane = excluded.octane_cetane,
                badge_color = excluded.badge_color,
                default_capacity_liters = excluded.default_capacity_liters,
                price_usd_per_liter = excluded.price_usd_per_liter,
                status = excluded.status,
                notes = excluded.notes`,
        args: [id, p.code, p.name, p.octane_cetane, p.badge_color, p.default_capacity_liters, p.price_usd_per_liter, p.status, p.notes || null],
      });
      return NextResponse.json({ success: true, id, message: 'Master Produk BBM berhasil disimpan.' });
    }

    if (section === 'atg' && item) {
      const a: AtgBrandConfig = item;
      const id = a.id || `ATG-${Date.now()}`;
      await db.execute({
        sql: `INSERT INTO atg_brands (id, brand_name, model_series, protocol, default_port, baud_rate, support_water_detection, support_temperature_comp, status, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                brand_name = excluded.brand_name,
                model_series = excluded.model_series,
                protocol = excluded.protocol,
                default_port = excluded.default_port,
                baud_rate = excluded.baud_rate,
                support_water_detection = excluded.support_water_detection,
                support_temperature_comp = excluded.support_temperature_comp,
                status = excluded.status,
                notes = excluded.notes`,
        args: [id, a.brand_name, a.model_series, a.protocol, a.default_port, a.baud_rate, a.support_water_detection ? 1 : 0, a.support_temperature_comp ? 1 : 0, a.status, a.notes || null],
      });
      return NextResponse.json({ success: true, id, message: 'Konfigurasi Brand ATG berhasil disimpan.' });
    }

    if (section === 'dispenser' && item) {
      const d: DispenserBrandConfig = item;
      const id = d.id || `DSP-${Date.now()}`;
      await db.execute({
        sql: `INSERT INTO dispenser_brands (id, brand_name, series_model, interface_protocol, max_nozzles, pulse_ratio, status, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                brand_name = excluded.brand_name,
                series_model = excluded.series_model,
                interface_protocol = excluded.interface_protocol,
                max_nozzles = excluded.max_nozzles,
                pulse_ratio = excluded.pulse_ratio,
                status = excluded.status,
                notes = excluded.notes`,
        args: [id, d.brand_name, d.series_model, d.interface_protocol, d.max_nozzles, d.pulse_ratio, d.status, d.notes || null],
      });
      return NextResponse.json({ success: true, id, message: 'Konfigurasi Brand Dispenser berhasil disimpan.' });
    }

    if (section === 'hardware' && item) {
      const h: HardwareMasterConfig = item;
      const id = h.id || `HW-${Date.now()}`;
      await db.execute({
        sql: `INSERT INTO hardware_configs (id, category, brand_model, specs_description, default_os_firmware, status)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                category = excluded.category,
                brand_model = excluded.brand_model,
                specs_description = excluded.specs_description,
                default_os_firmware = excluded.default_os_firmware,
                status = excluded.status`,
        args: [id, h.category, h.brand_model, h.specs_description, h.default_os_firmware || null, h.status],
      });
      return NextResponse.json({ success: true, id, message: 'Konfigurasi Hardware berhasil disimpan.' });
    }

    return NextResponse.json({ success: false, message: 'Parameter section tidak dikenali.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = requireSession(req, 'config.manage');
    if (auth.error) return auth.error;
    const session = auth.session;
    await ensureSchema();
    const db = getTursoClient();
    const { searchParams } = new URL(req.url);
    const section = searchParams.get('section');
    const id = searchParams.get('id');

    if (!section || !id) {
      return NextResponse.json({ success: false, message: 'Section dan ID wajib disertakan.' }, { status: 400 });
    }

    const tableMap: Record<string, string> = {
      product: 'fuel_products',
      atg: 'atg_brands',
      dispenser: 'dispenser_brands',
      hardware: 'hardware_configs',
    };

    const tableName = tableMap[section];
    if (!tableName) {
      return NextResponse.json({ success: false, message: 'Tabel section tidak valid.' }, { status: 400 });
    }

    await db.execute({
      sql: `DELETE FROM ${tableName} WHERE id = ?`,
      args: [id],
    });

    return NextResponse.json({ success: true, message: `Data ${section} berhasil dihapus dari Turso.` });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

