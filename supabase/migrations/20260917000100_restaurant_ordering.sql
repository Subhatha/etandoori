begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create type public.restaurant_role as enum ('admin', 'staff');
create type public.order_type as enum ('delivery', 'pickup');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type public.order_status as enum ('new', 'accepted', 'preparing', 'ready', 'completed', 'rejected', 'cancelled');

-- JSON objects preserve the site's French, English and German menu text.
create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name jsonb not null,
  description jsonb not null default '{"fr":"","en":"","de":""}'::jsonb,
  category text not null check (length(btrim(category)) > 0),
  price numeric(10,2) not null check (price >= 0 and price <> 'NaN'::numeric),
  image text,
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_name_languages check (
    jsonb_typeof(name) = 'object' and name ?& array['fr','en','de']
    and jsonb_typeof(name->'fr') = 'string' and length(btrim(name->>'fr')) > 0
    and jsonb_typeof(name->'en') = 'string' and length(btrim(name->>'en')) > 0
    and jsonb_typeof(name->'de') = 'string' and length(btrim(name->>'de')) > 0
  ),
  constraint menu_description_languages check (
    jsonb_typeof(description) = 'object' and description ?& array['fr','en','de']
    and jsonb_typeof(description->'fr') = 'string'
    and jsonb_typeof(description->'en') = 'string'
    and jsonb_typeof(description->'de') = 'string'
  )
);

create table public.restaurant_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  role public.restaurant_role not null default 'staff',
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_name text not null check (length(btrim(customer_name)) > 0),
  customer_phone text not null check (length(btrim(customer_phone)) > 0),
  customer_email text,
  order_type public.order_type not null,
  delivery_address text,
  subtotal numeric(10,2) not null check (subtotal >= 0 and subtotal <> 'NaN'::numeric),
  delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0 and delivery_fee <> 'NaN'::numeric),
  total numeric(10,2) not null check (total >= 0 and total <> 'NaN'::numeric),
  payment_status public.payment_status not null default 'pending',
  order_status public.order_status not null default 'new',
  payment_provider text,
  payment_reference text,
  customer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_requires_address check (
    order_type <> 'delivery' or (delivery_address is not null and length(btrim(delivery_address)) > 0)
  ),
  constraint pickup_has_no_delivery_fee check (order_type <> 'pickup' or delivery_fee = 0),
  constraint order_total_matches check (total = subtotal + delivery_fee)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name text not null check (length(btrim(item_name)) > 0),
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0 and unit_price <> 'NaN'::numeric),
  total_price numeric(10,2) generated always as (quantity * unit_price) stored,
  notes text
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  changed_by uuid references public.restaurant_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index menu_items_category_available_idx on public.menu_items(category, available);
create index orders_status_created_at_idx on public.orders(order_status, created_at desc);
create index orders_created_at_idx on public.orders(created_at desc);
create index orders_payment_status_idx on public.orders(payment_status);
create unique index orders_payment_reference_idx on public.orders(payment_provider, payment_reference)
  where payment_provider is not null and payment_reference is not null;
create index order_items_order_id_idx on public.order_items(order_id);
create index order_items_menu_item_id_idx on public.order_items(menu_item_id);
create index order_history_order_created_at_idx on public.order_status_history(order_id, created_at);
create index order_history_changed_by_idx on public.order_status_history(changed_by);

create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger menu_items_updated_at before update on public.menu_items
for each row execute function private.set_updated_at();
create trigger orders_updated_at before update on public.orders
for each row execute function private.set_updated_at();

-- SECURITY DEFINER avoids recursive restaurant_users policies. No caller-supplied
-- identity or role is accepted; membership comes only from the verified JWT uid.
create function private.current_restaurant_role() returns public.restaurant_role
language sql stable security definer set search_path = '' as $$
  select role from public.restaurant_users where auth_user_id = (select auth.uid());
$$;
revoke all on function private.current_restaurant_role() from public;
grant execute on function private.current_restaurant_role() to authenticated;

create function private.record_order_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.order_status is distinct from old.order_status then
    insert into public.order_status_history(order_id, status, changed_by)
    values (new.id, new.order_status,
      (select id from public.restaurant_users where auth_user_id = (select auth.uid())));
  end if;
  return new;
end;
$$;
create trigger orders_status_history after insert or update on public.orders
for each row execute function private.record_order_status();
revoke all on function private.set_updated_at() from public;
revoke all on function private.record_order_status() from public;

alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.restaurant_users enable row level security;
alter table public.order_status_history enable row level security;

-- Remove Supabase default API grants, then explicitly allow only needed actions.
revoke all on public.menu_items, public.orders, public.order_items,
  public.restaurant_users, public.order_status_history from anon, authenticated;
revoke all on sequence public.orders_order_number_seq from anon, authenticated;
grant select on public.menu_items to anon, authenticated;
grant insert, update, delete on public.menu_items to authenticated;
grant select on public.orders, public.order_items, public.restaurant_users,
  public.order_status_history to authenticated;
-- Even an admin browser session cannot change amounts or payment status.
grant update (order_status) on public.orders to authenticated;
grant insert, update, delete on public.restaurant_users to authenticated;
grant all on public.menu_items, public.orders, public.order_items,
  public.restaurant_users, public.order_status_history to service_role;
grant usage, select on sequence public.orders_order_number_seq to service_role;

create policy menu_public_read on public.menu_items for select to anon, authenticated
using (available = true);
create policy menu_staff_read on public.menu_items for select to authenticated
using ((select private.current_restaurant_role()) in ('admin','staff'));
create policy menu_admin_insert on public.menu_items for insert to authenticated
with check ((select private.current_restaurant_role()) = 'admin');
create policy menu_admin_update on public.menu_items for update to authenticated
using ((select private.current_restaurant_role()) = 'admin')
with check ((select private.current_restaurant_role()) = 'admin');
create policy menu_admin_delete on public.menu_items for delete to authenticated
using ((select private.current_restaurant_role()) = 'admin');

create policy orders_staff_read on public.orders for select to authenticated
using ((select private.current_restaurant_role()) in ('admin','staff'));
create policy orders_staff_update_status on public.orders for update to authenticated
using ((select private.current_restaurant_role()) in ('admin','staff'))
with check ((select private.current_restaurant_role()) in ('admin','staff'));
create policy order_items_staff_read on public.order_items for select to authenticated
using ((select private.current_restaurant_role()) in ('admin','staff'));
create policy history_staff_read on public.order_status_history for select to authenticated
using ((select private.current_restaurant_role()) in ('admin','staff'));

create policy restaurant_users_read on public.restaurant_users for select to authenticated
using (auth_user_id = (select auth.uid()) or (select private.current_restaurant_role()) = 'admin');
create policy restaurant_users_admin_insert on public.restaurant_users for insert to authenticated
with check ((select private.current_restaurant_role()) = 'admin');
create policy restaurant_users_admin_update on public.restaurant_users for update to authenticated
using ((select private.current_restaurant_role()) = 'admin')
with check ((select private.current_restaurant_role()) = 'admin');
create policy restaurant_users_admin_delete on public.restaurant_users for delete to authenticated
using ((select private.current_restaurant_role()) = 'admin');

-- Orders are created only by a future trusted backend/Edge Function transaction.
-- No anonymous customer access or client-controlled pricing/payment writes.
-- History is trigger-owned: API users cannot forge or rewrite audit records.
-- Only orders are published now; INSERT/UPDATE payloads include current row data.
-- Default replica identity is enough and avoids publishing old customer details.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$$;

commit;
