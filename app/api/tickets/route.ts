import { NextResponse } from 'next/server';
import { audit } from '@/lib/audit';
import { notify, userIdsMentioned } from '@/lib/notify';
import { requireSession, forbidden } from '@/lib/session';
import { siteScope } from '@/lib/rbac';
import { getTursoClient, ensureSchema } from '@/lib/turso';
import { SPBUTicket, TechDivision } from '@/lib/types';
import { asDivision, categoryAllowed, DIVISION_SHORT } from '@/lib/tickets';
import type { Client } from '@libsql/client';

/**
 * The technician named in `assigned` must be registered and belong to the ticket's division.
 * Returns an error message, or null when OK.
 */
async function checkAssignee(db: Client, assigned: string, division: TechDivision): Promise<string | null> {
  const res = await db.execute("SELECT name, COALESCE(division, 'IT') AS division FROM users WHERE role = 'TECHNICIAN';");
  const lower = assigned.toLowerCase();
  const match = res.rows.find((r) => lower.includes(String(r.name).toLowerCase()));
  if (!match) return `Teknisi "${assigned}" tidak terdaftar.`;
  if (String(match.division) !== division) {
    return `${String(match.name)} adalah teknisi divisi ${DIVISION_SHORT[String(match.division) as TechDivision] || 'IT'}, sedangkan tiket ini untuk divisi ${DIVISION_SHORT[division]}.`;
  }
  return null;
}

/** Technicians of one division (to notify about an unassigned ticket). */
async function divisionTechIds(db: Client, division: TechDivision): Promise<string[]> {
  const res = await db.execute({ sql: "SELECT id FROM users WHERE role = 'TECHNICIAN' AND COALESCE(division, 'IT') = ?;", args: [division] });
  return res.rows.map((r) => String(r.id));
}

