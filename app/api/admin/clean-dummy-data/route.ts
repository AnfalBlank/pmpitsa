import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { getTursoClient, ensureSchema } from '@/lib/turso';

export async function POST(req: Request) {
  try {
    const auth = requireSession(req, 'config.manage');
    if (auth.error) return auth.error;
    const session = auth.session;
    await ensureSchema();
    const db = getTursoClient();

    // 1. Clear transactional tables only (KEEP users, sites, fuel_products, atg_brands, etc.)
    await db.execute('DELETE FROM tickets;');
    await db.execute('DELETE FROM maintenance_plans;');
    await db.execute('DELETE FROM pm_reports;');

    // 2. Set persistent flag so ensureSchema never re-seeds sample dummy records
    await db.execute({
      sql: `INSERT OR REPLACE INTO system_settings (key, value, description) 
            VALUES ('dummy_data_cleared', 'true', 'Flags that dummy sample data has been permanently cleared')`,
      args: [],
    });

    const userCount = await db.execute('SELECT COUNT(*) as count FROM users;');
    const siteCount = await db.execute('SELECT COUNT(*) as count FROM sites;');

    return NextResponse.json({
      success: true,
      message: 'Seluruh data tiket, jadwal PM, dan berita acara dummy berhasil dibersihkan. Master data SPBU & Pengguna tetap utuh.',
      retained: {
        users: Number(userCount.rows[0]?.count ?? 0),
        sites: Number(siteCount.rows[0]?.count ?? 0),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: 'Gagal membersihkan data dummy: ' + err.message },
      { status: 500 }
    );
  }
}

