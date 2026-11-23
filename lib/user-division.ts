/** Server-only: a technician's CURRENT division from the users table (the session token may be older). */
import type { Client } from '@libsql/client';
import type { TechDivision } from './types';

export async function currentDivision(db: Client, session: { id: string; division?: TechDivision }): Promise<TechDivision> {
  try {
    const res = await db.execute({ sql: 'SELECT division FROM users WHERE id = ? LIMIT 1;', args: [session.id] });
    if (res.rows.length) return String(res.rows[0].division || 'IT') === 'TEKNIK' ? 'TEKNIK' : 'IT';
  } catch {
    // fall back to the session value
  }
  return session.division === 'TEKNIK' ? 'TEKNIK' : 'IT';
}
