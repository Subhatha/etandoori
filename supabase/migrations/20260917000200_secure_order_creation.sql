begin;

-- Client-generated UUID + normalized payload fingerprint make retries idempotent.
alter table public.orders add column request_fingerprint text;

create function public.create_restaurant_order(
  p_request_id uuid, p_fingerprint text, p_customer jsonb,
  p_items jsonb, p_delivery_fee numeric, p_language text
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  existing public.orders%rowtype;
  menu public.menu_items%rowtype;
  line jsonb;
  subtotal_value numeric(10,2) := 0;
  order_id uuid;
  delivery_address_value text;
  notes_value text;
  result jsonb;
begin
  -- Serializes simultaneous retries with the same UUID within this transaction.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select * into existing from public.orders where id = p_request_id;
  if found then
    if existing.request_fingerprint is distinct from p_fingerprint then
      raise exception 'request_conflict';
    end if;
    order_id := existing.id;
  else
    if p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$'
      or p_language not in ('fr','en','de')
      or jsonb_typeof(p_items) is distinct from 'array'
      or jsonb_array_length(p_items) not between 1 and 50
      or p_delivery_fee is null or p_delivery_fee < 0 or p_delivery_fee > 100
      or p_delivery_fee <> round(p_delivery_fee, 2)
      or p_delivery_fee = 'NaN'::numeric then raise exception 'invalid_order'; end if;
    if p_customer->>'orderType' is null or p_customer->>'orderType' not in ('pickup','delivery')
      or length(btrim(coalesce(p_customer->>'name',''))) not between 1 and 100
      or length(btrim(coalesce(p_customer->>'phone',''))) not between 7 and 30
      then raise exception 'invalid_order'; end if;
    if (select count(distinct value->>'id') <> count(*) from jsonb_array_elements(p_items))
      or (select sum((value->>'quantity')::integer) > 100 from jsonb_array_elements(p_items)) then
      raise exception 'invalid_order';
    end if;

    -- Lock catalogue records in deterministic order; prices/availability cannot change
    -- between validation, line snapshots and transaction commit.
    perform id from public.menu_items
      where id in (select (value->>'id')::uuid from jsonb_array_elements(p_items))
      order by id for share;
    for line in select value from jsonb_array_elements(p_items) loop
      if (line->>'quantity') is null or (line->>'quantity') !~ '^[0-9]+$'
        or (line->>'quantity')::integer not between 1 and 20
        or length(coalesce(line->>'notes','')) > 300 then raise exception 'invalid_order'; end if;
      select * into menu from public.menu_items where id = (line->>'id')::uuid;
      if not found or not menu.available then raise exception 'item_unavailable'; end if;
      if (line->>'unit_price')::numeric is distinct from menu.price then raise exception 'price_changed'; end if;
      if length(coalesce(line->>'item_name','')) not between 1 and 500 then raise exception 'invalid_order'; end if;
      subtotal_value := subtotal_value + menu.price * (line->>'quantity')::integer;
    end loop;
    if subtotal_value > 10000 then raise exception 'invalid_order'; end if;
    if p_customer->>'orderType' = 'pickup' and p_delivery_fee <> 0 then raise exception 'invalid_order'; end if;
    delivery_address_value := case when p_customer->>'orderType' = 'delivery' then
      concat_ws(', ',p_customer->>'street',p_customer->>'postalCode',p_customer->>'city') else null end;
    notes_value := concat_ws(E'\n', nullif(p_customer->>'notes',''),
      case when p_customer->>'orderType' = 'delivery' and coalesce(p_customer->>'deliveryInstructions','') <> ''
        then concat('Delivery / Livraison / Lieferung: ',p_customer->>'deliveryInstructions') end);
    insert into public.orders(id,request_fingerprint,customer_name,customer_phone,customer_email,
      order_type,delivery_address,subtotal,delivery_fee,total,customer_notes,payment_status,order_status)
    values(p_request_id,p_fingerprint,p_customer->>'name',p_customer->>'phone',nullif(p_customer->>'email',''),
      (p_customer->>'orderType')::public.order_type,delivery_address_value,subtotal_value,p_delivery_fee,
      subtotal_value+p_delivery_fee,nullif(notes_value,''),'pending','new') returning id into order_id;
    for line in select value from jsonb_array_elements(p_items) loop
      select * into menu from public.menu_items where id = (line->>'id')::uuid;
      insert into public.order_items(order_id,menu_item_id,item_name,quantity,unit_price,notes)
      values(order_id,menu.id,line->>'item_name',(line->>'quantity')::integer,menu.price,nullif(line->>'notes',''));
    end loop;
  end if;
  select jsonb_build_object(
    'id',o.id,'order_number',o.order_number,'order_type',o.order_type,
    'customer_name',o.customer_name,'customer_phone',o.customer_phone,'customer_email',o.customer_email,
    'delivery_address',o.delivery_address,'customer_notes',o.customer_notes,
    'subtotal',o.subtotal,'delivery_fee',o.delivery_fee,'total',o.total,
    'order_status',o.order_status,'payment_status',o.payment_status,
    'items',(select jsonb_agg(jsonb_build_object('item_name',i.item_name,'quantity',i.quantity,
      'unit_price',i.unit_price,'total_price',i.total_price,'notes',i.notes) order by i.id)
      from public.order_items i where i.order_id=o.id)
  ) into result from public.orders o where o.id=order_id;
  return result;
end;
$$;
revoke all on function public.create_restaurant_order(uuid,text,jsonb,jsonb,numeric,text) from public, anon, authenticated;
grant execute on function public.create_restaurant_order(uuid,text,jsonb,jsonb,numeric,text) to service_role;
-- Existing RLS policies and browser write restrictions are unchanged.
commit;
