import type { SupabaseClient } from "@supabase/supabase-js";
import { menuCategories, type MenuCategory, type MenuText } from "../menu";
import { buildMenuSeedEntries } from "./menu-mapping";
import type { Database, Json } from "./database.types";

type MenuRow = Database["public"]["Tables"]["menu_items"]["Row"];
export type MenuDataResult = {
  source: "supabase" | "local";
  categories: MenuCategory[];
  // Only database records are usable to start a future order. Local fallback is display-only.
  orderableItems: MenuRow[];
  reason?: "unavailable" | "incomplete" | "invalid";
};

function isMenuText(value: Json): value is MenuText {
  return !!value && !Array.isArray(value) && typeof value === "object"
    && ["fr", "en", "de"].every((language) => typeof value[language] === "string");
}

/** Prepared read layer; existing UI remains on its local imports until explicitly switched. */
export async function loadMenuData(client: SupabaseClient<Database>): Promise<MenuDataResult> {
  const fallback = (reason: MenuDataResult["reason"]): MenuDataResult => ({
    source: "local", categories: menuCategories, orderableItems: [], reason,
  });
  try {
    const entries = await buildMenuSeedEntries();
    const { data, error } = await client.from("menu_items")
      .select("*").in("id", entries.map(({ row }) => row.id)).eq("available", true)
      .limit(entries.length).abortSignal(AbortSignal.timeout(10000));
    if (error || !data) return fallback("unavailable");
    const rows = new Map(data.map((row) => [row.id, row]));
    if (entries.some(({ row }) => !rows.has(row.id))) return fallback("incomplete");
    for (const { row: expected } of entries) {
      const row = rows.get(expected.id)!;
      if (!isMenuText(row.name) || !isMenuText(row.description) || row.category !== expected.category
        || !Number.isFinite(row.price) || row.price < 0 || !row.available
        || (row.image !== null && typeof row.image !== "string")) return fallback("invalid");
    }
    const byLocalId = new Map<string, typeof entries>();
    for (const entry of entries) byLocalId.set(entry.localId, [...(byLocalId.get(entry.localId) ?? []), entry]);
    const mapCategories = (categories: MenuCategory[]): MenuCategory[] => categories.map((category) => ({
      ...category,
      items: category.items.map((item) => {
        const matches = byLocalId.get(item.id)!;
        const base = rows.get(matches[0].row.id)!;
        return {
          ...item, name: base.name as MenuText, description: base.description as MenuText,
          price: base.price, image: base.image,
          ...(item.prices ? { prices: item.prices.map((option, index) => ({
            ...option, price: rows.get(matches[index].row.id)!.price,
          })) } : {}),
        };
      }),
      ...(category.subcategories ? { subcategories: mapCategories(category.subcategories) } : {}),
    }));
    return { source: "supabase", categories: mapCategories(menuCategories), orderableItems: data };
  } catch {
    return fallback("unavailable");
  }
}
