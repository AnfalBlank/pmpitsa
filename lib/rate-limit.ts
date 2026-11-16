/**
 * Simple in-memory fixed-window limiter for failed login attempts.
 *
 * Limitation: state lives in the memory of one server process. On serverless
 * hosting (several instances, cold starts) it's a best-effort brake, not a
 * hard guarantee. Move it to a shared store (e.g. a Turso table or Redis) if
 * that matters.
 */

interface Bucket {
  count: number;
  resetAt: number; // epoch ms
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

export const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_FAILS_PER_USERNAME = 5;
export const MAX_FAILS_PER_IP = 20;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  buckets.forEach((b, k) => {
    if (b.resetAt <= now) buckets.delete(k);
  });
}

function active(key: string, now: number): Bucket | undefined {
  const b = buckets.get(key);
  if (b && b.resetAt <= now) {
    buckets.delete(key);
    return undefined;
  }
  return b;
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim() || 'unknown';
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

function keys(ip: string, username: string) {
  return { ipKey: `ip:${ip}`, userKey: `user:${username.trim().toLowerCase()}` };
}

/** Returns seconds to wait if this IP or username is currently locked out, else 0. */
export function loginRetryAfter(ip: string, username: string): number {
  const now = Date.now();
  sweep(now);
  const { ipKey, userKey } = keys(ip, username);
  const ipB = active(ipKey, now);
  const userB = active(userKey, now);
  let waitMs = 0;
  if (ipB && ipB.count >= MAX_FAILS_PER_IP) waitMs = Math.max(waitMs, ipB.resetAt - now);
  if (userB && userB.count >= MAX_FAILS_PER_USERNAME) waitMs = Math.max(waitMs, userB.resetAt - now);
  return Math.ceil(waitMs / 1000);
}

export function recordLoginFailure(ip: string, username: string) {
  const now = Date.now();
  const { ipKey, userKey } = keys(ip, username);
  for (const key of [ipKey, userKey]) {
    const b = active(key, now);
    if (b) b.count += 1;
    else buckets.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  }
}

export function recordLoginSuccess(ip: string, username: string) {
  // Clear the username counter; keep the IP counter so one valid account
  // can't be used to reset brute force against others from the same IP.
  buckets.delete(keys(ip, username).userKey);
}
