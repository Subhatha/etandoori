import { verifyTrackingToken } from '@/lib/ordering/tracking-token';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' };
export async function GET(request: Request) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ') || authorization.length > 263) return Response.json({ error: 'access' }, { status: 401, headers });
    const id = verifyTrackingToken(authorization.slice(7));
    if (!id) return Response.json({ error: 'access' }, { status: 401, headers });
    // Possession of a valid, expiring capability authorizes reading ONE order only.
    const client = createSupabaseAdminClient();
    const { data: order, error } = await client.from('orders').select('id,order_number,order_type,customer_name,customer_phone,customer_email,delivery_address,customer_notes,subtotal,delivery_fee,total,order_status,payment_status,updated_at').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!order) return Response.json({ error: 'access' }, { status: 404, headers });
    const { data: items, error: itemError } = await client.from('order_items').select('item_name,quantity,unit_price,total_price,notes').eq('order_id', id).order('id');
    if (itemError) throw itemError;
    return Response.json({ order: { ...order, items } }, { headers });
  } catch { return Response.json({ error: 'unavailable' }, { status: 503, headers }); }
}
