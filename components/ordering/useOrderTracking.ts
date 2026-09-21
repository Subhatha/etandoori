'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { orderingApiPath } from '@/lib/ordering/paths';
import type { Receipt } from '@/lib/ordering/types';
import type { SavedOrder } from '@/lib/ordering/tracking-storage';
export function useOrderTracking(order: SavedOrder, initial: Receipt | null) {
  const [receipt, setReceipt] = useState<Receipt | null>(initial);
  const [error, setError] = useState<'offline' | 'denied' | null>(null);
  const [loading, setLoading] = useState(true), [checked, setChecked] = useState(0);
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    let alive = true, busy = false, finished = false, denied = false;
    let controller: AbortController | null = null;
    const refresh = async () => {
      if (!alive || busy || document.visibilityState === 'hidden') return;
      busy = true; controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 20000);
      try {
        const response = await fetch(orderingApiPath('orders/status'), { cache: 'no-store', headers: { Authorization: `Bearer ${order.token}` }, signal: controller.signal });
        if ([401, 403, 404].includes(response.status)) { if (alive) { denied = true; setError('denied'); } return; }
        if (!response.ok) throw new Error('offline');
        const data = await response.json();
        if (!data.order || data.order.id !== order.id || !Array.isArray(data.order.items)) throw new Error('invalid');
        if (alive) { setReceipt(data.order); setChecked(Date.now()); setError(null); denied = false; finished = ['completed', 'rejected', 'cancelled'].includes(data.order.order_status); }
      } catch { if (alive) setError('offline'); }
      finally { clearTimeout(timeout); busy = false; if (alive) setLoading(false); }
    };
    refreshRef.current = () => { void refresh(); };
    void refresh();
    const timer = setInterval(() => { if (!finished && !denied) void refresh(); }, 10000);
    const resume = () => { if (!denied) void refresh(); };
    window.addEventListener('online', resume); window.addEventListener('focus', resume); document.addEventListener('visibilitychange', resume);
    return () => { alive = false; controller?.abort(); clearInterval(timer); window.removeEventListener('online', resume); window.removeEventListener('focus', resume); document.removeEventListener('visibilitychange', resume); };
  }, [order.id, order.token]);
  const refresh = useCallback(() => refreshRef.current(), []);
  return { receipt, error, loading, checked, refresh };
}
