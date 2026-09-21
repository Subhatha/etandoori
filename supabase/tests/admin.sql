-- Isolated fixtures, always rolled back. Run as database owner.
begin;
create function pg_temp.assert_true(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Assertion failed: %', message; end if; end; $$;
create function pg_temp.expect_error(statement text, expected_state text) returns void language plpgsql as $$
begin
  begin execute statement; exception when others then if sqlstate = expected_state then return; end if; raise; end;
  raise exception 'Expected SQLSTATE %, statement succeeded: %', expected_state, statement;
end; $$;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000011'), ('00000000-0000-4000-8000-000000000012');
insert into public.restaurant_users(id,auth_user_id,name,role) values ('10000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000011','Tablet test staff','staff');
insert into public.orders(id,customer_name,customer_phone,order_type,subtotal,total) values ('30000000-0000-4000-8000-000000000011','Fixture','0000000000','pickup',10,10);
select pg_temp.assert_true((select count(*) = 5 from pg_class where oid in ('public.orders'::regclass,'public.order_items'::regclass,'public.menu_items'::regclass,'public.restaurant_users'::regclass,'public.order_status_history'::regclass) and relrowsecurity), 'RLS enabled');
set local role anon;
select pg_temp.expect_error('select * from public.orders','42501');
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 0 from public.orders), 'customers cannot read orders');
select pg_temp.assert_true((select count(*) = 0 from public.order_items), 'customers cannot read items');
select pg_temp.assert_true((select count(*) = 0 from public.restaurant_users), 'customers cannot read memberships');
update public.orders set order_status = 'accepted';
reset role;
select pg_temp.assert_true((select order_status = 'new' from public.orders where id = '30000000-0000-4000-8000-000000000011'), 'customer cannot update status');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000011',true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 1 from public.orders where id = '30000000-0000-4000-8000-000000000011'), 'staff can read');
select pg_temp.expect_error($q$update public.orders set order_status='completed' where id='30000000-0000-4000-8000-000000000011'$q$,'23514');
select pg_temp.expect_error('update public.orders set subtotal=0,total=0','42501');
select pg_temp.expect_error($q$update public.orders set payment_status='paid'$q$,'42501');
select pg_temp.expect_error('update public.order_items set unit_price=0','42501');
update public.orders set order_status='accepted' where id='30000000-0000-4000-8000-000000000011' and order_status='new';
-- A stale tablet's expected-status condition cannot overwrite the accepted state.
update public.orders set order_status='rejected' where id='30000000-0000-4000-8000-000000000011' and order_status='new';
select pg_temp.assert_true((select order_status='accepted' from public.orders where id='30000000-0000-4000-8000-000000000011'), 'stale action ignored');
update public.orders set order_status='preparing' where id='30000000-0000-4000-8000-000000000011';
update public.orders set order_status='ready' where id='30000000-0000-4000-8000-000000000011';
update public.orders set order_status='completed' where id='30000000-0000-4000-8000-000000000011';
select pg_temp.expect_error($q$update public.orders set order_status='new' where id='30000000-0000-4000-8000-000000000011'$q$,'23514');
select pg_temp.assert_true((select count(*)=4 from public.order_status_history where order_id='30000000-0000-4000-8000-000000000011' and changed_by='10000000-0000-4000-8000-000000000011'), 'staff actor recorded for each transition');
reset role;
-- Test every lifecycle pair against the SQL guard, including terminal states.
do $$
declare source public.order_status; target public.order_status; identifier uuid; permitted boolean;
begin
 foreach source in array enum_range(null::public.order_status) loop
  foreach target in array enum_range(null::public.order_status) loop
   identifier := gen_random_uuid();
   insert into public.orders(id,customer_name,customer_phone,order_type,subtotal,total,order_status) values(identifier,'Lifecycle fixture','0000000','pickup',0,0,source);
   permitted := source=target or (source='new' and target in ('accepted','rejected','cancelled')) or (source='accepted' and target in ('preparing','cancelled')) or (source='preparing' and target in ('ready','cancelled')) or (source='ready' and target in ('completed','cancelled'));
   if permitted then update public.orders set order_status=target where id=identifier;
   else perform pg_temp.expect_error(format('update public.orders set order_status=%L where id=%L',target,identifier),'23514'); end if;
  end loop;
 end loop;
end; $$;
rollback;
