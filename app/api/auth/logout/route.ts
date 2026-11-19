import { NextResponse } from 'next/server';
import { clearSessionCookie, getSession } from '@/lib/session';
import { getTursoClient, ensureSchema } from '@/lib/turso';
import { audit } from '@/lib/audit';

export async function POST(req: Request) {
  const session = getSession(req);
  if (session) {
    try {
      await ensureSchema();
      await audit(getTursoClient(), req, session, { action: 'logout', entity_type: 'auth', entity_id: session.id, summary: 'Keluar dari aplikasi' });
    } catch {}
  }
  const res = NextResponse.json({ success: true, message: 'Berhasil keluar.' });
  clearSessionCookie(res);
  return res;
}
