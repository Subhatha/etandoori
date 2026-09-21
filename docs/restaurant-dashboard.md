# Restaurant tablet dashboard — Phase 2

## One-time Supabase setup

1. Apply **only the new migration** `supabase/migrations/20260921000100_order_status_transitions.sql` to the existing project. Prefer `npx supabase db push` with the CLI linked to the correct project and previous migrations already recorded. This installs a lifecycle trigger; it does not change RLS, grants, tables, payment fields or order data.
2. If you instead run this migration in SQL Editor, record it afterwards with `npx supabase migration repair 20260921000100 --status applied` before using automated migrations. Do not rerun the old migrations.
3. In Supabase Authentication → Users, create the restaurant operator with an email and strong password, and confirm the email. Copy the Auth user UUID. Run this in SQL Editor, substituting the actual values:

   ```sql
   insert into public.restaurant_users (auth_user_id, name, role)
   values ('YOUR_AUTH_USER_UUID', 'Restaurant manager', 'admin');
   ```

   Create each additional staff member as an Auth user and add a membership row with role `staff`. An Auth account alone has no restaurant access. There is no public staff signup page. Password management/reset remains in Supabase for this phase.
4. Ensure the Email auth provider is enabled. Keep `orders` in the `supabase_realtime` publication (the initial migration already adds it). Keep all five tables' RLS enabled. No anonymous order policies or secret browser keys are needed.
5. Use the existing public Supabase URL/publishable key in the frontend deployment. The dashboard does **not** use `SUPABASE_SECRET_KEY`; that stays server-only for customer checkout. No new environment variables are needed.

## Authentication and security

Open `/admin/login` and sign in with the operator's Supabase Auth credentials. The existing browser client persists and refreshes the session. `/admin/orders` and `/admin/orders/history` mount only after the staff gate checks the authenticated membership; other users are redirected to login. Their HTML contains no server-rendered order information.

The gate is a navigation convenience, not the security boundary. Every `/api/admin/*` request validates the bearer token with Supabase Auth `getUser`, then queries that user's `restaurant_users` row. All database requests use the existing RLS-scoped server utility with the staff token, never the admin/service client. The API returns 401 for missing/invalid sessions and 403 for nonmembers. Responses are private/no-store. Sign-out clears the local staff session and removes dashboard state and subscriptions.

The API accepts only `{id, from, to}` for actions. It never accepts prices, totals or payment updates. Expected-current-status matching protects against conflicting tablet actions. The new database trigger also prevents bypassing lifecycle rules through direct authenticated requests. Existing grants permit only `order_status` changes and the existing history trigger records the staff actor.

Allowed transitions:

- New → accepted, rejected or cancelled.
- Accepted → preparing or cancelled.
- Preparing → ready or cancelled.
- Ready → completed or cancelled.
- Completed, rejected and cancelled are terminal.

Reject and cancel require a confirmation dialog. These actions do not issue refunds or change payment state. There is no Stripe integration.

## Realtime and alerts

The existing `subscribeToOrders` utility subscribes to INSERT/UPDATE events using the staff session. Each event triggers a fresh authorized fetch including order items. Cards deduplicate by order UUID and sort newest first. Fetches are serialized and coalesced so bursts cannot overwrite newer snapshots with older requests.

The board refetches on subscription/reconnection, every 15 seconds, on window focus, and on return from a hidden/offline state. This recovers orders missed during disconnection. A connection indicator and last-checked time show freshness; failed refreshes retain existing cards with a stale warning and disable actions. Membership is rechecked periodically and on every data/action request.

All unacknowledged new orders, including those already waiting when the board opens, show a prominent banner and highlighted cards. Click **Acknowledge**, or perform an action, to dismiss the local highlight. Other tablets acknowledge independently. Reloading the board highlights still-new orders again.

Click **Enable order sounds** on each board visit. A browser-generated three-tone chime plays as a sound test and for new alerts; it repeats every 30 seconds while an unacknowledged new order remains. The button reflects suspended audio so staff can re-enable it after a browser interruption. Keep the live board visible, device volume on and the tablet awake: this phase does not provide background push notifications, audio while the app is closed, or an offline order queue. History is for reviewing completed work; return to the live board to monitor new-order alerts.

## History and tablet preparation

`/admin/orders/history` includes completed, rejected and cancelled orders. Today, Yesterday and Date filter the **received date in Europe/Paris**, including DST changes. Order number is an exact match; **All dates** searches that number across days. Active orders are excluded.

The interface has large touch controls, landscape tablet columns, and stacked layouts for narrower screens. Admin pages include a scoped web manifest and Apple standalone metadata. This is PWA preparation only: no service worker caches customer information, and there is no native/background functionality. The production `/etandoori` base path is preserved.

## Test customer → tablet locally

