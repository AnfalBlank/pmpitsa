import { NextResponse } from 'next/server';
import { audit } from '@/lib/audit';
import { notify } from '@/lib/notify';
import { requireSession } from '@/lib/session';
import { siteScope } from '@/lib/rbac';
import { getTursoClient, ensureSchema } from '@/lib/turso';
import { MaintenancePlan, WorkType } from '@/lib/types';
import { planDivision } from '@/lib/schedule';
import { WORK_TYPE_SHORT } from '@/lib/work-type';
import type { Client } from '@libsql/client';

/**
 * Technicians to notify about a plan: the assigned one when the name matches a
 * registered technician, otherwise every technician of the plan's division.
 * Returns an error when the assigned technician belongs to another division.
 */
async function planRecipients(db: Client, technician: string | undefined, type: WorkType): Promise<{ ids: string[]; error?: string }> {
  const division = planDivision(type);
  const res = await db.execute("SELECT id, name, COALESCE(division, 'IT') AS division FROM users WHERE role = 'TECHNICIAN';");
  const lower = String(technician || '').toLowerCase();
  const match = lower ? res.rows.find((r) => lower.includes(String(r.name).toLowerCase())) : undefined;
  if (match) {
    if (division && String(match.division) !== division) {
      return { ids: [], error: `${String(match.name)} adalah teknisi divisi ${String(match.division) === 'TEKNIK' ? 'Teknik' : 'IT'}, sedangkan ${WORK_TYPE_SHORT[type]} dikerjakan divisi ${division === 'TEKNIK' ? 'Teknik' : 'IT'}.` };
    }
    return { ids: [String(match.id)] };
  }
  return { ids: res.rows.filter((r) => !division || String(r.division) === division).map((r) => String(r.id)) };
}

