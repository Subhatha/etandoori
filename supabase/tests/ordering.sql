-- Run as the database owner after the migration. All fixtures are rolled back.
begin;

create function pg_temp.assert_true(ok boolean, message text) returns void
language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'Assertion failed: %', message; end if;
end;
$$;
create function pg_temp.expect_error(statement text, expected_state text) returns void
language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise;
  end;
  raise exception 'Expected SQLSTATE %, but statement succeeded: %', expected_state, statement;
end;
$$;

insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002'),
 ('00000000-0000-4000-8000-000000000003');
insert into public.restaurant_users(id, auth_user_id, name, role) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Test admin','admin'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','Test staff','staff');
insert into public.menu_items(id,name,category,price,available) values
 ('20000000-0000-4000-8000-000000000001','{"fr":"Test","en":"Test","de":"Test"}','test',10,true),
 ('20000000-0000-4000-8000-000000000002','{"fr":"Test caché","en":"Hidden test","de":"Versteckter Test"}','test',12,false);
insert into public.orders(id,customer_name,customer_phone,order_type,subtotal,total) values
 ('30000000-0000-4000-8000-000000000001','Test customer','0000000000','pickup',20,20);
insert into public.order_items(order_id,menu_item_id,item_name,quantity,unit_price) values
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Test',2,10);

select pg_temp.assert_true((select total_price = 20 from public.order_items where order_id = '30000000-0000-4000-8000-000000000001'), 'generated line total');
select pg_temp.assert_true((select count(*) = 1 from public.order_status_history where order_id = '30000000-0000-4000-8000-000000000001' and status = 'new' and changed_by is null), 'initial history');
select pg_temp.expect_error($q$insert into public.menu_items(name,category,price) values ('{"fr":"Test"}','test',10)$q$, '23514');
select pg_temp.expect_error($q$insert into public.menu_items(name,category,price) values ('{"fr":"T","en":"T","de":"T"}','test',-1)$q$, '23514');
select pg_temp.expect_error($q$insert into public.orders(customer_name,customer_phone,order_type,subtotal,total) values ('Test','000','delivery',10,10)$q$, '23514');
select pg_temp.expect_error($q$insert into public.orders(customer_name,customer_phone,order_type,subtotal,total) values ('Test','000','pickup',10,9)$q$, '23514');
select pg_temp.expect_error($q$insert into public.order_items(order_id,item_name,quantity,unit_price) values ('30000000-0000-4000-8000-000000000001','Test',0,10)$q$, '23514');
select pg_temp.expect_error($q$insert into public.order_items(order_id,item_name,quantity,unit_price) values ('39999999-0000-4000-8000-000000000001','Test',1,10)$q$, '23503');

set local role anon;
select pg_temp.assert_true((select count(*) = 1 from public.menu_items where category = 'test'), 'anonymous sees only available items');
select pg_temp.expect_error('select * from public.orders', '42501');
select pg_temp.expect_error('select * from public.order_items', '42501');
select pg_temp.expect_error('select * from public.restaurant_users', '42501');
select pg_temp.expect_error('select * from public.order_status_history', '42501');
select pg_temp.expect_error($q$insert into public.orders(customer_name,customer_phone,order_type,subtotal,total) values ('Fake','000','pickup',0,0)$q$, '42501');
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 0 from public.orders), 'ordinary auth user sees no orders');
select pg_temp.assert_true((select count(*) = 0 from public.restaurant_users), 'ordinary user sees no memberships');
select pg_temp.expect_error($q$insert into public.restaurant_users(auth_user_id,name,role) values ('00000000-0000-4000-8000-000000000003','Escalation','admin')$q$, '42501');
update public.orders set order_status = 'rejected' where id = '30000000-0000-4000-8000-000000000001';
reset role;
select pg_temp.assert_true((select order_status = 'new' from public.orders where id = '30000000-0000-4000-8000-000000000001'), 'unauthorized status update affects no rows');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 2 from public.menu_items where category = 'test'), 'staff sees unavailable menu');
select pg_temp.assert_true((select count(*) = 1 from public.orders where id = '30000000-0000-4000-8000-000000000001'), 'staff reads order');
select pg_temp.assert_true((select count(*) = 1 from public.restaurant_users), 'staff reads only own membership');
update public.orders set order_status = 'accepted' where id = '30000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select count(*) = 1 from public.order_status_history where order_id = '30000000-0000-4000-8000-000000000001' and status = 'accepted' and changed_by = '10000000-0000-4000-8000-000000000002'), 'status actor captured');
update public.orders set order_status = 'accepted' where id = '30000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select count(*) = 2 from public.order_status_history where order_id = '30000000-0000-4000-8000-000000000001'), 'unchanged status has no duplicate history');
select pg_temp.expect_error($q$update public.orders set payment_status = 'paid'$q$, '42501');
select pg_temp.expect_error('update public.orders set total = 0', '42501');
select pg_temp.expect_error('delete from public.order_status_history', '42501');
select pg_temp.expect_error($q$insert into public.order_status_history(order_id,status) values ('30000000-0000-4000-8000-000000000001','completed')$q$, '42501');
update public.restaurant_users set role = 'admin' where auth_user_id = '00000000-0000-4000-8000-000000000002';
update public.menu_items set price = 0 where id = '20000000-0000-4000-8000-000000000001';
reset role;
select pg_temp.assert_true((select role = 'staff' from public.restaurant_users where auth_user_id = '00000000-0000-4000-8000-000000000002'), 'staff cannot promote self');
select pg_temp.assert_true((select price = 10 from public.menu_items where id = '20000000-0000-4000-8000-000000000001'), 'staff cannot alter menu prices');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
set local role authenticated;
update public.menu_items set price = 11 where id = '20000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select price = 11 from public.menu_items where id = '20000000-0000-4000-8000-000000000001'), 'admin can edit menu');
insert into public.restaurant_users(auth_user_id,name,role) values ('00000000-0000-4000-8000-000000000003','New staff','staff');
select pg_temp.expect_error($q$update public.orders set payment_status = 'paid'$q$, '42501');
reset role;

select set_config('request.jwt.claim.sub','',true);
set local role service_role;
update public.orders set payment_status = 'paid' where id = '30000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select payment_status = 'paid' from public.orders where id = '30000000-0000-4000-8000-000000000001'), 'backend can update payment');
reset role;
delete from public.menu_items where id = '20000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select menu_item_id is null and item_name = 'Test' and unit_price = 10 from public.order_items where order_id = '30000000-0000-4000-8000-000000000001'), 'snapshot survives menu deletion');
select pg_temp.assert_true(exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'), 'orders publication enabled');

rollback;
