import { restaurantSession, adminError, privateHeaders } from '@/lib/admin/server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try { const { staff } = await restaurantSession(request); return Response.json({ staff }, { headers: privateHeaders }); }
  catch (error) { return adminError(error); }
}
