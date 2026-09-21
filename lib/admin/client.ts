'use client';
import { getSupabaseBrowserClient } from '../supabase/browser';
import { orderingApiPath } from '../ordering/paths';
export class AdminRequestError extends Error {
  constructor(public status: number) { super('admin_request_failed'); }
}
export async function adminRequest(path: string, init: RequestInit = {}) {
  const { data, error } = await getSupabaseBrowserClient().auth.getSession();
  if (error || !data.session) throw new AdminRequestError(401);
  const response = await fetch(orderingApiPath(`admin/${path}`), {
    ...init, cache: 'no-store', signal: init.signal ?? AbortSignal.timeout(20000),
    headers: { ...init.headers, Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new AdminRequestError(response.status);
  return response.json();
}
