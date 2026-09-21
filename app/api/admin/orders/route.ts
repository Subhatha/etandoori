import { restaurantSession, adminError, privateHeaders } from '@/lib/admin/server';
import { type AdminOrder, activeStatuses, historyStatuses, inHistory, parseStatusChange, validDate } from '@/lib/admin/orders';
export const dynamic = 'force-dynamic';
const columns = 'id,order_number,customer_name,customer_phone,customer_email,order_type,delivery_address,subtotal,delivery_fee,total,payment_status,order_status,customer_notes,created_at,updated_at' as const;
export async function GET(request: Request) {
  try {
    const { client } = await restaurantSession(request);
    const params = new URL(request.url).searchParams;
    const history = params.get('history') === '1', date = params.get('date') ?? '', number = params.get('number') ?? '';
    if ((history && !date && !number) || (date && !validDate(date)) || (number && !/^[1-9]\d{0,14}$/.test(number))) return Response.json({ error: 'invalid' }, { status: 400, headers: privateHeaders });
    // Page through active orders so a server row cap cannot silently hide orders.
    const all: Omit<AdminOrder, 'items'>[] = [];
    for (let offset = 0; ; offset += 200) {
      let query = client.from('orders').select(columns).in('order_status', history ? historyStatuses : activeStatuses).order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 199);
      if (history && number) query = query.eq('order_number', Number(number));
      if (history && date) {
        // Broad UTC window, followed by exact Europe/Paris calendar-date filtering (DST safe).
        const day = Date.parse(`${date}T00:00:00Z`);
        query = query.gte('created_at', new Date(day - 86400000).toISOString()).lt('created_at', new Date(day + 86400000).toISOString());
      }
      const { data, error } = await query;
      if (error) throw error;
      all.push(...(data ?? []));
      if (!data || data.length < 200) break;
    }
    const orders = history ? all.filter(order => inHistory(order, date, number)) : all;
    const items: AdminOrder['items'] = [];
    for (let start = 0; start < orders.length; start += 15) {
      const { data, error } = await client.from('order_items').select('*').in('order_id', orders.slice(start, start + 15).map(order => order.id)).order('id');
      if (error) throw error;
      items.push(...(data ?? []));
    }
    return Response.json({ orders: orders.map(order => ({ ...order, items: items.filter(item => item.order_id === order.id) })) }, { headers: privateHeaders });
  } catch (error) { return adminError(error); }
}
export async function PATCH(request: Request) {
  try {
    const { client } = await restaurantSession(request);
    if (!request.headers.get('content-type')?.includes('application/json')) return Response.json({ error: 'invalid' }, { status: 415, headers: privateHeaders });
    const reader = request.body?.getReader(); let text = '';
    if (!reader) return Response.json({ error: 'invalid' }, { status: 400, headers: privateHeaders });
    const decoder = new TextDecoder(); let bytes = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.length; if (bytes > 1024) { await reader.cancel(); return Response.json({ error: 'invalid' }, { status: 413, headers: privateHeaders }); } text += decoder.decode(value, { stream: true }); }
    let body: unknown; try { body = JSON.parse(text); } catch { body = null; }
    const change = parseStatusChange(body);
    if (!change) return Response.json({ error: 'invalid' }, { status: 400, headers: privateHeaders });
    // Compare-and-set prevents two tablets from overwriting one another's actions.
    const { data, error } = await client.from('orders').update({ order_status: change.to }).eq('id', change.id).eq('order_status', change.from).select('id').maybeSingle();
    if (error) { if (error.code === '23514') return Response.json({ error: 'conflict' }, { status: 409, headers: privateHeaders }); throw error; }
    if (!data) return Response.json({ error: 'conflict' }, { status: 409, headers: privateHeaders });
    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (error) { return adminError(error); }
}
