import { NextResponse } from 'next/server';
import { getTursoClient, initTursoDatabase } from '@/lib/turso';
import { MaintenancePlan } from '@/lib/types';

export async function GET(req: Request) {
  try {
    await initTursoDatabase();
    const db = getTursoClient();

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('site_id');
    const status = searchParams.get('status');

    let query = 'SELECT * FROM maintenance_plans WHERE 1=1';
    const args: any[] = [];

    if (siteId && siteId !== 'ALL') {
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
    await initTursoDatabase();
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
        site_code || 'PITL',
        site_name || 'SPBU Pertamina',
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
      site_code: site_code || 'PITL',
      site_name: site_name || 'SPBU Pertamina',
      terminal_id: terminal_id || 'POS-01 & ISLANDS',
      plan_type: plan_type || 'PREVENTIVE_MAINTENANCE',
      scheduled_date,
      assigned_technician: assigned_technician || 'Teknisi Standby',
      supervisor_pws: supervisor_pws || 'Pengawas Site',
      status: planStatus,
      notes: notes || '',
    };

    return NextResponse.json({ success: true, message: 'Jadwal PM berhasil disimpan.', plan: newPlan });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await initTursoDatabase();
    const db = getTursoClient();

    const body = await req.json();
    const { id, status, notes, assigned_technician, scheduled_date } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID rencana wajib disertakan.' }, { status: 400 });
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

    return NextResponse.json({ success: true, message: 'Jadwal pemeliharaan berhasil diperbarui.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await initTursoDatabase();
    const db = getTursoClient();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID rencana wajib disertakan.' }, { status: 400 });
    }

    await db.execute({
      sql: 'DELETE FROM maintenance_plans WHERE id = ?;',
      args: [id],
    });

    return NextResponse.json({ success: true, message: `Rencana jadwal ${id} berhasil dihapus.` });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

