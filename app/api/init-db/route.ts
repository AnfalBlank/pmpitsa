import { NextResponse } from 'next/server';
import { initTursoDatabase, getTursoClient } from '@/lib/turso';
import { requireSession } from '@/lib/session';

/**
 * Creates the schema and seeds sample data into empty tables.
 * Requires an ADMIN session (`config.manage`). Outside production it may also
 * be called without a session, so a fresh local database can be bootstrapped
 * before any user exists.
 */
function authorize(req: Request): NextResponse | null {
  const auth = requireSession(req, 'config.manage');
  if (!auth.error) return null;
  if (process.env.NODE_ENV !== 'production' && auth.error.status === 401) return null;
  return auth.error;
}

async function handle(req: Request) {
  const denied = authorize(req);
  if (denied) return denied;

  try {
    const initResult = await initTursoDatabase();
    if (!initResult.success) {
      return NextResponse.json({ success: false, initResult }, { status: 500 });
    }
    const db = getTursoClient();

    const [users, sites, tickets, plans, reports] = await Promise.all([
      db.execute("SELECT COUNT(*) as count FROM users;"),
      db.execute("SELECT COUNT(*) as count FROM sites;"),
      db.execute("SELECT COUNT(*) as count FROM tickets;"),
      db.execute("SELECT COUNT(*) as count FROM maintenance_plans;"),
      db.execute("SELECT COUNT(*) as count FROM pm_reports;"),
    ]);

    return NextResponse.json({
      success: true,
      initResult,
      counts: {
        users: users.rows[0]?.count,
        sites: sites.rows[0]?.count,
        tickets: tickets.rows[0]?.count,
        plans: plans.rows[0]?.count,
        reports: reports.rows[0]?.count,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
