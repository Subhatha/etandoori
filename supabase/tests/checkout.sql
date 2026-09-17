begin;
create function pg_temp.check_ok(value boolean, message text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'Assertion failed: %',message; end if; end; $$;
create function pg_temp.must_fail(query text, message text) returns void language plpgsql as $$
begin
  begin execute query;
  exception when others then
    if position(message in sqlerrm)>0 then return; end if;
    raise;
  end;
  raise exception 'Expected failure: %',message;
end; $$;
insert into public.menu_items(id,name,category,price) values
 ('20000000-0000-4000-8000-000000000071','{"fr":"Test","en":"Test","de":"Test"}','test-checkout',10.15),
 ('20000000-0000-4000-8000-000000000072','{"fr":"Test","en":"Test","de":"Test"}','test-checkout',5.90);
set local role anon;
select pg_temp.must_fail($q$select public.create_restaurant_order('30000000-0000-4000-8000-000000000071',repeat('a',64),'{}','[]',0,'en')$q$,'permission denied');
reset role;
set local role authenticated;
select pg_temp.must_fail($q$select public.create_restaurant_order('30000000-0000-4000-8000-000000000071',repeat('a',64),'{}','[]',0,'en')$q$,'permission denied');
reset role;
set local role service_role;
select public.create_restaurant_order('30000000-0000-4000-8000-000000000071',repeat('a',64),
 '{"name":"Test","phone":"0612345678","orderType":"pickup"}',
 '[{"id":"20000000-0000-4000-8000-000000000071","quantity":2,"unit_price":10.15,"item_name":"Test","notes":"Test note"}]',0,'en');
select pg_temp.check_ok((select subtotal=20.30 and total=20.30 and payment_status='pending' and order_status='new' and payment_provider is null and payment_reference is null from public.orders where id='30000000-0000-4000-8000-000000000071'),'server totals and default statuses');
select pg_temp.check_ok((select count(*)=1 from public.order_items where order_id='30000000-0000-4000-8000-000000000071'),'one item');
select pg_temp.check_ok((select count(*)=1 from public.order_status_history where order_id='30000000-0000-4000-8000-000000000071'),'initial history');
-- Retrying same request returns original order even after menu changes.
update public.menu_items set available=false where id='20000000-0000-4000-8000-000000000071';
select public.create_restaurant_order('30000000-0000-4000-8000-000000000071',repeat('a',64),'{}','[]',0,'en');
select pg_temp.check_ok((select count(*)=1 from public.orders where id='30000000-0000-4000-8000-000000000071'),'idempotent retry');
select pg_temp.must_fail($q$select public.create_restaurant_order('30000000-0000-4000-8000-000000000071',repeat('b',64),'{}','[]',0,'en')$q$,'request_conflict');
-- Unavailable second line must not leave the valid first line or an order behind.
select pg_temp.must_fail($q$select public.create_restaurant_order('30000000-0000-4000-8000-000000000072',repeat('b',64),
 '{"name":"Test","phone":"0612345678","orderType":"pickup"}',
 '[{"id":"20000000-0000-4000-8000-000000000072","quantity":1,"unit_price":5.9,"item_name":"Test"},{"id":"20000000-0000-4000-8000-000000000071","quantity":1,"unit_price":10.15,"item_name":"Test"}]',0,'en')$q$,'item_unavailable');
select pg_temp.check_ok((select count(*)=0 from public.orders where id='30000000-0000-4000-8000-000000000072'),'no partial order');
select pg_temp.check_ok((select count(*)=0 from public.order_items where order_id='30000000-0000-4000-8000-000000000072'),'no partial items');
select pg_temp.must_fail($q$select public.create_restaurant_order('30000000-0000-4000-8000-000000000072',repeat('b',64),
 '{"name":"Test","phone":"0612345678","orderType":"pickup"}',
 '[{"id":"20000000-0000-4000-8000-000000000072","quantity":1,"unit_price":0,"item_name":"Test"}]',0,'en')$q$,'price_changed');
select public.create_restaurant_order('30000000-0000-4000-8000-000000000073',repeat('c',64),
 '{"name":"Test","phone":"0612345678","orderType":"delivery","street":"Test street","postalCode":"74200","city":"Thonon"}',
 '[{"id":"20000000-0000-4000-8000-000000000072","quantity":4,"unit_price":5.9,"item_name":"Test — Glass"}]',3.5,'en');
select pg_temp.check_ok((select subtotal=23.6 and delivery_fee=3.5 and total=27.1 and delivery_address is not null from public.orders where id='30000000-0000-4000-8000-000000000073'),'delivery totals');
reset role;
rollback;
