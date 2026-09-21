import { test, expect } from '@playwright/test';
const root = '/etandoori';
const id = '30000000-0000-4000-8000-000000000001';
const token = `v1.${id}.1999999999.fixture-browser-token`;
function receipt(status = 'new') {
  return { id, order_number: 101, order_type: 'pickup', customer_name: 'Guest fixture', customer_phone: '0612345678', customer_email: null, delivery_address: null, customer_notes: null, subtotal: 24, delivery_fee: 0, total: 24, order_status: status, payment_status: 'pending', items: [{ item_name: 'Fixture curry', quantity: 2, unit_price: 12, total_price: 24, notes: 'Mild please' }] };
}
test('tracking API rejects anonymous order IDs and forged credentials', async ({ request }) => {
  const missing = await request.get(`${root}/api/orders/status/?id=${id}`);
  expect(missing.status()).toBe(401);
  const forged = await request.get(`${root}/api/orders/status/`, { headers: { Authorization: `Bearer ${token}` } });
  expect(forged.status()).toBe(401);
  expect(await forged.text()).not.toContain('customer_phone');
});
test('guest status updates without sign-in and survives reopening the same browser', async ({ page, context }) => {
  let status = 'new', offline = false, denied = false, reads = 0;
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await context.route('**/api/orders/status**', async route => {
    reads++;
    expect(route.request().headers().authorization).toBe(`Bearer ${token}`);
    expect(route.request().url()).not.toContain(token);
    await route.fulfill({ status: denied ? 401 : offline ? 503 : 200, json: denied || offline ? { error: 'unavailable' } : { order: receipt(status) } });
  });
  await page.clock.install();
  await page.goto(`${root}/order-confirmation/`);
  await page.evaluate(({ id, token }) => {
    localStorage.setItem('etandoori-order-tracking-v1', JSON.stringify([{ id, orderNumber: 101, token, expiresAt: Date.now() + 86400000 }]));
    localStorage.setItem('etandoori-language-v2', 'en');
    window.dispatchEvent(new Event('etandoori-language-change')); window.dispatchEvent(new Event('etandoori-order-tracking-change'));
  }, { id, token });
  await expect(page.getByText('Waiting for the restaurant to confirm your order.', { exact: true })).toBeVisible();
  for (const [next, message] of [['accepted', 'The restaurant has accepted your order.'], ['preparing', 'Your meal is being prepared.'], ['ready', 'Your order is ready for pickup.']]) {
    status = next; await page.clock.fastForward(11000);
    await expect(page.getByText(message, { exact: true })).toBeVisible();
  }
  offline = true; await page.clock.fastForward(11000);
  await expect(page.getByText(/Unable to refresh/)).toBeVisible();
  await expect(page.getByText('Your order is ready for pickup.', { exact: true })).toBeVisible();
  offline = false; await page.getByRole('button', { name: 'Refresh status', exact: true }).click();
  await expect(page.getByText(/Unable to refresh/)).toHaveCount(0);
  status = 'completed'; await page.clock.fastForward(11000);
  await expect(page.getByText('Your order is complete.', { exact: true })).toBeVisible();
  const stopped = reads; await page.clock.fastForward(30000); expect(reads).toBe(stopped);
  await page.close();
  const reopened = await context.newPage(); await reopened.setViewportSize({ width: 390, height: 844 });
  await reopened.goto(`${root}/order-confirmation/`);
  await expect(reopened.getByText('Guest fixture', { exact: true })).toBeVisible();
  // Select language explicitly after hydration; existing site language storage is unchanged.
  await reopened.evaluate(() => { localStorage.setItem('etandoori-language-v2', 'de'); window.dispatchEvent(new Event('etandoori-language-change')); });
  await expect(reopened.getByText('Ihre Bestellung ist abgeschlossen.', { exact: true })).toBeVisible();
  expect(await reopened.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  denied = true;
  await reopened.getByRole('button', { name: 'Status aktualisieren', exact: true }).click();
  await expect(reopened.getByText(/Bestellverfolgung ist abgelaufen/)).toBeVisible();
  const newDevice = await context.browser()!.newContext(); const other = await newDevice.newPage();
  await other.goto(`${root}/order-confirmation/`);
  await expect(other.getByText('Guest fixture', { exact: true })).toHaveCount(0);
  await newDevice.close(); expect(errors).toEqual([]);
});
