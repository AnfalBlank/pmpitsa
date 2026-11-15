import { NextResponse } from 'next/server';
import { initTursoDatabase, getTursoClient } from '@/lib/turso';

export async function GET() {
  try {
    const initResult = await initTursoDatabase();
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

export async function POST() {
  return GET();
}

