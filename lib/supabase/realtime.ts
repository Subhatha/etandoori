"use client";

import type { RealtimePostgresChangesPayload, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

type Order = Database["public"]["Tables"]["orders"]["Row"];

/**
 * Call after staff sign-in, then fetch the initial orders once SUBSCRIBED.
 * Refetch on reconnect: Realtime events are notifications, not a durable queue.
 * Dispose with `await client.removeChannel(channel)` when leaving the dashboard.
 * RLS restricts events to registered restaurant staff/admin users.
 */
export function subscribeToOrders(
  client: SupabaseClient<Database>,
  onChange: (payload: RealtimePostgresChangesPayload<Order>) => void,
  onStatus?: (status: string, error?: Error) => void,
) {
  return client
    .channel(`restaurant-orders-${crypto.randomUUID()}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, onChange)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, onChange)
    .subscribe(onStatus);
}
