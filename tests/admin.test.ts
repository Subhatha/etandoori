import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bearerToken, requireStaff, AccessError } from '../lib/admin/access';
import { canTransition, sortedOrders, inHistory, parisDate, previousDate, parseStatusChange } from '../lib/admin/orders';
import type { OrderStatus } from '../lib/supabase/database.types';
test('authentication requires a bearer session and restaurant membership', () => {
  for (const header of [null, '', 'Basic abc', 'Bearer ', 'Bearer a b']) assert.throws(() => bearerToken(header), (e: unknown) => e instanceof AccessError && e.status === 401);
  assert.equal(bearerToken('Bearer signed-token'), 'signed-token');
  assert.throws(() => requireStaff(undefined, null), (e: unknown) => e instanceof AccessError && e.status === 401);
  assert.throws(() => requireStaff('customer', null), (e: unknown) => e instanceof AccessError && e.status === 403);
  for (const role of ['admin', 'staff'] as const) assert.equal(requireStaff('user', { id: 'member', name: 'Team', role }).role, role);
});
test('lifecycle transitions follow kitchen sequence; terminal states cannot reopen', () => {
  for (const [from, to] of [['new','accepted'], ['new','rejected'], ['accepted','preparing'], ['preparing','ready'], ['ready','completed'], ['new','cancelled'], ['accepted','cancelled'], ['preparing','cancelled'], ['ready','cancelled']]) assert.equal(canTransition(from,to),true);
  for (const [from,to] of [['new','completed'],['new','ready'],['ready','new'],['completed','accepted'],['rejected','new'],['cancelled','new'],['preparing','rejected'],['accepted','accepted'],['toString','new']]) assert.equal(canTransition(from,to),false);
});
test('status request rejects price/payment mutations and malformed transitions', () => {
  const input = { id: '30000000-0000-4000-8000-000000000001', from: 'new', to: 'accepted' };
  assert.deepEqual(parseStatusChange(input), input);
  for (const value of [null, { ...input, total: 0 }, { ...input, payment_status: 'paid' }, { ...input, to: 'completed' }, { ...input, id: 'not-uuid' }]) assert.equal(parseStatusChange(value),null);
});
test('realtime refetches deduplicate IDs, retain latest update and sort newest first', () => {
  const old = { id: 'a', created_at: '2026-09-21T10:00:00Z', updated_at: '2026-09-21T10:00:00Z' };
  const newer = { ...old, updated_at: '2026-09-21T11:00:00Z' };
  const second = { id: 'b', created_at: '2026-09-21T10:30:00Z', updated_at: '2026-09-21T10:30:00Z' };
  assert.deepEqual(sortedOrders([newer, second, old, newer]), [second, newer]);
});
test('history filters terminal statuses, exact number and Paris date across midnight/DST', () => {
  const base = { order_status: 'completed' as OrderStatus, created_at: '2026-09-20T22:30:00Z', order_number: 123 };
  assert.equal(inHistory(base, '2026-09-21'),true);
  assert.equal(inHistory(base, '2026-09-20'),false);
  assert.equal(inHistory(base, '', '123'),true);
  assert.equal(inHistory(base, '', '12'),false);
  for (const status of ['new','accepted','preparing','ready'] as OrderStatus[]) assert.equal(inHistory({...base, order_status:status}, ''), false);
  for (const status of ['completed','rejected','cancelled'] as OrderStatus[]) assert.equal(inHistory({...base, order_status:status}, ''), true);
  assert.equal(parisDate(new Date('2026-03-29T22:30:00Z')), '2026-03-30');
  assert.equal(parisDate(new Date('2026-10-25T23:30:00Z')), '2026-10-26');
  assert.equal(previousDate('2026-03-01'), '2026-02-28');
});


test('visual order age progresses without changing lifecycle and clamps future timestamps', async () => {
  const { orderAge } = await import('../lib/admin/presentation');
  const created = '2026-09-21T10:00:00Z';
  const start = Date.parse(created);
  assert.deepEqual(orderAge(created, start + 3 * 60000), { minutes: 3, urgency: 'normal' });
  assert.deepEqual(orderAge(created, start + 12 * 60000), { minutes: 12, urgency: 'waiting' });
  assert.deepEqual(orderAge(created, start + 27 * 60000), { minutes: 27, urgency: 'late' });
  assert.equal(orderAge(created, start - 60000).minutes, 0);
});
