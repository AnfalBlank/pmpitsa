import { NextResponse } from 'next/server';
import { requireSession, forbidden } from '@/lib/session';
import { siteScope } from '@/lib/rbac';
import { getTursoClient, ensureSchema } from '@/lib/turso';
import { SPBUTicket } from '@/lib/types';

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
              reported_at, assigned_to
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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
    };

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

    await db.execute({
      sql: 'DELETE FROM tickets WHERE id = ?;',
      args: [id],
    });

    return NextResponse.json({ success: true, message: `Tiket ${id} berhasil dihapus.` });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

