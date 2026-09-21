import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const lifetime = 7 * 24 * 60 * 60;
function signature(payload: string) {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error('Tracking signing key unavailable');
  // Domain separation: a tracking signature cannot be used as a Supabase credential.
  return createHmac('sha256', key).update(`etandoori:guest-order-tracking:${payload}`).digest();
}
export function issueTrackingToken(id: string, now = Date.now()) {
  if (!uuid.test(id)) throw new Error('Invalid order ID');
  const expires = Math.floor(now / 1000) + lifetime;
  const payload = `v1.${id}.${expires}`;
  return { token: `${payload}.${signature(payload).toString('base64url')}`, expiresAt: expires * 1000 };
}
export function verifyTrackingToken(token: string, now = Date.now()): string | null {
  if (token.length > 256) return null;
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1' || !uuid.test(parts[1]) || !/^\d{10,11}$/.test(parts[2]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[3])) return null;
  if (Number(parts[2]) * 1000 <= now) return null;
  const expected = signature(parts.slice(0, 3).join('.'));
  const supplied = Buffer.from(parts[3], 'base64url');
  if (supplied.toString('base64url') !== parts[3] || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  return parts[1];
}
