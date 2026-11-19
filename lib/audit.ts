/**
 * Server-only audit trail. Every write (and sensitive read such as PDF
 * downloads and logins) is recorded with who, when, from where and what
 * changed. Rows are append-only. Failures never break the audited action.
 */
import type { Client } from '@libsql/client';
import type { SessionPayload } from './session';

export type AuditEntity = 'report' | 'ticket' | 'plan' | 'site' | 'config' | 'user' | 'auth' | 'system' | 'daily_check';

export type AuditAction =
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'create'
  | 'update'
  | 'delete'
  | 'finalize'
  | 'revise'
  | 'approve'
  | 'resend'
  | 'download_pdf'
  | 'archive_drive'
  | 'config_forecourt'
  | 'reset_data'
  | 'submit_checklist';

export interface AuditEntry {
  action: AuditAction;
  entity_type: AuditEntity;
  entity_id?: string | number | null;
  entity_label?: string;
  site_id?: number | null;
  /** One readable line, e.g. "Status tiket: Open → Selesai" */
  summary: string;
  /** Extra structured data (changed fields, old/new values …) */
  details?: unknown;
}

const uid = () => `AUD-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function clientInfo(req?: Request) {
  if (!req) return { ip: null as string | null, ua: null as string | null };
  const fwd = req.headers.get('x-forwarded-for') || '';
  const ip = (fwd.split(',')[0] || req.headers.get('x-real-ip') || '').trim() || null;
  const ua = (req.headers.get('user-agent') || '').slice(0, 240) || null;
  return { ip, ua };
}

export async function audit(
  db: Client,
  req: Request | undefined,
  actor: Pick<SessionPayload, 'id' | 'name' | 'role'> | { id?: string | null; name?: string | null; role?: string | null } | null,
  e: AuditEntry
): Promise<void> {
  try {
    const { ip, ua } = clientInfo(req);
    let details: string | null = null;
    if (e.details !== undefined) {
      details = JSON.stringify(e.details);
      if (details.length > 20_000) details = details.slice(0, 20_000) + '…';
    }
    await db.execute({
      sql: `INSERT INTO audit_logs (id, at, user_id, user_name, user_role, action, entity_type, entity_id, entity_label, site_id, summary, details, ip, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        uid(),
        new Date().toISOString(),
        actor?.id ?? null,
        actor?.name ?? null,
        actor?.role ?? null,
        e.action,
        e.entity_type,
        e.entity_id === undefined || e.entity_id === null ? null : String(e.entity_id),
        e.entity_label ?? null,
        e.site_id ?? null,
        e.summary.slice(0, 500),
        details,
        ip,
        ua,
      ],
    });
  } catch (err) {
    console.warn('audit failed:', err);
  }
}

/** Large values (photos, signatures) are summarised instead of stored. */
function compact(v: unknown): unknown {
  if (typeof v === 'string') {
    if (v.startsWith('data:')) return `[file ${Math.round((v.length * 0.75) / 1024)} KB]`;
    return v.length > 300 ? v.slice(0, 300) + '…' : v;
  }
  return v;
}

/**
 * Field-level changes between two objects, e.g. [{ path: 'repair_details.root_cause', from, to }].
 * Ignores bookkeeping fields and summarises arrays by length when their items changed.
 */
export function diffFields(before: any, after: any, ignore: string[] = [], prefix = '', out: { path: string; from: unknown; to: unknown }[] = []) {
  if (out.length >= 60) return out;
  const keys = Array.from(new Set(Object.keys(before || {}).concat(Object.keys(after || {}))));
  for (const k of keys) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (ignore.includes(path) || ignore.includes(k)) continue;
    const a = before?.[k];
    const b = after?.[k];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
      diffFields(a, b, ignore, path, out);
    } else if (Array.isArray(a) || Array.isArray(b)) {
      out.push({ path, from: Array.isArray(a) ? `${a.length} item` : compact(a), to: Array.isArray(b) ? `${b.length} item (diubah)` : compact(b) });
    } else {
      out.push({ path, from: compact(a), to: compact(b) });
    }
    if (out.length >= 60) break;
  }
  return out;
}
