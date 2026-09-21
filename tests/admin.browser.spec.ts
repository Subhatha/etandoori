import { test, expect, type Page, type WebSocketRoute } from '@playwright/test';
import type { AdminOrder } from '../lib/admin/orders';
const root = '/etandoori';
const id = '30000000-0000-4000-8000-000000000001';
function fixture(number = 101): AdminOrder {
  return { id: number === 101 ? id : `30000000-0000-4000-8000-${String(number).padStart(12, '0')}`, order_number: number, customer_name: 'Fixture customer', customer_phone: '0612345678', customer_email: null, order_type: 'delivery', delivery_address: '1 Test street, 74200 Thonon', subtotal: 24, delivery_fee: 0, total: 24, order_status: 'new', payment_status: 'pending', customer_notes: 'Ring the bell', created_at: new Date(Date.now() - (number === 101 ? 1200000 : 0)).toISOString(), updated_at: new Date().toISOString(), items: [{ id: '40000000-0000-4000-8000-000000000001', order_id: id, menu_item_id: null, item_name: 'Fixture curry', quantity: 2, unit_price: 12, total_price: 24, notes: 'Mild please' }] };
}
async function mockRestaurant(page: Page, allowed = true) {
  const state = { orders: [fixture()], reads: 0, mutations: [] as Record<string, unknown>[], unavailable: false };
  const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const accessToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', exp: Math.floor(Date.now()/1000)+3600 })}.fixture`;
  await page.route('**/auth/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/token')) return route.fulfill({ json: { access_token: accessToken, token_type: 'bearer', expires_in: 3600, refresh_token: 'fixture-refresh', user } });
    if (path.endsWith('/logout')) return route.fulfill({ status: 204 });
    return route.fulfill({ json: user });
  });
  await page.route('**/api/admin/**', async route => {
    if (!allowed) return route.fulfill({ status: 403, json: { error: 'access' } });
    if (state.unavailable) return route.fulfill({ status: 503, json: { error: 'unavailable' } });
    const url = new URL(route.request().url());
    if (url.pathname.replace(/\/$/, '').endsWith('/session')) return route.fulfill({ json: { staff: { id: 'staff-fixture', name: 'Test staff', role: 'staff' } } });
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON(); state.mutations.push(body);
      const order = state.orders.find(order => order.id === body.id);
      if (!order || order.order_status !== body.from) return route.fulfill({ status: 409, json: { error: 'conflict' } });
      order.order_status = body.to; order.updated_at = new Date().toISOString();
      return route.fulfill({ json: { ok: true } });
    }
    state.reads++;
    const history = url.searchParams.get('history') === '1';
    const orders = state.orders.filter(order => ['completed','cancelled','rejected'].includes(order.order_status) === history);
    // Deliberately repeat records: the UI must retain one card per ID.
    return route.fulfill({ json: { orders: [...orders, ...orders] } });
  });
  let socket: WebSocketRoute | undefined, topic = '', joinRef: string | null = null;
  await page.routeWebSocket('**/realtime/v1/**', ws => {
    socket = ws;
    ws.onMessage(raw => {
      const [join, ref, channel, event, payload] = JSON.parse(String(raw));
      if (event === 'phx_join') {
        topic = channel; joinRef = join;
        ws.send(JSON.stringify([join, ref, channel, 'phx_reply', { status: 'ok', response: { postgres_changes: payload.config.postgres_changes.map((filter: object, i: number) => ({ ...filter, id: i+1 })) } }]));
      } else if (event === 'heartbeat' || event === 'phx_leave') ws.send(JSON.stringify([join, ref, channel, 'phx_reply', { status: 'ok', response: {} }]));
    });
  });
  return { state, notify: (type = 'INSERT') => socket?.send(JSON.stringify([joinRef, null, topic, 'postgres_changes', { ids: [type === 'INSERT' ? 1 : 2], data: { schema: 'public', table: 'orders', type, commit_timestamp: new Date().toISOString(), record: state.orders.at(-1), old_record: {}, columns: [] } }])), disconnect: () => socket?.close() };
}
async function login(page: Page) {
  await page.goto(`${root}/admin/login/`);
  await page.locator('select').selectOption('en');
  await page.getByLabel('Email', { exact: true }).fill('fixture@example.test');
  await page.getByLabel('Password', { exact: true }).fill('fixture-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
test('unauthenticated pages redirect and the actual API refuses anonymous access', async ({ page, request }) => {
  await page.goto(`${root}/admin/orders/`);
  await expect(page).toHaveURL(/\/admin\/login\//);
  const response = await request.get(`${root}/api/admin/orders/`);
  expect(response.status()).toBe(401);
  await page.goto(`${root}/admin/orders/history/`);
  await expect(page).toHaveURL(/\/admin\/login\//);
});
test('customer account cannot enter the restaurant dashboard', async ({ page }) => {
  const mock = await mockRestaurant(page, false); await login(page);
  await expect(page.locator('form [role=alert]')).toContainText('not authorized');
  expect(mock.state.reads).toBe(0);
  await expect(page).toHaveURL(/\/admin\/login\//);
});
test('tablet live order board, sound, deduplication, confirmed actions, reconnect and history', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const mock = await mockRestaurant(page); await login(page);
  await expect(page.getByRole('heading', { name: '#101', exact: true })).toBeVisible();
  await expect(page.locator('article')).toHaveCount(1);
  await expect(page.locator('[data-state=live]')).toBeVisible();
  await page.locator('header select').selectOption('fr');
  await expect(page.getByRole('heading', { name: 'Commandes en cours', exact: true })).toBeVisible();
  await page.locator('header select').selectOption('de');
  await expect(page.getByRole('heading', { name: 'Aktuelle Bestellungen', exact: true })).toBeVisible();
  await page.locator('header select').selectOption('en');
  await page.getByRole('button', { name: 'Enable order sounds', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sounds enabled — test', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Acknowledge', exact: true }).click();
  const reads = mock.state.reads;
  mock.state.orders.push(fixture(102)); mock.notify(); mock.notify();
  await expect(page.getByRole('heading', { name: '#102', exact: true })).toBeVisible();
  expect(mock.state.reads).toBeGreaterThan(reads);
  await expect(page.locator('article')).toHaveCount(2);
  await expect(page.locator('article').first()).toContainText('#102');
  await expect(page.locator('article').first().getByText('NEW ORDER', { exact: false })).toBeVisible();
  await page.screenshot({ path: 'test-results/admin-tablet.png', fullPage: true });
  const second = page.locator('article').filter({ has: page.getByRole('heading', { name: '#102', exact: true }) });
  await second.getByRole('button', { name: 'Reject', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); expect(mock.state.mutations.length).toBe(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Back', exact: true }).click();
  await second.getByRole('button', { name: 'Reject', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.locator('article')).toHaveCount(1);
  for (const action of ['Accept order','Start preparing','Mark ready','Complete order']) await page.locator('article').getByRole('button', { name: action, exact: true }).click();
  await expect(page.locator('article')).toHaveCount(0);
  for (const mutation of mock.state.mutations) expect(Object.keys(mutation).sort()).toEqual(['from','id','to']);
  mock.state.unavailable = true; mock.disconnect();
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByText('Data out of date — check connection', { exact: true })).toBeVisible();
  mock.state.unavailable = false;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByText('Data out of date — check connection', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'History', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Open order #101', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Mild please');
  await expect(page.getByRole('dialog')).toContainText('Subtotal');
  await expect(page.getByRole('button', { name: 'Accept order', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.setViewportSize({ width: 768, height: 1024 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login\//);
  expect(errors).toEqual([]);
});


test('tablet layouts keep items visible, columns scrollable and details keyboard accessible', async ({ page }) => {
  const mock = await mockRestaurant(page);
  const accepted = { ...fixture(102), order_status: 'accepted' as const, order_type: 'pickup' as const, delivery_address: null };
  const ready = { ...fixture(103), order_status: 'ready' as const, payment_status: 'paid' as const };
  mock.state.orders.push(accepted, ready);
  for (let n = 104; n < 110; n++) mock.state.orders.push(fixture(n));
  await login(page);
  await expect(page.locator('article')).toHaveCount(9);
  const first = page.locator('article').filter({ has: page.getByRole('heading', { name: '#101', exact: true }) });
  await expect(first.locator('[data-urgency="late"]')).toContainText('Long wait');
  await expect(first.getByRole('list', { name: 'Items' })).toContainText('Mild please');
  const pickup = page.locator('article').filter({ has: page.getByRole('heading', { name: '#102', exact: true }) });
  await expect(pickup).toContainText('Pickup');
  await expect(pickup).toContainText('Accepted');
  await expect(pickup).not.toContainText('1 Test street');
  await expect(page.locator('[data-payment="paid"]')).toContainText('Paid');
  for (const size of [{ width: 1180, height: 820 }, { width: 1024, height: 768 }, { width: 1366, height: 1024 }, { width: 768, height: 1024 }, { width: 800, height: 600 }, { width: 1440, height: 900 }, { width: 600, height: 900 }]) {
    await page.setViewportSize(size);
    for (const language of ['fr', 'en', 'de']) {
      await page.locator('header select').selectOption(language);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (size.width >= 760) {
        expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
        expect(await page.locator('[role="region"]').first().evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
      }
    }
    await page.locator('header select').selectOption('en');
    if (size.width === 1180 || size.width === 768) await page.screenshot({ path: `test-results/admin-ui-${size.width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1180, height: 820 });
  const details = pickup.getByRole('button', { name: 'Open order #102', exact: true });
  await details.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: '#102', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(details).toBeFocused();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await first.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await page.getByRole('link', { name: 'History', exact: true }).click();
  mock.state.orders = [{ ...fixture(), order_status: 'completed' }];
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  for (const size of [{ width: 1180, height: 820 }, { width: 768, height: 1024 }, { width: 600, height: 900 }]) {
    await page.setViewportSize(size);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.screenshot({ path: 'test-results/admin-history.png', fullPage: true });
});
