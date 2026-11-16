import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { getTursoClient, initTursoDatabase } from '@/lib/turso';
import { Site } from '@/lib/types';

export async function GET() {
  try {
    await initTursoDatabase();
    const db = getTursoClient();

    const res = await db.execute('SELECT * FROM sites ORDER BY id ASC;');

    const sites: Site[] = res.rows.map(row => ({
      id: Number(row.id),
      site_code: String(row.site_code),
      site_name: String(row.site_name),
      location: String(row.location),
      regional: String(row.regional),
      contact_person: String(row.contact_person),
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
    await initTursoDatabase();
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
    await initTursoDatabase();
    const db = getTursoClient();
    const body = await req.json();

    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ success: false, message: 'ID SPBU tidak valid.' }, { status: 400 });
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
    await initTursoDatabase();
    const db = getTursoClient();
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID SPBU diperlukan.' }, { status: 400 });
    }

    await db.execute({
      sql: 'DELETE FROM sites WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true, message: 'SPBU berhasil dihapus dari sistem.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

