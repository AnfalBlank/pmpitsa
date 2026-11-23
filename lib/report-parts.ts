/**
 * Server-only. Large BA data (photos, signatures) is uploaded in small chunks
 * (POST /api/reports/parts) so no single request exceeds the hosting body limit.
 * The BA itself then carries "part:<id>" references that are resolved here.
 */
import type { Client } from '@libsql/client';
import type { PMReport } from './types';

export const PART_PREFIX = 'part:';
const isRef = (v: unknown): v is string => typeof v === 'string' && v.startsWith(PART_PREFIX);

async function loadPart(db: Client, reportId: string, partId: string, userId: string): Promise<string | null> {
  const res = await db.execute({
    sql: 'SELECT idx, total, data FROM report_parts WHERE report_id = ? AND part_id = ? AND user_id = ? ORDER BY idx ASC;',
    args: [reportId, partId, userId],
  });
  if (!res.rows.length) return null;
  const total = Number(res.rows[0].total);
  if (res.rows.length !== total) return null;
  return res.rows.map((r) => String(r.data)).join('');
}

/** Replace part references with their data. Returns the missing part ids (empty = complete). */
export async function resolveReportParts(db: Client, report: PMReport, userId: string): Promise<{ report: PMReport; missing: string[] }> {
  const missing: string[] = [];
  const resolve = async (v: unknown) => {
    if (!isRef(v)) return v as string | undefined;
    const id = v.slice(PART_PREFIX.length);
    const data = await loadPart(db, report.id, id, userId);
    if (data == null) missing.push(id);
    return data ?? undefined;
  };
  const attachments = await Promise.all((report.attachments || []).map(async (a) => ({ ...a, file_url: (await resolve(a.file_url)) || '' })));
  const out: PMReport = {
    ...report,
    attachments,
    technician_signature: await resolve(report.technician_signature),
    supervisor_signature: await resolve(report.supervisor_signature),
  };
  return { report: out, missing };
}

/** Remove a BA's uploaded chunks (after it is stored) and any stale chunks older than 2 days. */
export async function cleanupReportParts(db: Client, reportId: string): Promise<void> {
  try {
    await db.execute({ sql: 'DELETE FROM report_parts WHERE report_id = ?;', args: [reportId] });
    await db.execute({ sql: 'DELETE FROM report_parts WHERE created_at < ?;', args: [new Date(Date.now() - 2 * 86400000).toISOString()] });
  } catch {
    // best effort
  }
}
