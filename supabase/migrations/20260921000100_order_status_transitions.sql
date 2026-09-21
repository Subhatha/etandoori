-- Enforce lifecycle rules even when a client bypasses the dashboard API.
-- Existing RLS, grants, history trigger and Realtime publication are unchanged.
create function private.enforce_order_status_transition() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.order_status = old.order_status then return new; end if;
  if not (
    (old.order_status = 'new' and new.order_status in ('accepted','rejected','cancelled')) or
    (old.order_status = 'accepted' and new.order_status in ('preparing','cancelled')) or
    (old.order_status = 'preparing' and new.order_status in ('ready','cancelled')) or
    (old.order_status = 'ready' and new.order_status in ('completed','cancelled'))
  ) then
    raise exception 'Invalid order status transition' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_order_status_transition() from public;
create trigger orders_validate_status before update of order_status on public.orders
for each row execute function private.enforce_order_status_transition();
