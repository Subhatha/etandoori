import "server-only";
import { createSupabaseServerClient } from "../supabase/server";
import { buildMenuSeedEntries, flattenLocalMenu } from "../supabase/menu-mapping";
import type { MenuText } from "../menu";
import type { CatalogItem } from "./types";
import { OrderError } from "./validation";

export async function getOrderingCatalog(): Promise<CatalogItem[]> {
  const entries = await buildMenuSeedEntries();
  const local = new Map(flattenLocalMenu().map(({ item }) => [item.id, item]));
  const { data, error } = await createSupabaseServerClient().from("menu_items").select("*")
    .in("id", entries.map(({ row }) => row.id)).eq("available", true)
    .limit(entries.length).abortSignal(AbortSignal.timeout(10000));
  if (error || !data) throw new OrderError("unavailable", 503);
  const rows = new Map(data.map((row) => [row.id, row]));
  return entries.flatMap((entry) => {
    const row = rows.get(entry.row.id), item = local.get(entry.localId)!;
    if (!row) return [];
    for (const value of [row.name, row.description]) {
      if (!value || typeof value !== "object" || Array.isArray(value)
        || !["fr", "en", "de"].every((key) => typeof value[key] === "string")) throw new OrderError("unavailable", 503);
    }
    return [{ id: row.id, localId: item.id, name: row.name as MenuText, description: row.description as MenuText,
      category: row.category, price: row.price, image: row.image,
      variant: entry.variantIndex === null ? null : item.prices![entry.variantIndex].label }];
  });
}
