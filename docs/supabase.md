# Supabase setup

The existing informational pages, translations, menu data and images are preserved.
Customer ordering now uses Supabase; see [ordering.md](ordering.md) for the additional
migration, checkout and server hosting requirements. No payment integration or tablet
dashboard is included.

## Configure the project

1. Create a Supabase project and keep its database password private.
2. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from Project Settings → API/API Keys.
   The public key can also be the legacy `anon` key. Never use a secret or
   `service_role` key in a `NEXT_PUBLIC_` variable.
3. Apply `supabase/migrations/20260917000100_restaurant_ordering.sql` once in the
   Supabase SQL Editor as the project database owner. Alternatively, with the
   Supabase CLI installed, run `supabase init`, `supabase link --project-ref YOUR_REF`
   and `supabase db push`. Do not apply through both routes. If applied manually,
   reconcile migration history before subsequently using CLI migrations.
4. Create/invite your first operator in Authentication → Users. Copy that user's
   UUID and bootstrap the first admin in the SQL Editor:

   ```sql
   insert into public.restaurant_users (auth_user_id, name, role)
   values ('REPLACE_WITH_AUTH_USER_UUID', 'Restaurant administrator', 'admin');
   ```

   Create additional Auth users and add their UUIDs as `staff` or `admin`. Ordinary
   Auth signups have no restaurant privileges. No password or admin is seeded.
   Configure Auth Site URL/allowed redirect URLs for your eventual sign-in flow;
   include the production `/etandoori` base path where relevant.
5. In Database → Publications, verify `orders` is in `supabase_realtime` (the
   migration adds it). Keep `private` out of the Data API's exposed schemas.
6. Run `supabase/tests/ordering.sql` in the SQL Editor to check permissions,
   constraints and automatic history. It uses temporary fixture UUIDs and ends
   with `ROLLBACK`, leaving no fixture data behind.
7. Set the two public variables in the build/deployment environment and rebuild.
   Next.js embeds public values at build time. `.env.local` is ignored by Git;
   only the placeholder `.env.example` is tracked.

## Client utilities

- `getSupabaseBrowserClient()` from `lib/supabase/browser.ts`: lazy singleton,
  call in client effects/handlers. Uses normal Supabase Auth session persistence.
- `createSupabaseServerClient(accessToken?)` from `lib/supabase/server.ts`: a fresh
  RLS-scoped client per request; pass the caller's Supabase access token to act as
  that user, otherwise queries are anonymous. No shared sessions, cookie handling
  or automatic server token refresh. For cookie-based SSR login later, add the
  Supabase SSR integration as part of that feature.
- `createSupabaseAdminClient()` from `lib/supabase/admin.ts`: server-only, bypasses
  RLS. Requires `SUPABASE_SECRET_KEY` (new secret key or legacy service-role key).
  Only set this on trusted server infrastructure, not the static frontend build.
  Authorize the caller before invoking privileged operations.

Ordering now requires a Next.js server deployment. Static export is disabled;
GitHub Pages alone cannot run the order API.

## Data and access model

| Actor | Access |
| --- | --- |
| Anonymous / ordinary signed-in customer | Read available menu items only |
| Staff | Read all menu items, orders, order items and history; read own membership; update only `orders.order_status` |
| Admin | Staff access, plus menu and restaurant membership management |
| Trusted backend / service role | Create orders and items; manage payment fields and totals |

RLS is enabled on all five tables. Table/column grants additionally prevent staff
or admin browser sessions from changing prices, customer details or payment fields
on orders. Only admins can change menu prices. History is written by a trigger,
not directly by browser clients. Deleting an Auth account removes its membership;
previous history keeps the row with a null actor. Avoid removing the last admin.

Money is numeric with two decimal places (EUR). Order numbers use a concurrent-safe
identity sequence; gaps are normal. Each line total is generated from quantity ×
unit price. The order total must equal subtotal + delivery fee. Delivery requires
an address, pickup has a zero delivery fee. Menu deletion preserves order snapshots
and sets their menu reference to null. Deleting an order cascades its items/history;
only trusted server operations can delete orders.

`name` and `description` are JSON objects with `fr`, `en` and `de` strings; `category`
is a stable slug. `item_name` is the purchased name snapshot in the customer's
language. Existing `lib/menu.ts` is not imported or replaced: seeding remains explicit and order-online now reads available database items. The import mapping described below represents each wine serving as its own
database row while preserving the existing grouped display.

The Phase 1 order endpoint validates availability, takes prices from the DB,
calculates delivery fees, and inserts the order and items atomically through the
additional secure-order migration. Its subtotal equals the sum of line totals. This cross-table rule is
not enforced by the initial schema; no untrusted client can write those values.
Payment state changes must come from a trusted backend. Order status values are
validated, but a business-specific transition state machine is not yet defined.