1. Apply the migration and create a staff account as above.
2. Run `npm run dev`. Use `/admin/login` in the tablet browser and open `/admin/orders`. Enable sounds.
3. Use a different browser/private window to open `/order-online`, add items and complete checkout. This creates a real order in the configured database; use a test project for trial orders.
4. Confirm the order appears on the tablet with its notes and total. Acknowledge it, then Accept → Start preparing → Ready → Complete. Check History and the database status history.
5. Disconnect/reconnect the tablet and verify the live state recovers. A second staff browser should also see status changes.

Production requires a running Next.js server; GitHub Pages alone cannot host the API. `npm run build && npm start` serves the dashboard at `/etandoori/admin/login/`.

## Automated checks

```bash
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:admin:browser
```

Unit tests cover access checks, lifecycle validation, rejected price/payment inputs, deduplication/sorting and Paris-date history filtering. Isolated PostgreSQL fixtures verify RLS, column permissions, concurrent-action protection, staff history attribution and every lifecycle pair. Browser tests use mocked Auth, API and WebSocket traffic, test anonymous API denial against the actual route, and create no production accounts or orders. Browser tests start their own production server on port 3106; build first and ensure the port is free. Configure the public Supabase URL/key before building (mock values also work for browser-only tests).

## Files added or changed

- `app/admin/layout.tsx`, `app/admin/manifest.webmanifest/route.ts`: admin metadata and scoped manifest.
- `app/admin/login/page.tsx`: staff sign-in.
- `app/admin/orders/layout.tsx`, `page.tsx`, `history/page.tsx`: protected board/history routes.
- `app/api/admin/session/route.ts`, `app/api/admin/orders/route.ts`: authorized session, order reads and status updates.
- `components/admin/StaffGate.tsx`: membership gate, staff navigation and sign-out.
- `components/admin/OrderBoard.tsx`, `OrderCard.tsx`, `OrderHistory.tsx`: tablet board, order details/actions and history filters.
- `components/admin/OrderSound.tsx`, `useOrders.ts`: audio alerts, Realtime, refresh and reconnect behavior.
- `lib/admin/access.ts`, `server.ts`, `client.ts`: shared access validation and scoped API clients.
- `lib/admin/orders.ts`, `copy.ts`: lifecycle/deduplication/date helpers, types and French/English/German copy.
- `supabase/migrations/20260921000100_order_status_transitions.sql`: database lifecycle guard.
- `supabase/tests/admin.sql`, `tests/admin.test.ts`, `tests/admin.browser.spec.ts`, `tests/database.test.mjs`: security, logic and browser fixtures.
- `playwright.config.ts`, `package.json`, `package-lock.json`, `.gitignore`: reproducible browser test setup and scripts.
- `docs/restaurant-dashboard.md`, `README.md`: setup and operator instructions.

Existing customer pages, menu content and styling were not changed for this phase.

## Tablet UI refinement (before Stripe)

The live board uses a compact header with a Paris clock, connection state, sound control, language, history and sign-out. New / Preparing / Ready columns keep their own scroll position on screens at least 760px wide; narrower layouts stack the columns. Accepted orders share Preparing and retain an explicit Accepted badge.

Cards prioritize order number, delivery/pickup, age, quantities, item notes, customer/address and total. Read-only detail dialogs retain email, unit prices and the complete financial breakdown. Primary actions are large; reject/cancel still use the original confirmation and mutation logic. History is now a compact table with the same filters and full-detail dialogs.

Age is a visual indicator only: 10–19 minutes shows Waiting; 20+ shows Long wait. It does not change status, prioritization, sorting or restaurant deadlines. New cards receive a brief non-moving highlight, respecting reduced-motion preferences. A fixed-height alert strip avoids shifting the board; its notification button focuses the New column. Unacknowledged highlights and existing sounds retain their previous behavior.

This refinement changes presentation only. Authentication, API handlers, RLS/migrations, subscriptions, recovery polling, deduplication, order transitions and sound generation are unchanged. It requires no migration or Supabase configuration.

UI refinement files:

- Updated `components/admin/StaffGate.tsx`, `OrderBoard.tsx`, `OrderCard.tsx`, `OrderHistory.tsx`, `OrderSound.tsx`.
- Added `components/admin/DashboardShell.tsx`, `ConnectionStatus.tsx`, `OrderParts.tsx`, `OrderDetails.tsx`, `dashboard.module.css`.
- Updated `lib/admin/copy.ts`; added `lib/admin/presentation.ts` for visual age indicators.
- Updated `tests/admin.test.ts`, `tests/admin.browser.spec.ts`, and this document.

Browser checks cover landscape 1024×768, 1180×820 and 1366×1024; portrait 768×1024; small tablet 800×600; desktop 1440×900; and narrow 600×900 layouts. They check all three UI languages, overflow, scrollable columns, order notes, keyboard dialog access/focus restoration, reduced motion and history details using fixtures. These are Chromium viewport simulations, not physical iPad/Android hardware tests.
