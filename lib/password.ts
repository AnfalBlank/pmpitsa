/**
 * Password hashing with Node's built-in scrypt (no extra dependency).
 *
 * Stored format: `scrypt$<N>$<r>$<p>$<salt base64url>$<hash base64url>`
 * Anything without the `scrypt$` prefix is treated as a legacy plaintext
 * password: it still verifies once, and the caller should re-hash it
 * (`needsRehash`) so the plaintext disappears on the first successful login.
 */
import { randomBytes, scrypt, timingSafeEqual, createHash, ScryptOptions } from 'crypto';

const PREFIX = 'scrypt';
const N = 16384;
const R = 8;
const P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

function scryptAsync(password: string, salt: Buffer, keyLen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLen, opts, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export function isPasswordHash(stored: string): boolean {
  return stored.startsWith(`${PREFIX}$`);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const key = await scryptAsync(password, salt, KEY_LEN, { N, r: R, p: P });
  return [PREFIX, N, R, P, salt.toString('base64url'), key.toString('base64url')].join('$');
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (isPasswordHash(stored)) {
    const parts = stored.split('$');
    if (parts.length !== 6) return { ok: false, needsRehash: false };
    const [, n, r, p, saltB64, hashB64] = parts;
    const expected = Buffer.from(hashB64, 'base64url');
    const actual = await scryptAsync(password, Buffer.from(saltB64, 'base64url'), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    const ok = actual.length === expected.length && timingSafeEqual(actual, expected);
    return { ok, needsRehash: ok && (Number(n) !== N || Number(r) !== R || Number(p) !== P) };
  }

  // Legacy plaintext row: constant-time compare on digests, then migrate.
  const a = createHash('sha256').update(password).digest();
  const b = createHash('sha256').update(stored).digest();
  const ok = stored.length > 0 && timingSafeEqual(a, b);
  return { ok, needsRehash: ok };
}

/** Burn comparable CPU time when the user doesn't exist, to blunt username enumeration via timing. */
export async function dummyVerify(password: string): Promise<void> {
  await scryptAsync(password, randomBytes(SALT_LEN), KEY_LEN, { N, r: R, p: P });
}
