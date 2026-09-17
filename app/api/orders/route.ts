import { createHash } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getOrderingCatalog } from "@/lib/ordering/catalog";
import { checkoutConfig } from "@/lib/ordering/config";
import { OrderError, priceOrder, validateOrder, selectedDelivery } from "@/lib/ordering/validation";
import type { Receipt } from "@/lib/ordering/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readBody(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new OrderError("invalid", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new OrderError("invalid");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 40000) { await reader.cancel(); throw new OrderError("invalid", 413); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new OrderError("invalid"); }
}

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== request.headers.get("host")) throw new OrderError("invalid", 403);
    const input = validateOrder(await readBody(request));
    const fingerprint = createHash("sha256").update(JSON.stringify({ ...input, requestId: undefined })).digest("hex");
    const admin = createSupabaseAdminClient();
    // Retry lookup requires both an unguessable request UUID and identical input.
    const { data: existing, error: lookupError } = await admin.from("orders")
      .select("id,request_fingerprint").eq("id", input.requestId).maybeSingle();
    if (lookupError) throw new OrderError("unavailable", 503);
    if (existing && existing.request_fingerprint !== fingerprint) throw new OrderError("conflict", 409);
    const config = checkoutConfig();
    const delivery = existing ? { fee: 0, minimum: 0 } : selectedDelivery(input, config.zones);
    const priced = existing ? null : priceOrder(input, await getOrderingCatalog(), delivery.fee, delivery.minimum);
    const { data, error } = await admin.rpc("create_restaurant_order", {
      p_request_id: input.requestId, p_fingerprint: fingerprint,
      p_customer: { ...input.customer }, p_items: priced?.items ?? [],
      p_delivery_fee: priced?.deliveryFee ?? 0, p_language: input.language,
    });
    if (error) {
      if (/item_unavailable|price_changed/.test(error.message)) throw new OrderError("itemUnavailable", 409);
      if (/request_conflict/.test(error.message)) throw new OrderError("conflict", 409);
      throw new OrderError("unavailable", 503);
    }
    return Response.json({ order: data as unknown as Receipt }, { status: existing ? 200 : 201, headers });
  } catch (error) {
    const known = error instanceof OrderError;
    return Response.json({ error: known ? error.code : "unavailable" }, { status: known ? error.status : 503, headers });
  }
}