export async function GET(req: Request) {
  try {
    const auth = requireSession(req);
    if (auth.error) return auth.error;
    const session = auth.session;
    const scope = siteScope(session);
    await ensureSchema();
    const db = getTursoClient();

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('site_id');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = 'SELECT * FROM tickets WHERE 1=1';
    const args: any[] = [];

    if (scope !== null) {
      // Supervisor: always restricted to own SPBU regardless of query params
      query += ' AND site_id = ?';
      args.push(scope);
    } else if (siteId && siteId !== 'ALL') {
      query += ' AND site_id = ?';
      args.push(Number(siteId));
    }

    if (session.role === 'TECHNICIAN') {
      // Technicians see tickets of their own division, plus any assigned to them
      query += " AND (COALESCE(division, 'IT') = ? OR LOWER(COALESCE(assigned_to, '')) LIKE ?)";
      args.push(session.division || 'IT', `%${session.name.toLowerCase()}%`);
    }

    if (status && status !== 'ALL') {
      query += ' AND status = ?';
      args.push(status);
    }

    if (search) {
      query += ' AND (LOWER(ticket_number) LIKE ? OR LOWER(title) LIKE ? OR LOWER(site_name) LIKE ? OR LOWER(reported_by) LIKE ?)';
      const term = `%${search.toLowerCase()}%`;
      args.push(term, term, term, term);
    }

    query += ' ORDER BY reported_at DESC;';

    const res = await db.execute({ sql: query, args });

    const tickets: SPBUTicket[] = res.rows.map(row => ({
      id: String(row.id),
      ticket_number: String(row.ticket_number),
      site_id: Number(row.site_id),
      site_code: String(row.site_code),
      site_name: String(row.site_name),
      terminal_id: String(row.terminal_id),
      category: row.category as any,
      priority: row.priority as any,
      status: row.status as any,
      title: String(row.title),
      description: String(row.description),
      reported_by: String(row.reported_by),
      reported_at: String(row.reported_at),
      assigned_to: row.assigned_to ? String(row.assigned_to) : undefined,
      resolved_at: row.resolved_at ? String(row.resolved_at) : undefined,
      resolution_notes: row.resolution_notes ? String(row.resolution_notes) : undefined,
      division: String(row.division || 'IT') === 'TEKNIK' ? 'TEKNIK' : 'IT',
    }));

    return NextResponse.json({ success: true, tickets });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = requireSession(req, 'ticket.create');
    if (auth.error) return auth.error;
    const session = auth.session;
    await ensureSchema();
    const db = getTursoClient();

    const body = await req.json();
    const {
      site_id,
      site_code,
      site_name,
      terminal_id,
      category,
      priority,
      status,
      title,
      description,
      reported_by,
      assigned_to,
    } = body;

    if (!title || !description || !site_id) {
      return NextResponse.json(
        { success: false, message: 'Field judul, deskripsi, dan site SPBU wajib diisi.' },
        { status: 400 }
      );
    }

    const division: TechDivision = asDivision(body.division) || 'IT';
    if (category && !categoryAllowed(division, category)) {
      return NextResponse.json({ success: false, message: `Kategori "${category}" tidak tersedia untuk divisi ${DIVISION_SHORT[division]}.` }, { status: 400 });
    }
    if (assigned_to) {
      const err = await checkAssignee(db, String(assigned_to), division);
      if (err) return NextResponse.json({ success: false, message: err }, { status: 400 });
    }

    const scope = siteScope(session);
    if (scope !== null && Number(site_id) !== scope) {
      return forbidden('Akses ditolak: Pengawas hanya dapat membuat tiket untuk SPBU yang ditugaskan.');
    }

    // Site code / name always come from Data SPBU (the client copy may be stale or missing)
    const siteRow = await db.execute({ sql: 'SELECT site_code, site_name FROM sites WHERE id = ? LIMIT 1;', args: [Number(site_id)] });
    if (!siteRow.rows.length) {
      return NextResponse.json({ success: false, message: 'SPBU tidak ditemukan di Data SPBU.' }, { status: 400 });
    }
    const siteCode = String(siteRow.rows[0].site_code);
    const siteName = String(siteRow.rows[0].site_name);
    const id = `TIK-${Date.now()}`;
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticket_number = body.ticket_number || `TIK-PITL-${year}-${randomSuffix}`;
    const reported_at = body.reported_at || new Date().toISOString().replace('T', ' ').substring(0, 16);
    const initialStatus = status || 'Open (Menunggu)';

    await db.execute({
      sql: `INSERT INTO tickets (
              id, ticket_number, site_id, site_code, site_name, terminal_id,
              category, priority, status, title, description, reported_by,
              reported_at, assigned_to, division
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        id,
        ticket_number,
        Number(site_id),
        siteCode,
        siteName,
        terminal_id || 'POS-01',
        category || 'Dispenser & Forecourt',
        priority || 'Sedang',
        initialStatus,
        title,
        description,
        reported_by || 'Staf SPBU',
        reported_at,
        assigned_to || null,
        division,
      ],
    });

    const newTicket: SPBUTicket = {
      id,
      ticket_number,
      site_id: Number(site_id),
      site_code: siteCode,
      site_name: siteName,
      terminal_id: terminal_id || 'POS-01',
      category: category || 'Dispenser & Forecourt',
      priority: priority || 'Sedang',
      status: initialStatus,
      title,
      description,
      reported_by: reported_by || 'Staf SPBU',
      reported_at,
      assigned_to: assigned_to || undefined,
      division,
    };

    await audit(db, req, session, {
      action: 'create',
      entity_type: 'ticket',
      entity_id: id,
      entity_label: `${ticket_number} · ${siteCode}`,
      site_id: Number(site_id),
      summary: `Membuat tiket "${title}" (${priority || 'Sedang'})`,
      details: { division, category, priority, terminal_id, assigned_to: assigned_to || null, reported_by: reported_by || null },
    });

    // Notify Admin, the assigned technician (or that division's technicians) and the SPBU's Pengawas
    const assignedIds = assigned_to ? await userIdsMentioned(db, assigned_to, 'TECHNICIAN') : await divisionTechIds(db, division);
    await notify(
      db,
      {
        type: 'ticket.new',
        title: `Tiket ${DIVISION_SHORT[division]} baru ${ticket_number}${priority === 'Darurat' ? ' (DARURAT)' : ''}`,
        message: `${siteCode} · ${priority || 'Sedang'} · ${title}`,
        link_module: 'tickets',
        link_id: id,
        actor_id: session.id,
      },
      [
        { role: 'ADMIN' },
        ...assignedIds.map((userId) => ({ userId })),
        { role: 'SUPERVISOR', siteId: Number(site_id) },
      ]
    );

    return NextResponse.json({ success: true, message: 'Tiket kendala berhasil dibuat.', ticket: newTicket });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = requireSession(req, 'ticket.update');
    if (auth.error) return auth.error;
    const session = auth.session;
    await ensureSchema();
    const db = getTursoClient();

    const body = await req.json();
    const { id, status, resolution_notes, assigned_to } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID tiket wajib disertakan.' }, { status: 400 });
    }

    const before = await db.execute({
      sql: "SELECT ticket_number, title, site_id, site_code, status, assigned_to, COALESCE(division, 'IT') AS division FROM tickets WHERE id = ? LIMIT 1;",
      args: [id],
    });
    const old = before.rows[0];
    if (!old) return NextResponse.json({ success: false, message: 'Tiket tidak ditemukan.' }, { status: 404 });
    const ticketDiv = String(old.division) === 'TEKNIK' ? 'TEKNIK' : 'IT';

    if (assigned_to && assigned_to !== old.assigned_to) {
      // Only Admin assigns; a technician may only take the ticket for themself
      if (session.role !== 'ADMIN' && !String(assigned_to).toLowerCase().includes(session.name.toLowerCase())) {
        return forbidden('Hanya Admin yang dapat menugaskan teknisi lain.');
      }
      const err = await checkAssignee(db, String(assigned_to), ticketDiv);
      if (err) return NextResponse.json({ success: false, message: err }, { status: 400 });
    }

    const resolved_at = status === 'Selesai (Resolved)' 
      ? new Date().toISOString().replace('T', ' ').substring(0, 16) 
      : null;

    await db.execute({
      sql: `UPDATE tickets 
            SET status = COALESCE(?, status),
                resolution_notes = COALESCE(?, resolution_notes),
                assigned_to = COALESCE(?, assigned_to),
                resolved_at = CASE WHEN ? = 'Selesai (Resolved)' THEN COALESCE(resolved_at, ?) ELSE resolved_at END
            WHERE id = ?;`,
      args: [status || null, resolution_notes || null, assigned_to || null, status || '', resolved_at, id],
    });

    if (old) {
      const changes: { field: string; from: unknown; to: unknown }[] = [];
      if (status && status !== old.status) changes.push({ field: 'status', from: old.status, to: status });
      if (assigned_to && assigned_to !== old.assigned_to) changes.push({ field: 'assigned_to', from: old.assigned_to, to: assigned_to });
      if (resolution_notes) changes.push({ field: 'resolution_notes', from: null, to: String(resolution_notes).slice(0, 300) });
      await audit(db, req, session, {
        action: 'update',
        entity_type: 'ticket',
        entity_id: id,
        entity_label: `${old.ticket_number} · ${old.site_code}`,
        site_id: Number(old.site_id),
        summary: changes.length ? changes.map((c) => (c.field === 'resolution_notes' ? 'catatan penanganan ditambah' : `${c.field}: ${c.from ?? '-'} → ${c.to}`)).join(' · ') : 'Tiket disimpan tanpa perubahan',
        details: { changes },
      });

      const newAssignee = assigned_to && assigned_to !== old.assigned_to ? String(assigned_to) : '';
      const statusChanged = status && status !== old.status;
      const base = { link_module: 'tickets' as const, link_id: String(id), actor_id: session.id };
      if (newAssignee) {
        const ids = await userIdsMentioned(db, newAssignee, 'TECHNICIAN');
        await notify(
          db,
          { ...base, type: 'ticket.assigned', title: `Anda ditugaskan ke tiket ${old.ticket_number}`, message: `${old.site_code} · ${old.title}` },
          ids.map((userId) => ({ userId }))
        );
      }
      if (statusChanged) {
        const techIds = await userIdsMentioned(db, newAssignee || String(old.assigned_to || ''), 'TECHNICIAN');
        await notify(
          db,
          { ...base, type: 'ticket.update', title: `Tiket ${old.ticket_number}: ${status}`, message: `${old.site_code} · ${old.title}` },
          [{ role: 'SUPERVISOR', siteId: Number(old.site_id) }, { role: 'ADMIN' }, ...techIds.map((userId) => ({ userId }))]
        );
      }
    }

    return NextResponse.json({ success: true, message: 'Tiket berhasil diperbarui.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = requireSession(req, 'ticket.delete');
    if (auth.error) return auth.error;
    const session = auth.session;
    await ensureSchema();
    const db = getTursoClient();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID tiket wajib disertakan.' }, { status: 400 });
    }

    const gone = await db.execute({ sql: 'SELECT ticket_number, title, site_id, site_code, status, priority FROM tickets WHERE id = ? LIMIT 1;', args: [id] });

    await db.execute({
      sql: 'DELETE FROM tickets WHERE id = ?;',
      args: [id],
    });

    {
      const g = gone.rows[0];
      await audit(db, req, session, {
        action: 'delete',
        entity_type: 'ticket',
        entity_id: id,
        entity_label: g ? `${g.ticket_number} · ${g.site_code}` : id,
        site_id: g ? Number(g.site_id) : null,
        summary: g ? `Menghapus tiket "${g.title}" (${g.status})` : 'Menghapus tiket',
        details: g ? { priority: g.priority, status: g.status } : undefined,
      });
    }

    return NextResponse.json({ success: true, message: `Tiket ${id} berhasil dihapus.` });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

