import { NextResponse } from 'next/server';
import { getTursoClient, initTursoDatabase } from '@/lib/turso';

export async function GET() {
  try {
    await initTursoDatabase();
    const db = getTursoClient();
    const res = await db.execute('SELECT id, username, name, role, role_title, employee_id, phone, assigned_site_id, created_at FROM users ORDER BY id ASC;');

    const users = res.rows.map(row => ({
      id: String(row.id),
      username: String(row.username),
      name: String(row.name),
      role: String(row.role),
      roleTitle: String(row.role_title),
      employeeId: String(row.employee_id),
      phone: String(row.phone),
      assignedSiteId: Number(row.assigned_site_id || 1),
      createdAt: String(row.created_at || ''),
    }));

    return NextResponse.json({ success: true, users });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, name, role, role_title, employee_id, phone, assigned_site_id } = body;

    if (!username || !password || !name || !role) {
      return NextResponse.json(
        { success: false, message: 'Field username, password, nama, dan role wajib diisi.' },
        { status: 400 }
      );
    }

    await initTursoDatabase();
    const db = getTursoClient();

    const id = `USR-${Date.now().toString().slice(-4)}`;
    const createdAt = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO users (id, username, password, name, role, role_title, employee_id, phone, assigned_site_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        id,
        username.trim(),
        password,
        name.trim(),
        role,
        role_title || `${role} Staff`,
        employee_id || `EMP-${Date.now().toString().slice(-4)}`,
        phone || '-',
        Number(assigned_site_id || 1),
        createdAt,
      ],
    });

    return NextResponse.json({ success: true, message: 'User berhasil dibuat.', id });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

