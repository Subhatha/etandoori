import type { Database, OrderStatus } from '../supabase/database.types';
export type Staff = Pick<Database['public']['Tables']['restaurant_users']['Row'], 'id' | 'name' | 'role'>;
export type AdminOrder = Omit<Database['public']['Tables']['orders']['Row'], 'request_fingerprint' | 'payment_reference' | 'payment_provider'> & { items: Database['public']['Tables']['order_items']['Row'][] };
export const activeStatuses: OrderStatus[] = ['new', 'accepted', 'preparing', 'ready'];
export const historyStatuses: OrderStatus[] = ['completed', 'rejected', 'cancelled'];
export const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  new: ['accepted', 'rejected', 'cancelled'], accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'], ready: ['completed', 'cancelled'],
  completed: [], rejected: [], cancelled: [],
};
export function canTransition(from: string, to: string): boolean {
  return Object.hasOwn(transitions, from) && transitions[from as OrderStatus].includes(to as OrderStatus);
}
export function sortedOrders<T extends { id: string; created_at: string; updated_at: string }>(orders: T[]): T[] {
  const map = new Map<string, T>();
  for (const order of orders) {
    const previous = map.get(order.id);
    if (!previous || order.updated_at >= previous.updated_at) map.set(order.id, order);
  }
  return [...map.values()].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
}
export function parisDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}
export function previousDate(date: string): string {
  const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() - 1); return value.toISOString().slice(0, 10);
}
export function validDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
}
export function inHistory(order: Pick<AdminOrder, 'order_status' | 'created_at' | 'order_number'>, date: string, number = '') {
  return historyStatuses.includes(order.order_status) && (!date || parisDate(new Date(order.created_at)) === date) && (!number || String(order.order_number) === number);
}
export function parseStatusChange(value: unknown): { id: string; from: OrderStatus; to: OrderStatus } | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some(key => !['id', 'from', 'to'].includes(key)) || typeof v.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.id) || typeof v.from !== 'string' || typeof v.to !== 'string' || !canTransition(v.from, v.to)) return null;
  return { id: v.id, from: v.from as OrderStatus, to: v.to as OrderStatus };
}
