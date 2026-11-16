import { NextResponse } from 'next/server';
import { getTursoClient, ensureSchema } from '@/lib/turso';
import { createSessionToken, setSessionCookie } from '@/lib/session';
import { can } from '@/lib/rbac';
import { hashPassword, verifyPassword, dummyVerify } from '@/lib/password';
import { getClientIp, loginRetryAfter, recordLoginFailure, recordLoginSuccess } from '@/lib/rate-limit';

// Same message for unknown user and wrong password, so the response doesn't reveal which usernames exist.
const INVALID_CREDENTIALS = 'Username atau password salah. Silakan coba kembali.';

function invalidCredentials() {
  return NextResponse.json({ success: false, message: INVALID_CREDENTIALS }, { status: 401 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      return NextResponse.json(
        { success: false, message: 'Username dan password wajib diisi.' },
        { status: 400 }
      );
    }

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

    // Brute-force protection: checked before touching the database.
    const ip = getClientIp(req);
    const retryAfter = loginRetryAfter(ip, queryUsername);
    if (retryAfter > 0) {
      const minutes = Math.ceil(retryAfter / 60);
      return NextResponse.json(
        { success: false, code: 'RATE_LIMITED', message: `Terlalu banyak percobaan login gagal. Coba lagi dalam ${minutes} menit.` },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    await ensureSchema();
    const db = getTursoClient();

    const res = await db.execute({
      sql: 'SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(username) = LOWER(?) LIMIT 1;',
      args: [rawUsername, queryUsername],
    });

    if (res.rows.length === 0) {
      await dummyVerify(password);
      recordLoginFailure(ip, queryUsername);
      return invalidCredentials();
    }

    const row = res.rows[0];
    const { ok, needsRehash } = await verifyPassword(password, String(row.password ?? ''));

    if (!ok) {
      recordLoginFailure(ip, queryUsername);
      return invalidCredentials();
    }
    recordLoginSuccess(ip, queryUsername);

    // Migration: legacy plaintext (or outdated-parameter) passwords are replaced by a hash on first successful login.
    if (needsRehash) {
      try {
        await db.execute({
          sql: 'UPDATE users SET password = ? WHERE id = ?;',
          args: [await hashPassword(password), String(row.id)],
        });
      } catch (e) {
        console.error('Gagal memigrasi password ke hash untuk user', String(row.id), e);
      }
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
      { success: false, message: 'Terjadi kesalahan pada server login.' },
      { status: 500 }
    );
  }
}

