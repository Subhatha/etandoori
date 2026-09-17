"use client";
import { useCallback, useEffect, useState } from "react";
import { orderingApiPath } from "@/lib/ordering/paths";
import type { CatalogItem } from "@/lib/ordering/types";

export function useCatalog() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(orderingApiPath("ordering/menu"), { cache: "no-store", signal });
      if (!response.ok) throw new Error("unavailable");
      const result = await response.json();
      if (!Array.isArray(result.items)) throw new Error("invalid");
      setItems(result.items); setError(false);
    } catch {
      if (!signal?.aborted) { setItems([]); setError(true); }
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (!controller.signal.aborted) return load(controller.signal);
    });
    return () => controller.abort();
  }, [load]);
  const refresh = useCallback(async () => { setLoading(true); await load(); }, [load]);
  return { items, loading, error, refresh };
}
