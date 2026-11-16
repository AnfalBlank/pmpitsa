import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** Lets the client check whether its server session is still valid. */
export async function GET(req: Request) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json({ success: false, code: 'UNAUTHENTICATED' }, { status: 401 });
  }
  return NextResponse.json({ success: true, session });
}