const typeWord = (t: string) => WORK_TYPE_SHORT[t as WorkType] || 'PM';

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

    let query = 'SELECT * FROM maintenance_plans WHERE 1=1';
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

    query += ' ORDER BY scheduled_date ASC;';

    const res = await db.execute({ sql: query, args });

    const plans: MaintenancePlan[] = res.rows.map(row => ({
      id: String(row.id),
      site_id: Number(row.site_id),
      site_code: String(row.site_code),
      site_name: String(row.site_name),
      terminal_id: String(row.terminal_id),
      plan_type: row.plan_type as any,
      scheduled_date: String(row.scheduled_date),
      assigned_technician: String(row.assigned_technician),
      supervisor_pws: String(row.supervisor_pws),
      status: row.status as any,
      notes: String(row.notes || ''),
    }));

    return NextResponse.json({ success: true, plans });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = requireSession(req, 'plan.create');
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
      plan_type,
      scheduled_date,
      assigned_technician,
      supervisor_pws,
      status,
      notes,
    } = body;

    if (!site_id || !scheduled_date) {
      return NextResponse.json(
        { success: false, message: 'Field site SPBU dan tanggal jadwal wajib diisi.' },
        { status: 400 }
      );
    }

    // Site code / name always come from Data SPBU (the client copy may be stale or missing)
    const siteRow = await db.execute({ sql: 'SELECT site_code, site_name FROM sites WHERE id = ? LIMIT 1;', args: [Number(site_id)] });
    if (!siteRow.rows.length) {
      return NextResponse.json({ success: false, message: 'SPBU tidak ditemukan di Data SPBU.' }, { status: 400 });
    }
    const siteCode = String(siteRow.rows[0].site_code);
    const siteName = String(siteRow.rows[0].site_name);
    const recipients = await planRecipients(db, assigned_technician, (plan_type || 'PREVENTIVE_MAINTENANCE') as WorkType);
    if (recipients.error) return NextResponse.json({ success: false, message: recipients.error }, { status: 400 });
    const id = body.id || `PLAN-${Date.now()}`;
    const planStatus = status || 'Terjadwal';

    await db.execute({
      sql: `INSERT INTO maintenance_plans (
              id, site_id, site_code, site_name, terminal_id, plan_type,
              scheduled_date, assigned_technician, supervisor_pws, status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        id,
        Number(site_id),
        siteCode,
        siteName,
        terminal_id || 'POS-01 & ISLANDS',
        plan_type || 'PREVENTIVE_MAINTENANCE',
        scheduled_date,
        assigned_technician || 'Teknisi Standby',
        supervisor_pws || 'Pengawas Site',
        planStatus,
        notes || '',
      ],
    });

    const newPlan: MaintenancePlan = {
      id,
      site_id: Number(site_id),
      site_code: siteCode,
      site_name: siteName,
      terminal_id: terminal_id || 'POS-01 & ISLANDS',
      plan_type: plan_type || 'PREVENTIVE_MAINTENANCE',
      scheduled_date,
      assigned_technician: assigned_technician || 'Teknisi Standby',
      supervisor_pws: supervisor_pws || 'Pengawas Site',
      status: planStatus,
      notes: notes || '',
    };

    await audit(db, req, session, {
      action: 'create',
      entity_type: 'plan',
      entity_id: id,
      entity_label: `Jadwal ${scheduled_date} · ${siteCode}`,
      site_id: Number(site_id),
      summary: `Membuat jadwal ${plan_type} tanggal ${scheduled_date} untuk ${siteName}`,
      details: { technician: assigned_technician, supervisor: supervisor_pws, terminal_id },
    });

    const techIds = recipients.ids;
    await notify(
      db,
      {
        type: 'plan.new',
        title: `Jadwal ${typeWord(plan_type)} baru: ${siteCode}`,
        message: `${scheduled_date} · ${siteName} · Teknisi: ${assigned_technician || '-'}`,
        link_module: 'schedule',
        link_id: id,
        actor_id: session.id,
      },
      [...techIds.map((userId) => ({ userId })), { role: 'SUPERVISOR', siteId: Number(site_id) }]
    );

    return NextResponse.json({ success: true, message: 'Jadwal PM berhasil disimpan.', plan: newPlan });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = requireSession(req);
    if (auth.error) return auth.error;
    const session = auth.session;
    await ensureSchema();
    const db = getTursoClient();

    const body = await req.json();
    const { id, status, notes, assigned_technician, scheduled_date } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID rencana wajib disertakan.' }, { status: 400 });
    }

    const before = await db.execute({
      sql: 'SELECT site_id, site_code, site_name, plan_type, scheduled_date, status, notes, assigned_technician FROM maintenance_plans WHERE id = ? LIMIT 1;',
      args: [id],
    });
    const old = before.rows[0];
    const reassigned = !!old && !!assigned_technician && assigned_technician !== old.assigned_technician;
    if (reassigned) {
      const chk = await planRecipients(db, assigned_technician, String(old.plan_type) as WorkType);
      if (chk.error) return NextResponse.json({ success: false, message: chk.error }, { status: 400 });
    }

    await db.execute({
      sql: `UPDATE maintenance_plans 
            SET status = COALESCE(?, status),
                notes = COALESCE(?, notes),
                assigned_technician = COALESCE(?, assigned_technician),
                scheduled_date = COALESCE(?, scheduled_date)
            WHERE id = ?;`,
      args: [status || null, notes || null, assigned_technician || null, scheduled_date || null, id],
    });

    if (old) {
      const next: Record<string, unknown> = { status, notes, assigned_technician, scheduled_date };
      const changes = Object.entries(next)
        .filter(([k, v]) => v !== undefined && v !== null && v !== '' && v !== (old as any)[k])
        .map(([k, v]) => ({ field: k, from: (old as any)[k], to: v }));
      await audit(db, req, session, {
        action: 'update',
        entity_type: 'plan',
        entity_id: id,
        entity_label: `Jadwal ${old.scheduled_date} · ${old.site_code}`,
        site_id: Number(old.site_id),
        summary: changes.length ? changes.map((c) => `${c.field}: ${c.from ?? '-'} → ${c.to}`).join(' · ') : 'Jadwal disimpan tanpa perubahan',
        details: { changes },
      });

      // Tell the technician(s) about a new assignment or a moved date
      const moved = !!scheduled_date && scheduled_date !== old.scheduled_date;
      if (reassigned || moved) {
        const tech = String(assigned_technician || old.assigned_technician || '');
        const { ids } = await planRecipients(db, tech, String(old.plan_type) as WorkType);
        const date = String(scheduled_date || old.scheduled_date);
        await notify(
          db,
          {
            type: 'plan.update',
            title: reassigned ? `Anda dijadwalkan ${typeWord(String(old.plan_type))}: ${old.site_code}` : `Jadwal ${typeWord(String(old.plan_type))} ${old.site_code} diubah`,
            message: `${date} · ${old.site_name} · Teknisi: ${tech || '-'}${moved ? ` (sebelumnya ${old.scheduled_date})` : ''}`,
            link_module: 'schedule',
            link_id: String(id),
            actor_id: session.id,
          },
          [...ids.map((userId) => ({ userId })), { role: 'SUPERVISOR', siteId: Number(old.site_id) }]
        );
      }
    }

    return NextResponse.json({ success: true, message: 'Jadwal pemeliharaan berhasil diperbarui.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = requireSession(req, 'plan.delete');
    if (auth.error) return auth.error;
    const session = auth.session;
    await ensureSchema();
    const db = getTursoClient();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID rencana wajib disertakan.' }, { status: 400 });
    }

    const gone = await db.execute({ sql: 'SELECT site_id, site_code, scheduled_date, plan_type, assigned_technician, status FROM maintenance_plans WHERE id = ? LIMIT 1;', args: [id] });

    await db.execute({
      sql: 'DELETE FROM maintenance_plans WHERE id = ?;',
      args: [id],
    });

    {
      const g = gone.rows[0];
      await audit(db, req, session, {
        action: 'delete',
        entity_type: 'plan',
        entity_id: id,
        entity_label: g ? `Jadwal ${g.scheduled_date} · ${g.site_code}` : id,
        site_id: g ? Number(g.site_id) : null,
        summary: g ? `Menghapus jadwal ${g.plan_type} (${g.status})` : 'Menghapus jadwal',
        details: g ? { technician: g.assigned_technician } : undefined,
      });
    }

    return NextResponse.json({ success: true, message: `Rencana jadwal ${id} berhasil dihapus.` });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

