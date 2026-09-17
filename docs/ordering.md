# Customer ordering, Phase 1

## Setup and local test

1. Keep the public Supabase URL/publishable key and server-only `SUPABASE_SECRET_KEY` in `.env.local` (see `.env.example`). Never prefix the secret with `NEXT_PUBLIC_`.
2. After the initial restaurant schema, run `supabase/migrations/20260917000200_secure_order_creation.sql` once in Supabase's SQL Editor. This adds a retry fingerprint and the service-only transactional order function. It leaves RLS policies enabled and unchanged.
3. Ensure the menu import is complete (`npm run db:seed -- --verify`; import missing rows with `npm run db:seed -- --apply`).
4. Run `npm run dev`, open `/order-online`, add dishes (including a wine serving), open the cart, and check quantity, notes and persistence after refresh.
5. Open checkout. Test pickup without an address, then delivery with a listed town and its minimum subtotal. Enter customer details and place an order. This creates a real pending/new order in the configured Supabase project; use a test project for trial orders.
6. Check the confirmation and Supabase orders, order_items and order_status_history. The cart clears only after success; failures retain it. No payment is collected in this phase.

## Delivery configuration

`lib/ordering/config.ts` is the single server-only delivery surcharge configuration (integer cents, in the eight regions' existing order). All surcharges currently equal zero. The eight areas and minimum subtotals come from `lib/restaurant.ts`, starting at €20 for Thonon and up to €65 for the furthest area. These are minimum order amounts, not added fees. Checkout displays the server configuration; the server independently validates the selected area, town, postal code and minimum.

## State and security

The cart stores menu UUIDs, quantities and notes in `localStorage` under `etandoori-cart-v1`, including cross-tab updates. Each wine serving has a separate database UUID. Current catalogue data supplies names, images and price previews. Ordering fails closed when that catalogue cannot be loaded; the existing informational menu remains intact.

Only `/api/orders` creates orders. It validates and bounds input, ignores submitted prices, reads current available items, and computes integer-cent totals. Its server-only admin client calls a restricted PostgreSQL function, which locks menu rows, rechecks prices and availability, and atomically writes the order and all items. Anonymous/authenticated clients cannot execute that function. Existing RLS remains enabled.

A request UUID and normalized payload fingerprint prevent duplicate orders on retry. The same ID with changed input is rejected. Confirmation is kept in sessionStorage for the current browser tab; there is no public order lookup endpoint. Payment stays pending with empty provider/reference; order status starts new.

## Verification and hosting

Run `npm run lint`, `npm test`, and `npm run build`. Tests cover cart arithmetic and limits, variants, invalid customer inputs, manipulated totals, delivery/pickup, unavailable items, PostgreSQL permissions, idempotency and transaction rollback. Database tests run in isolated PGlite and do not create live Supabase orders.

Checkout requires a running Next.js server. Static export was removed; GitHub Pages alone cannot host the API. Deploy to a Node-compatible Next.js host with the same environment variables. Production retains the existing `/etandoori` base path; `npm run build && npm start` serves `/etandoori/order-online/`. Restart the server after changing environment variables.

## Phase 1 file inventory

- `app/order-online/page.tsx`: enables ordering using the existing catalogue presentation.
- `app/cart/page.tsx`, `app/checkout/page.tsx`, `app/order-confirmation/page.tsx`: cart, customer form and receipt.
- `app/api/orders/route.ts`: validated server-only order creation and retry handling.
- `app/api/ordering/menu/route.ts`, `app/api/ordering/config/route.ts`: current catalogue and delivery configuration.
- `components/ordering/CartProvider.tsx`: persistent shared cart and successful-order cleanup.
- `components/ordering/CartContents.tsx`, `CartLink.tsx`, `OrderMenu.tsx`, `OrderShell.tsx`, `useCatalog.ts`: cart controls, navigation, ordering cards, shared styling and catalogue fetching.
- `lib/ordering/cart.ts`, `catalog.ts`, `config.ts`, `copy.ts`, `paths.ts`, `types.ts`, `validation.ts`: calculations, database catalogue, delivery fees, three-language copy, API paths, types and validation.
- `app/layout.tsx`, `components/layout/Navbar.tsx`, `components/menu/FullMenu.tsx`, `components/ui/Logo.tsx`: provider wiring, cart/order links and compact mobile logo spacing.
- `lib/supabase/database.types.ts`: transactional RPC and fingerprint types.
- `supabase/migrations/20260917000200_secure_order_creation.sql`: atomic, service-only creation with retry protection.
- `tests/ordering.test.ts`, `tests/database.test.mjs`, `supabase/tests/checkout.sql`: application and isolated PostgreSQL tests.
- `next.config.ts`: enables the server runtime required by API routes.
- `package.json`, `package-lock.json`: test commands and PGlite development dependency.
- `.env.example`, `README.md`, `docs/supabase.md`, `docs/ordering.md`: configuration, hosting and test instructions.

Existing local menu data, prices, translations and image paths are unchanged.
