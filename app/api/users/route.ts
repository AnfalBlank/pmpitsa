import { NextResponse } from 'next/server';
import { audit } from '@/lib/audit';
import { requireSession } from '@/lib/session';
import { getTursoClient, ensureSchema } from '@/lib/turso';
import { hashPassword } from '@/lib/password';

export async function GET(req: Request) {
  try {
    const auth = requireSession(req);
    if (auth.error) return auth.error;
    const session = auth.session;
    await ensureSchema();
    const db = getTursoClient();
    const res = await db.execute('SELECT id, username, name, role, role_title, employee_id, phone, assigned_site_id, division, created_at FROM users ORDER BY id ASC;');

    const users = res.rows.map(row => ({
      id: String(row.id),
      username: String(row.username),
      name: String(row.name),
      role: String(row.role),
      roleTitle: String(row.role_title),
      employeeId: String(row.employee_id),
      phone: String(row.phone),
      assignedSiteId: Number(row.assigned_site_id || 1),
      division: String(row.division || 'IT') === 'TEKNIK' ? 'TEKNIK' : 'IT',
      createdAt: String(row.created_at || ''),
    }));

    return NextResponse.json({ success: true, users });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = requireSession(req, 'user.manage');
    if (auth.error) return auth.error;
    const session = auth.session;
    const body = await req.json();
    const { username, password, name, role, role_title, employee_id, phone, assigned_site_id } = body;
    const division = role === 'TECHNICIAN' && body.division === 'TEKNIK' ? 'TEKNIK' : 'IT';

    if (!username || !password || !name || !role || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Field username, password, nama, dan role wajib diisi.' },
        { status: 400 }
      );
    }

    await ensureSchema();
    const db = getTursoClient();

    const id = `USR-${Date.now().toString().slice(-4)}`;
    const createdAt = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO users (id, username, password, name, role, role_title, employee_id, phone, assigned_site_id, created_at, division)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        id,
        username.trim(),
        await hashPassword(password),
        name.trim(),
        role,
        role_title || `${role} Staff`,
        employee_id || `EMP-${Date.now().toString().slice(-4)}`,
        phone || '-',
        Number(assigned_site_id || 1),
        createdAt,
        division,
      ],
    });

    await audit(db, req, session, {
      action: 'create',
      entity_type: 'user',
      entity_id: id,
      entity_label: `${name} (${username.trim()})`,
      site_id: role === 'SUPERVISOR' ? Number(assigned_site_id) || null : null,
      summary: `Membuat akun ${role} untuk ${name}`,
      details: { username: username.trim(), role, role_title, employee_id, phone, assigned_site_id, division },
    });
    return NextResponse.json({ success: true, message: 'User berhasil dibuat.', id });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}


/** Admin: switch a technician between divisi IT and Teknik. */
export async function PATCH(req: Request) {
  try {
    const auth = requireSession(req, 'user.manage');
    if (auth.error) return auth.error;
    const { id, division } = await req.json();
    if (typeof id !== 'string' || (division !== 'IT' && division !== 'TEKNIK')) {
      return NextResponse.json({ success: false, message: 'Data divisi tidak valid.' }, { status: 400 });
    }
    await ensureSchema();
    const db = getTursoClient();
    const prev = await db.execute({ sql: 'SELECT name, role, division FROM users WHERE id = ? LIMIT 1;', args: [id] });
    if (!prev.rows.length) return NextResponse.json({ success: false, message: 'Pengguna tidak ditemukan.' }, { status: 404 });
    if (String(prev.rows[0].role) !== 'TECHNICIAN') {
      return NextResponse.json({ success: false, message: 'Divisi hanya berlaku untuk akun Teknisi.' }, { status: 400 });
    }
    await db.execute({ sql: 'UPDATE users SET division = ? WHERE id = ?;', args: [division, id] });
    await audit(db, req, auth.session, {
      action: 'update',
      entity_type: 'user',
      entity_id: id,
      entity_label: String(prev.rows[0].name),
      summary: `Divisi teknisi diubah: ${String(prev.rows[0].division || 'IT')} → ${division}`,
      details: { division },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
