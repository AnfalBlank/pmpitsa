import { NextResponse } from 'next/server';
import { audit } from '@/lib/audit';
import { requireSession } from '@/lib/session';
import { getTursoClient, ensureSchema } from '@/lib/turso';
import { Site, SiteForecourtConfig } from '@/lib/types';

function parseForecourt(raw: unknown): SiteForecourtConfig | undefined {
  if (!raw) return undefined;
  try {
    const f = JSON.parse(String(raw));
    return f && Array.isArray(f.pumps) && Array.isArray(f.tanks) ? f : undefined;
  } catch {
    return undefined;
  }
}

/** Keep only the expected shape (numbers/strings), drop anything else */
function sanitizeForecourt(input: any): SiteForecourtConfig {
  const str = (v: unknown, max = 120) => String(v ?? '').trim().slice(0, max);
  const pumps = (Array.isArray(input?.pumps) ? input.pumps : []).slice(0, 60).map((p: any, i: number) => ({
    pump_number: Number(p?.pump_number) || i + 1,
    nozzles: (Array.isArray(p?.nozzles) ? p.nozzles : []).slice(0, 12).map((n: any, j: number) => ({
      nozzle_number: Number(n?.nozzle_number) || j + 1,
      product_name: str(n?.product_name),
    })),
  }));
  const tanks = (Array.isArray(input?.tanks) ? input.tanks : []).slice(0, 40).map((t: any, i: number) => ({
    tank_number: str(t?.tank_number, 40) || `Tangki ${i + 1}`,
    product_name: str(t?.product_name),
    capacity_liters: Math.max(0, Number(t?.capacity_liters) || 0),
  }));
  const dispensers = (Array.isArray(input?.dispensers) ? input.dispensers : []).slice(0, 60).map((d: any, i: number) => ({
    id: str(d?.id, 40) || `DSP-${i + 1}`,
    label: str(d?.label, 60) || `Dispenser ${i + 1}`,
    model: str(d?.model),
    serial_number: str(d?.serial_number, 80),
    pumps: str(d?.pumps, 60) || undefined,
  }));
  return {
    dispenser_brand_id: str(input?.dispenser_brand_id, 60) || undefined,
    dispenser_brand: str(input?.dispenser_brand) || undefined,
    atg_brand_id: str(input?.atg_brand_id, 60) || undefined,
    atg_brand: str(input?.atg_brand) || undefined,
    pumps,
    tanks,
    dispensers,
    updated_at: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    await ensureSchema();
    const db = getTursoClient();

    const res = await db.execute('SELECT * FROM sites ORDER BY id ASC;');

    const sites: Site[] = res.rows.map(row => ({
      id: Number(row.id),
      site_code: String(row.site_code),
      site_name: String(row.site_name),
      location: String(row.location),
      regional: String(row.regional),
      contact_person: String(row.contact_person),
      forecourt: parseForecourt(row.forecourt_config),
    }));

    return NextResponse.json({ success: true, sites });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = requireSession(req, 'site.manage');
    if (auth.error) return auth.error;
    const session = auth.session;
    await ensureSchema();
    const db = getTursoClient();
    const body = await req.json();

    const siteCode = String(body.site_code || '').trim();
    const siteName = String(body.site_name || '').trim();
    const location = String(body.location || '').trim();
    const regional = String(body.regional || 'Pertamina International Timor, S.A.').trim();
    const contactPerson = String(body.contact_person || '').trim();

    if (!siteCode || !siteName) {
      return NextResponse.json({ success: false, message: 'Kode SPBU dan Nama SPBU wajib diisi.' }, { status: 400 });
    }

    // Determine next id
    const countRes = await db.execute('SELECT MAX(id) as max_id FROM sites;');
    const nextId = (Number(countRes.rows[0]?.max_id) || 0) + 1;

    await db.execute({
      sql: `INSERT INTO sites (id, site_code, site_name, location, regional, contact_person)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [nextId, siteCode, siteName, location, regional, contactPerson],
    });

    const newSite: Site = {
      id: nextId,
      site_code: siteCode,
      site_name: siteName,
      location,
      regional,
      contact_person: contactPerson,
    };

    await audit(db, req, session, {
      action: 'create',
      entity_type: 'site',
      entity_id: nextId,
      entity_label: `${siteCode} · ${siteName}`,
      site_id: nextId,
      summary: `Mendaftarkan SPBU ${siteName}`,
      details: { location, regional, contact_person: contactPerson },
    });
    return NextResponse.json({ success: true, site: newSite, message: 'SPBU baru berhasil didaftarkan.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = requireSession(req, 'site.manage');
    if (auth.error) return auth.error;
    const session = auth.session;
    await ensureSchema();
    const db = getTursoClient();
    const body = await req.json();

    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ success: false, message: 'ID SPBU tidak valid.' }, { status: 400 });
    }

    // Forecourt configuration only (Konfigurasi > Data SPBU > Forecourt)
    const prevSite = await db.execute({ sql: 'SELECT * FROM sites WHERE id = ? LIMIT 1;', args: [id] });
    const prev = prevSite.rows[0];

    if (body.forecourt !== undefined && body.site_code === undefined) {
      const forecourt = sanitizeForecourt(body.forecourt);
      const res = await db.execute({ sql: 'UPDATE sites SET forecourt_config = ? WHERE id = ?', args: [JSON.stringify(forecourt), id] });
      if (!res.rowsAffected) return NextResponse.json({ success: false, message: 'SPBU tidak ditemukan.' }, { status: 404 });
      const old = parseForecourt(prev?.forecourt_config);
      const nz = (f?: SiteForecourtConfig) => (f ? f.pumps.reduce((n, p) => n + p.nozzles.length, 0) : 0);
      await audit(db, req, session, {
        action: 'config_forecourt',
        entity_type: 'site',
        entity_id: id,
        entity_label: prev ? `${prev.site_code} · ${prev.site_name}` : String(id),
        site_id: id,
        summary: `Konfigurasi forecourt: ${old ? `${old.pumps.length} pump/${nz(old)} nozzle/${old.tanks.length} tangki` : 'belum ada'} → ${forecourt.pumps.length} pump/${nz(forecourt)} nozzle/${forecourt.tanks.length} tangki/${(forecourt.dispensers || []).length} unit dispenser`,
        details: {
          dispenser_brand: { from: old?.dispenser_brand ?? null, to: forecourt.dispenser_brand ?? null },
          atg_brand: { from: old?.atg_brand ?? null, to: forecourt.atg_brand ?? null },
        },
      });
      return NextResponse.json({ success: true, message: 'Konfigurasi forecourt SPBU tersimpan.', forecourt });
    }

    const siteCode = String(body.site_code || '').trim();
    const siteName = String(body.site_name || '').trim();
    const location = String(body.location || '').trim();
    const regional = String(body.regional || '').trim();
    const contactPerson = String(body.contact_person || '').trim();

    await db.execute({
      sql: `UPDATE sites 
            SET site_code = ?, site_name = ?, location = ?, regional = ?, contact_person = ?
            WHERE id = ?`,
      args: [siteCode, siteName, location, regional, contactPerson, id],
    });

    {
      const next: Record<string, unknown> = { site_code: siteCode, site_name: siteName, location, regional, contact_person: contactPerson };
      const changes = Object.entries(next)
        .filter(([k, v]) => prev && String(prev[k] ?? '') !== String(v ?? ''))
        .map(([k, v]) => ({ field: k, from: prev?.[k] ?? null, to: v }));
      await audit(db, req, session, {
        action: 'update',
        entity_type: 'site',
        entity_id: id,
        entity_label: `${siteCode} · ${siteName}`,
        site_id: id,
        summary: changes.length ? changes.map((c) => `${c.field}: ${c.from ?? '-'} → ${c.to}`).join(' · ') : 'Data SPBU disimpan tanpa perubahan',
        details: { changes },
      });
    }
    return NextResponse.json({ success: true, message: 'Data SPBU berhasil diperbarui.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = requireSession(req, 'site.manage');
    if (auth.error) return auth.error;
    const session = auth.session;
    await ensureSchema();
    const db = getTursoClient();
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID SPBU diperlukan.' }, { status: 400 });
    }

    const gone = await db.execute({ sql: 'SELECT site_code, site_name, contact_person FROM sites WHERE id = ? LIMIT 1;', args: [id] });

    await db.execute({
      sql: 'DELETE FROM sites WHERE id = ?',
      args: [id],
    });

    await audit(db, req, session, {
      action: 'delete',
      entity_type: 'site',
      entity_id: id,
      entity_label: gone.rows[0] ? `${gone.rows[0].site_code} · ${gone.rows[0].site_name}` : String(id),
      site_id: id,
      summary: `Menghapus SPBU ${gone.rows[0]?.site_name ?? id}`,
    });

    return NextResponse.json({ success: true, message: 'SPBU berhasil dihapus dari sistem.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