## Realtime for the future tablet

After signing in as a registered restaurant user, call `subscribeToOrders(client,
onChange, onStatus)` from `lib/supabase/realtime.ts`. It subscribes to order INSERT
and UPDATE events. On `SUBSCRIBED`, fetch the current orders; also refetch after
reconnect. Events are not a durable queue. Remove the channel on unmount with
`await client.removeChannel(channel)`. Surface `CHANNEL_ERROR` / `TIMED_OUT` in the
future dashboard. The subscription never uses a service key; RLS controls delivery.
Order history/items can be fetched after each event and are not published yet.

## Types and validation

`database.types.ts` contains initial types matching the migration. After applying
schema changes, regenerate with the Supabase CLI:

```sh
supabase gen types typescript --linked --schema public > lib/supabase/database.types.ts
npm run lint
npm run build
```

Official references: [API keys](https://supabase.com/docs/guides/getting-started/api-keys),
[Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes),
[Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Development connection check

Run `npm run dev`, then open
[http://localhost:3000/api/dev/supabase-check](http://localhost:3000/api/dev/supabase-check).
Use the port printed by Next.js if 3000 is occupied. Restart the dev server after
changing `.env.local`.

The endpoint uses the existing server utility without a user session, so it tests
anonymous access with the public key and RLS. It selects up to ten available menu
items and returns their total visible count. `ok: true` with an empty array still
means the connection works; this setup has not seeded the local website menu into
the database. No inserts or updates are performed. An empty result alone does not
prove rows exist or that a policy exposes them.

The endpoint refuses privileged keys, does not return credentials, and returns
404 in production before creating a client or making any database request. It is
not linked from the website. It is available only with the development server.

Use the project **API URL** (`https://your-project-ref.supabase.co`), not the
`supabase.com/dashboard/project/...` dashboard page URL. The check reports this
configuration mistake without returning any credentials.

## Import the existing local menu

`lib/menu.ts` remains the only menu-content source. The informational menu remains local; order-online uses verified database rows. Run:

```sh
npm run db:seed                 # dry run; no credentials or writes required
npm run db:seed -- --apply      # insert missing rows, then verify through public RLS
npm run db:seed -- --verify     # verify every imported field and menu reconstruction
npm run test:menu               # mapping and fallback tests; no network
```

For `--apply`, put the project secret key (or legacy service-role key) in
`SUPABASE_SECRET_KEY` in `.env.local`. Never paste it into browser code or a public
environment variable. The CLI imports the existing server-only admin utility; the
website never imports the seed script or admin client. Verification uses only the
existing public-key server utility. No policies are changed.

Without a server credential, generate an equivalent SQL Editor import:

```sh
npm run db:seed -- --sql
```

Run the generated `/tmp/etandoori-menu-seed.sql` in your project's SQL Editor,
then run `npm run db:seed -- --verify` and visit the development connection check.
The generated SQL is a disposable snapshot, not a second maintained menu file.
Regenerate it after changing local content.

There are currently **81 displayed items and 89 import rows**. Four wines each have
three prices; each serving is a separate database row because `menu_items` has one
price per row. Names/descriptions are copied verbatim in all three languages, as
are image paths (including their existing `/etandoori` prefixes). Category slugs
come from each item's immediate category. Serving labels and the category tree
stay in the local source, so the read layer restores the exact existing layout.

UUIDv8 IDs are deterministically derived from a fixed namespace, the local item ID
and serving index. Preserve those IDs and serving order; changing them creates new
identities. The importer uses one atomic `ON CONFLICT (id) DO NOTHING` insert:
reruns do not duplicate these rows, overwrite edits or availability, or delete
anything. Concurrent imports are safe. It does not deduplicate arbitrary older
manual imports with unrelated UUIDs. If an existing imported row differs from the
source or is unavailable, verification reports that difference instead of silently
resetting it. Later catalogue updates require a separate deliberate update process.

`loadMenuData(client)` in `lib/supabase/menu-data.ts` accepts an existing browser or
server client. It reads available imported rows and reconstructs local ordering,
category labels, notes and wine options. Complete valid data returns `source:
"supabase"`; failed, malformed or incomplete reads return the unchanged local menu
with `source: "local"`. Local fallback is **display-only**: `orderableItems` is empty
in fallback mode. The ordering implementation fails closed without verified database items and
revalidates price/availability on the trusted backend.

The menu page and homepage slideshow retain their existing local content.
Order-online uses the database catalogue and supports cart and checkout.
