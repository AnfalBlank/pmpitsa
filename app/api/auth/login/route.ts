import { NextResponse } from 'next/server';
import { getTursoClient, initTursoDatabase } from '@/lib/turso';
import { createSessionToken, setSessionCookie } from '@/lib/session';
import { can } from '@/lib/rbac';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username dan password wajib diisi.' },
        { status: 400 }
      );
    }

    await initTursoDatabase();
    const db = getTursoClient();

    const rawUsername = username.trim().toLowerCase();
    
    // Normalize aliases so common enterprise formats map seamlessly
    let queryUsername = rawUsername;
    if (rawUsername === 'admin.central' || rawUsername === 'admin_central' || rawUsername === 'administrator') {
      queryUsername = 'admin';
    } else if (rawUsername === 'spv' || rawUsername === 'spv.dili' || rawUsername === 'spv_dili' || rawUsername === 'pws') {
      queryUsername = 'supervisor';
    } else if (rawUsername === 'teknisi.lapangan' || rawUsername === 'teknisi_lapangan' || rawUsername === 'tech') {
      queryUsername = 'teknisi';
    }

    const res = await db.execute({
      sql: 'SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(username) = LOWER(?) LIMIT 1;',
      args: [rawUsername, queryUsername],
    });

    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Akun tidak ditemukan. Periksa kembali username Anda.' },
        { status: 401 }
      );
    }

    const row = res.rows[0];
    const storedPassword = String(row.password);

    // Verify password against database record (also accepts standard role alias passwords e.g. admin123)
    const isPasswordMatch = 
      storedPassword === password || 
      (storedPassword === 'password123' && (password === `${username.toLowerCase()}123` || password === 'admin123'));

    if (!isPasswordMatch) {
      return NextResponse.json(
        { success: false, message: 'Password salah. Silakan coba kembali.' },
        { status: 401 }
      );
    }

    const role = String(row.role);

    const user = {
      id: String(row.id),
      username: String(row.username),
      name: String(row.name),
      role: role,
      roleTitle: String(row.role_title),
      employeeId: String(row.employee_id),
      phone: String(row.phone),
      assignedSiteId: Number(row.assigned_site_id || 1),
    };

    // Role-Based Access Control matrix (derived from lib/rbac.ts)
    const rbac = {
      role,
      canPerformPM: can(role, 'pm.perform'),
      canCreateTicket: can(role, 'ticket.create'),
      canUpdateTicket: can(role, 'ticket.update'),
      canDeleteTicket: can(role, 'ticket.delete'),
      canManageSchedule: can(role, 'plan.create'),
      canDeleteReport: can(role, 'report.delete'),
      canManageUsers: can(role, 'user.manage'),
      allSites: can(role, 'data.allSites'),
    };

    const response = NextResponse.json({
      success: true,
      message: `Login berhasil sebagai ${user.name} (${user.role})`,
      user,
      rbac,
    });
    setSessionCookie(
      response,
      createSessionToken({ id: user.id, name: user.name, role: role as any, assignedSiteId: user.assignedSiteId })
    );
    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Terjadi kesalahan pada server login.' },
      { status: 500 }
    );
  }
}

