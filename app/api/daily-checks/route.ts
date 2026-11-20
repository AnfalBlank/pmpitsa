import { NextResponse } from 'next/server';
import { requireSession, forbidden } from '@/lib/session';
import { siteScope } from '@/lib/rbac';
import { getTursoClient, ensureSchema } from '@/lib/turso';
import { DAILY_CHECK_ITEMS, DailyCheck, DailyCheckAnswer, todayDili } from '@/lib/daily-checklist';
import { notify } from '@/lib/notify';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';

function rowToCheck(r: any): DailyCheck {
  const parse = (v: unknown, d: any) => {
    try {
      return v ? JSON.parse(String(v)) : d;
    } catch {
      return d;
    }
  };
  return {
    id: String(r.id),
    site_id: Number(r.site_id),
    site_code: String(r.site_code),
    site_name: String(r.site_name),
    check_date: String(r.check_date),
    submitted_by_id: String(r.submitted_by_id),
    submitted_by_name: String(r.submitted_by_name),
    submitted_at: String(r.submitted_at),
    status: r.status === 'ISSUE' ? 'ISSUE' : 'OK',
    items: parse(r.items, []),
    ticket_numbers: parse(r.ticket_numbers, []),
  };
}

/** GET /api/daily-checks?date=YYYY-MM-DD — Pengawas: own SPBU; Admin/Teknisi: every SPBU */
export async function GET(req: Request) {
  try {
    const auth = requireSession(req);
    if (auth.error) return auth.error;
    await ensureSchema();
    const db = getTursoClient();
    const date = new URL(req.url).searchParams.get('date') || todayDili();
    const scope = siteScope(auth.session);
    const res = await db.execute({
      sql: `SELECT * FROM daily_checks WHERE check_date = ? ${scope !== null ? 'AND site_id = ?' : ''} ORDER BY site_id;`,
      args: scope !== null ? [date, scope] : [date],
    });
    return NextResponse.json({ success: true, date, checks: res.rows.map(rowToCheck) });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/**
 * POST /api/daily-checks { items: [{key, ok, note}], create_tickets: string[] }
 * Saves today's checklist for the Pengawas' own SPBU (re-submitting the same day replaces it)
 * and opens a ticket for every problem item chosen in create_tickets.
 */
export async function POST(req: Request) {
  try {
    const auth = requireSession(req, 'daily.submit');
    if (auth.error) return auth.error;
    const s = auth.session;
    const siteId = Number(s.assignedSiteId || 0);
    if (!siteId) return forbidden('Akun Pengawas belum ditugaskan ke SPBU.');
    await ensureSchema();
    const db = getTursoClient();

    const body = await req.json().catch(() => ({}));
    const given: DailyCheckAnswer[] = Array.isArray(body.items) ? body.items : [];
    const items: DailyCheckAnswer[] = DAILY_CHECK_ITEMS.map((def) => {
      const a = given.find((g) => g?.key === def.key);
      return { key: def.key, ok: a?.ok === true, note: a && a.ok !== true ? String(a.note || '').trim().slice(0, 500) : undefined };
    });
    const answered = DAILY_CHECK_ITEMS.every((def) => given.some((g) => g?.key === def.key && typeof g.ok === 'boolean'));
    if (!answered) {
      return NextResponse.json({ success: false, message: 'Semua item checklist wajib diisi (Baik / Bermasalah).' }, { status: 400 });
    }

    const siteRow = await db.execute({ sql: 'SELECT site_code, site_name FROM sites WHERE id = ? LIMIT 1;', args: [siteId] });
    if (!siteRow.rows.length) return NextResponse.json({ success: false, message: 'SPBU tidak ditemukan.' }, { status: 400 });
    const siteCode = String(siteRow.rows[0].site_code);
    const siteName = String(siteRow.rows[0].site_name);

    const date = todayDili();
    const problems = items.filter((i) => !i.ok);
    const wantTickets: string[] = Array.isArray(body.create_tickets) ? body.create_tickets.map(String) : [];

    // Tickets for the chosen problem items
    const ticketNumbers: string[] = [];
    const now = new Date();
    for (const p of problems.filter((p) => wantTickets.includes(p.key))) {
      const def = DAILY_CHECK_ITEMS.find((d) => d.key === p.key)!;
      const id = `TIK-${now.getTime()}-${p.key}`;
      const ticketNumber = `TIK-PITL-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const title = `Checklist harian: ${def.label}`.slice(0, 160);
      await db.execute({
        sql: `INSERT INTO tickets (id, ticket_number, site_id, site_code, site_name, terminal_id, category, priority, status, title, description, reported_by, reported_at, assigned_to, division)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          id,
          ticketNumber,
          siteId,
          siteCode,
          siteName,
          'POS-01',
          def.category,
          'Sedang',
          'Open (Menunggu)',
          title,
          `Ditemukan saat checklist kesiapan harian ${date}.${p.note ? ` Catatan Pengawas: ${p.note}` : ''}`,
          s.name,
          now.toISOString().replace('T', ' ').substring(0, 16),
          null,
          def.division,
        ],
      });
      ticketNumbers.push(ticketNumber);
      await notify(
        db,
        { type: 'ticket.new', title: `Tiket ${def.division === 'TEKNIK' ? 'Teknik' : 'IT'} baru ${ticketNumber}`, message: `${siteCode} · Sedang · ${def.label}`, link_module: 'tickets', link_id: id, actor_id: s.id },
        [
          { role: 'ADMIN' },
          ...(
            await db.execute({ sql: "SELECT id FROM users WHERE role = 'TECHNICIAN' AND COALESCE(division, 'IT') = ?;", args: [def.division] })
          ).rows.map((r) => ({ userId: String(r.id) })),
        ]
      );
      await audit(db, req, s, {
        action: 'create',
        entity_type: 'ticket',
        entity_id: id,
        entity_label: `${ticketNumber} · ${siteCode}`,
        site_id: siteId,
        summary: `Membuat tiket dari checklist harian: "${def.label}"`,
        details: { note: p.note || null, category: def.category },
      });
    }

    const check: DailyCheck = {
      id: `DC-${siteId}-${date}`,
      site_id: siteId,
      site_code: siteCode,
      site_name: siteName,
      check_date: date,
      submitted_by_id: s.id,
      submitted_by_name: s.name,
      submitted_at: now.toISOString(),
      status: problems.length ? 'ISSUE' : 'OK',
      items,
      ticket_numbers: ticketNumbers,
    };

    // Same day again: keep earlier tickets, replace the answers
    const prev = await db.execute({ sql: 'SELECT ticket_numbers FROM daily_checks WHERE id = ?;', args: [check.id] });
    if (prev.rows.length) {
      try {
        check.ticket_numbers = [...JSON.parse(String(prev.rows[0].ticket_numbers || '[]')), ...ticketNumbers];
      } catch {}
    }
    await db.execute({
      sql: `INSERT INTO daily_checks (id, site_id, site_code, site_name, check_date, submitted_by_id, submitted_by_name, submitted_at, status, items, ticket_numbers)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET submitted_by_id = excluded.submitted_by_id, submitted_by_name = excluded.submitted_by_name,
              submitted_at = excluded.submitted_at, status = excluded.status, items = excluded.items, ticket_numbers = excluded.ticket_numbers;`,
      args: [check.id, siteId, siteCode, siteName, date, s.id, s.name, check.submitted_at, check.status, JSON.stringify(items), JSON.stringify(check.ticket_numbers)],
    });

    await audit(db, req, s, {
      action: 'submit_checklist',
      entity_type: 'daily_check',
      entity_id: check.id,
      entity_label: `Checklist ${date} · ${siteCode}`,
      site_id: siteId,
      summary: problems.length
        ? `Checklist harian: ${problems.length} item bermasalah${ticketNumbers.length ? `, ${ticketNumbers.length} tiket dibuat` : ''}`
        : 'Checklist harian: semua baik',
      details: { items, tickets: ticketNumbers, resubmit: prev.rows.length > 0 },
    });
    if (problems.length) {
      await notify(
        db,
        {
          type: 'daily.issue',
          title: `Checklist harian ${siteCode}: ${problems.length} bermasalah`,
          message: problems.map((p) => DAILY_CHECK_ITEMS.find((d) => d.key === p.key)?.label).join(' · ').slice(0, 380),
          link_module: 'overview',
          actor_id: s.id,
        },
        [{ role: 'ADMIN' }]
      );
    }

    return NextResponse.json({
      success: true,
      message: problems.length ? 'Checklist tersimpan dengan temuan.' : 'Checklist tersimpan: semua baik.',
      check,
      ticket_numbers: ticketNumbers,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
