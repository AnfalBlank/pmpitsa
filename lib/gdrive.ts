/**
 * Server-only Google Drive client (REST v3 via fetch, no SDK).
 *
 * Auth, in order of preference:
 *  1. OAuth refresh token (works with a personal Gmail Drive):
 *       GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 *  2. Service account (needs a Shared Drive folder, service accounts have no quota):
 *       GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 *
 * GOOGLE_DRIVE_FOLDER_ID = root archive folder. Optional with OAuth (a folder
 * named DEFAULT_ROOT_NAME is created in My Drive), required with a service account.
 */
import { createSign } from 'crypto';

const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const DEFAULT_ROOT_NAME = 'Arsip BA PM POS PINSYST - PITSA';

type AuthMode = 'oauth' | 'service_account' | null;

function authMode(): AuthMode {
  const e = process.env;
  if (e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET && e.GOOGLE_REFRESH_TOKEN) return 'oauth';
  if (e.GOOGLE_SERVICE_ACCOUNT_EMAIL && e.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY && e.GOOGLE_DRIVE_FOLDER_ID) return 'service_account';
  return null;
}

export function isDriveConfigured(): boolean {
  return authMode() !== null;
}

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.token;
  const mode = authMode();
  if (!mode) throw new Error('Google Drive belum dikonfigurasi di server (lihat README: Integrasi Google Drive).');

  let body: URLSearchParams;
  if (mode === 'oauth') {
    body = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    });
  } else {
    const now = Math.floor(Date.now() / 1000);
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
      iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      scope: 'https://www.googleapis.com/auth/drive',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })}`;
    const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n');
    const sig = createSign('RSA-SHA256').update(unsigned).sign(key).toString('base64url');
    body = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` });
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error(`Login Google Drive gagal: ${json.error_description || json.error || res.status}`);
  }
  cachedToken = { token: json.access_token, exp: Date.now() + (json.expires_in || 3600) * 1000 };
  return cachedToken.token;
}

async function driveFetch(url: string, init: RequestInit = {}): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Google Drive error ${res.status}: ${json?.error?.message || res.statusText}`);
  return json;
}

const q = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
/** Drive allows almost anything, but keep names tidy and free of path separators. */
export const safeName = (s: string) => s.replace(/[\/\\]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 120) || '-';

async function findChild(parentId: string, name: string, mimeType?: string): Promise<string | null> {
  const parts = [`name = '${q(name)}'`, `'${q(parentId)}' in parents`, 'trashed = false'];
  if (mimeType) parts.push(`mimeType = '${mimeType}'`);
  const params = new URLSearchParams({
    q: parts.join(' and '),
    fields: 'files(id)',
    pageSize: '1',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });
  const json = await driveFetch(`${DRIVE}/files?${params}`);
  return json.files?.[0]?.id || null;
}

async function createFolder(parentId: string | null, name: string): Promise<string> {
  const json = await driveFetch(`${DRIVE}/files?supportsAllDrives=true&fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, ...(parentId ? { parents: [parentId] } : {}) }),
  });
  return json.id;
}

async function ensureFolder(parentId: string, name: string): Promise<string> {
  return (await findChild(parentId, name, FOLDER_MIME)) || createFolder(parentId, name);
}

async function rootFolderId(): Promise<string> {
  if (process.env.GOOGLE_DRIVE_FOLDER_ID) return process.env.GOOGLE_DRIVE_FOLDER_ID;
  return (await findChild('root', DEFAULT_ROOT_NAME, FOLDER_MIME)) || createFolder(null, DEFAULT_ROOT_NAME);
}

/** Creates (if needed) root/<seg1>/<seg2>/... and returns the last folder id. */
export async function ensureFolderPath(segments: string[]): Promise<string> {
  let id = await rootFolderId();
  for (const seg of segments) id = await ensureFolder(id, safeName(seg));
  return id;
}

/**
 * Uploads a file into `parentId`. If a file with the same name already exists
 * there, its content is replaced (keeps the same link) instead of duplicating.
 */
export async function uploadFile(parentId: string, name: string, mimeType: string, data: Buffer): Promise<{ id: string; webViewLink: string }> {
  const existing = await findChild(parentId, name);
  const boundary = `pm-${Date.now().toString(36)}`;
  const meta = existing ? { name } : { name, parents: [parentId] };
  const multipart = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    data,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const url = existing
    ? `${UPLOAD}/files/${existing}?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink`
    : `${UPLOAD}/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink`;
  return driveFetch(url, {
    method: existing ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: multipart,
  });
}

export const folderUrl = (id: string) => `https://drive.google.com/drive/folders/${id}`;

/** Decodes a data: URL into bytes + mime type. */
export function decodeDataUrl(dataUrl: string): { mime: string; data: Buffer } | null {
  const m = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(dataUrl || '');
  if (!m) return null;
  return { mime: m[1], data: m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3])) };
}
