import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KV_TTL = 60 * 60 * 24 * 90; // 90 days

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) throw new Error('ENCRYPTION_KEY environment variable is not set');
  const key = Buffer.from(hex, 'hex');
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
  return key;
}

function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(ciphertext: string): string {
  const key = getKey();
  const data = Buffer.from(ciphertext, 'base64');
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

async function kvFetch(method: string, path: string, body?: unknown) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Vercel KV environment variables are not set');

  const res = await fetch(`${url}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`KV request failed: ${res.status}`);
  return res.json();
}

export async function saveEncryptedToken(storeId: string, refreshToken: string): Promise<void> {
  const encrypted = encrypt(refreshToken);
  const key = `gbp_token:${storeId}`;
  await kvFetch('POST', `/set/${encodeURIComponent(key)}`, [encrypted, 'EX', KV_TTL]);
}

export async function getDecryptedToken(storeId: string): Promise<string | null> {
  const key = `gbp_token:${storeId}`;
  const result = await kvFetch('GET', `/get/${encodeURIComponent(key)}`);
  if (!result?.result) return null;
  return decrypt(result.result);
}

export async function deleteToken(storeId: string): Promise<void> {
  const key = `gbp_token:${storeId}`;
  await kvFetch('POST', `/del/${encodeURIComponent(key)}`);
}
