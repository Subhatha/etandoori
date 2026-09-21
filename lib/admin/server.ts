import 'server-only';
import { createSupabaseServerClient } from '../supabase/server';
import { AccessError, bearerToken, requireStaff } from './access';
export async function restaurantSession(request: Request) {
  const token = bearerToken(request.headers.get('authorization'));
  const client = createSupabaseServerClient(token);
  const { data, error } = await client.auth.getUser(token);
  if (error && (error.name === 'AuthRetryableFetchError' || (error.status ?? 0) >= 500)) throw new Error('auth_unavailable');
  if (error || !data.user) throw new AccessError(401);
  const member = await client.from('restaurant_users').select('id,name,role').eq('auth_user_id', data.user.id).maybeSingle();
  if (member.error) throw new Error('membership_unavailable');
  return { client, staff: requireStaff(data.user.id, member.data) };
}
export const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' };
export function adminError(error: unknown) {
  const status = error instanceof AccessError ? error.status : 503;
  return Response.json({ error: status === 503 ? 'unavailable' : 'access' }, { status, headers: privateHeaders });
}
