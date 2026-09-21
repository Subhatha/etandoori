import type { Receipt } from './types';
export type SavedOrder = { id: string; orderNumber: number; token: string; expiresAt: number };
export const trackingStorageKey = 'etandoori-order-tracking-v1';
const changeEvent = 'etandoori-order-tracking-change';
let memory = '';
let unavailable = false;
export function parseSavedOrders(raw: string, now = Date.now()): SavedOrder[] {
  try {
    const entries: unknown = JSON.parse(raw);
    if (!Array.isArray(entries)) return [];
    const seen = new Set<string>();
    return entries.filter((entry): entry is SavedOrder => {
      if (!entry || typeof entry.id !== 'string' || typeof entry.token !== 'string' || entry.token.length > 256 || !entry.token.startsWith(`v1.${entry.id}.`) || !Number.isSafeInteger(entry.orderNumber) || entry.orderNumber < 1 || !Number.isFinite(entry.expiresAt) || entry.expiresAt <= now || seen.has(entry.id)) return false;
      seen.add(entry.id); return true;
    }).slice(0, 10).map(({ id, orderNumber, token, expiresAt }) => ({ id, orderNumber, token, expiresAt }));
  } catch { return []; }
}
export function trackingSnapshot() {
  if (unavailable) return memory;
  try { return localStorage.getItem(trackingStorageKey) ?? memory; } catch { return memory; }
}
export function subscribeTracking(notify: () => void) {
  window.addEventListener('storage', notify); window.addEventListener(changeEvent, notify);
  return () => { window.removeEventListener('storage', notify); window.removeEventListener(changeEvent, notify); };
}
export function saveTracking(receipt: Receipt): boolean {
  if (!receipt.tracking) return true;
  const entry = { id: receipt.id, orderNumber: receipt.order_number, ...receipt.tracking };
  memory = JSON.stringify([entry, ...parseSavedOrders(trackingSnapshot()).filter(order => order.id !== entry.id)].slice(0, 10));
  try { localStorage.setItem(trackingStorageKey, memory); unavailable = false; }
  catch { unavailable = true; }
  window.dispatchEvent(new Event(changeEvent));
  return !unavailable;
}
