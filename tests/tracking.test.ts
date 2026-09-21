import assert from 'node:assert/strict';
import { test } from 'node:test';
import { issueTrackingToken, verifyTrackingToken } from '../lib/ordering/tracking-token';
import { parseSavedOrders } from '../lib/ordering/tracking-storage';
process.env.SUPABASE_SECRET_KEY = 'fixture-only-signing-key-not-a-production-credential';
const id = '30000000-0000-4000-8000-000000000001';
const other = '30000000-0000-4000-8000-000000000002';
const now = Date.parse('2026-09-21T12:00:00Z');
test('tracking capability is bound to exactly one order and expires after seven days', () => {
  const access = issueTrackingToken(id, now);
  assert.equal(verifyTrackingToken(access.token, now), id);
  assert.equal(access.expiresAt, now + 7 * 86400000);
  assert.equal(verifyTrackingToken(access.token, access.expiresAt - 1), id);
  assert.equal(verifyTrackingToken(access.token, access.expiresAt), null);
  assert.equal(verifyTrackingToken(access.token.replace(id, other), now), null);
  const fields = access.token.split('.'); fields[2] = String(Number(fields[2]) + 3600);
  assert.equal(verifyTrackingToken(fields.join('.'), now), null);
});
test('missing, forged and malformed tracking tokens never authorize an order', () => {
  const access = issueTrackingToken(id, now);
  const fields = access.token.split('.'); fields[3] = `${fields[3][0] === 'a' ? 'b' : 'a'}${fields[3].slice(1)}`;
  for (const token of ['', id, '123', 'Bearer abc', fields.join('.'), access.token + '.extra', 'x'.repeat(10000)]) assert.equal(verifyTrackingToken(token, now), null);
  assert.throws(() => issueTrackingToken('not-an-order-id', now));
  const secret = process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_SECRET_KEY = 'rotated-fixture-signing-key';
  assert.equal(verifyTrackingToken(access.token, now), null);
  process.env.SUPABASE_SECRET_KEY = secret;
  assert.ok(!access.token.includes(secret!));
});
test('phone storage keeps only bounded, unexpired capabilities, not customer details', () => {
  const entry = { id, orderNumber: 101, ...issueTrackingToken(id, now), customer_phone: 'private', customer_name: 'private' };
  const saved = parseSavedOrders(JSON.stringify([entry, entry]), now);
  assert.equal(saved.length, 1);
  assert.deepEqual(Object.keys(saved[0]).sort(), ['expiresAt', 'id', 'orderNumber', 'token']);
  assert.deepEqual(parseSavedOrders(JSON.stringify([entry]), entry.expiresAt), []);
  for (const value of ['', '{bad', '{}', '[null]', '[{"id":5}]']) assert.deepEqual(parseSavedOrders(value, now), []);
  const many = Array.from({ length: 15 }, (_, index) => {
    const nextId = `30000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
    return { id: nextId, orderNumber: index + 1, ...issueTrackingToken(nextId, now) };
  });
  assert.equal(parseSavedOrders(JSON.stringify(many), now).length, 10);
});
