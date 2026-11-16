#!/usr/bin/env node
/**
 * One-time helper: obtains a Google OAuth refresh token for the BA archive.
 *
 *   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... node scripts/google-drive-auth.mjs
 *
 * 1. Opens a local callback server on http://localhost:53682
 * 2. Prints a Google sign-in URL — open it, sign in with the Google account
 *    whose Drive should hold the archive, and allow access.
 * 3. Prints GOOGLE_REFRESH_TOKEN to put in the hosting environment variables.
 *
 * The OAuth client must be of type "Desktop app" (or "Web" with the redirect
 * URI http://localhost:53682 registered).
 */
import http from 'node:http';

const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret } = process.env;
if (!clientId || !clientSecret) {
  console.error('Set GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET terlebih dahulu.');
  process.exit(1);
}

const PORT = 53682;
const redirectUri = `http://localhost:${PORT}`;
const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive',
    access_type: 'offline',
    prompt: 'consent',
  });

const server = http.createServer(async (req, res) => {
  const code = new URL(req.url, redirectUri).searchParams.get('code');
  if (!code) {
    res.end('Tidak ada kode otorisasi.');
    return;
  }
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  const json = await tokenRes.json();
  if (!json.refresh_token) {
    res.end('Gagal mendapatkan refresh token. Lihat terminal.');
    console.error(json);
  } else {
    res.end('Berhasil. Kembali ke terminal untuk menyalin GOOGLE_REFRESH_TOKEN.');
    console.log('\nGOOGLE_REFRESH_TOKEN=' + json.refresh_token + '\n');
    console.log('Simpan nilai ini di environment variable hosting (jangan di-commit ke git).');
  }
  server.close();
});

server.listen(PORT, () => {
  console.log('Buka URL berikut di browser dan login dengan akun Google pemilik arsip:\n');
  console.log(authUrl + '\n');
});
