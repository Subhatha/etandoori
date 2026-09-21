import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('PostgreSQL constraints, RLS, atomic checkout and retry protection', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated,service_role;
    `);
    for (const file of [
      'supabase/migrations/20260917000100_restaurant_ordering.sql',
      'supabase/migrations/20260917000200_secure_order_creation.sql',
      'supabase/migrations/20260921000100_order_status_transitions.sql',
      'supabase/tests/ordering.sql',
      'supabase/tests/checkout.sql',
      'supabase/tests/admin.sql',
    ]) await db.exec(await readFile(file, 'utf8'));
  } finally { await db.close(); }
});
