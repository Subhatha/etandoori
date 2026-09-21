'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminRequest, AdminRequestError } from '@/lib/admin/client';
import { sortedOrders, type AdminOrder } from '@/lib/admin/orders';
import { subscribeToOrders } from '@/lib/supabase/realtime';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
export function useOrders(query = '') {
  const [orders, setOrders] = useState<AdminOrder[]>([]), [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false), [connected, setConnected] = useState(false), [checked, setChecked] = useState(0);
  const refreshRef = useRef<() => void>(() => {}); const router = useRouter();
  useEffect(() => {
    let alive = true, running = false, queued = false;
    const refresh = async () => {
      if (!alive) return;
      if (running) { queued = true; return; }
      running = true;
      try {
        const result = await adminRequest(`orders${query}`);
        if (alive) { setOrders(sortedOrders(result.orders)); setStale(false); setChecked(Date.now()); }
      } catch (error) {
        if (alive) {
          setStale(true);
          if (error instanceof AdminRequestError && [401, 403].includes(error.status)) { setOrders([]); router.replace('/admin/login'); }
        }
      } finally {
        running = false;
        if (alive) { setLoading(false); if (queued) { queued = false; void refresh(); } }
      }
    };
    refreshRef.current = () => { void refresh(); };
    void refresh();
    const client = getSupabaseBrowserClient();
    const channel = subscribeToOrders(client, () => { void refresh(); }, status => {
      if (!alive) return;
      setConnected(status === 'SUBSCRIBED');
      if (status === 'SUBSCRIBED') void refresh();
    });
    const online = () => { void refresh(); };
    const offline = () => { setConnected(false); setStale(true); };
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    const timer = setInterval(refresh, 15000);
    window.addEventListener('online', online); window.addEventListener('offline', offline); window.addEventListener('focus', online); document.addEventListener('visibilitychange', visible);
    return () => { alive = false; clearInterval(timer); void client.removeChannel(channel); window.removeEventListener('online', online); window.removeEventListener('offline', offline); window.removeEventListener('focus', online); document.removeEventListener('visibilitychange', visible); };
  }, [query, router]);
  const refresh = useCallback(() => refreshRef.current(), []);
  return { orders, loading, stale, connected, checked, refresh };
}
