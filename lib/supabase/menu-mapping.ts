import { menuCategories, type MenuCategory, type MenuItem } from "../menu";
import type { Database } from "./database.types";

type MenuInsert = Database["public"]["Tables"]["menu_items"]["Insert"];
export type MenuSeedEntry = {
  localId: string;
  variantIndex: number | null;
  row: MenuInsert & { id: string };
};

export function flattenLocalMenu(categories: MenuCategory[] = menuCategories): { category: string; item: MenuItem }[] {
  return categories.flatMap((category) => [
    ...category.items.map((item) => ({ category: category.id, item })),
    ...flattenLocalMenu(category.subcategories ?? []),
  ]);
}

// UUIDv8: stable SHA-256-based identity, independent of translations and prices.
// Keep this namespace and existing local IDs stable across future imports.
async function menuUuid(localId: string, variantIndex: number | null): Promise<string> {
  const identity = `etandoori/menu/v1/${localId}/${variantIndex ?? "item"}`;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity)));
  digest[6] = (digest[6] & 0x0f) | 0x80;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = Array.from(digest.slice(0, 16), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function buildMenuSeedEntries(): Promise<MenuSeedEntry[]> {
  const local = flattenLocalMenu();
  if (new Set(local.map(({ item }) => item.id)).size !== local.length) {
    throw new Error("Local menu IDs must be unique.");
  }
  const entries = await Promise.all(local.flatMap(({ category, item }) => {
    for (const language of ["fr", "en", "de"] as const) {
      if (!item.name[language]?.trim() || typeof item.description[language] !== "string") {
        throw new Error(`Invalid translation for ${item.id}.`);
      }
    }
    if (!Number.isFinite(item.price) || item.price < 0) throw new Error(`Invalid price for ${item.id}.`);
    if (item.prices && (item.prices.length === 0 || item.prices[0].price !== item.price)) {
      throw new Error(`Serving prices must start with the base price for ${item.id}.`);
    }
    const variants = item.prices
      ? item.prices.map((option, index) => ({ price: option.price, index }))
      : [{ price: item.price, index: null }];
    return variants.map(async ({ price, index }) => {
      if (!Number.isFinite(price) || price < 0 || Math.abs(price * 100 - Math.round(price * 100)) > 0.000001) {
        throw new Error(`Invalid serving price for ${item.id}.`);
      }
      return {
        localId: item.id,
        variantIndex: index,
        row: {
          id: await menuUuid(item.id, index),
          name: { ...item.name },
          description: { ...item.description },
          category,
          price,
          image: item.image,
          available: true,
        },
      };
    });
  }));
  if (new Set(entries.map(({ row }) => row.id)).size !== entries.length) throw new Error("Duplicate database IDs.");
  return entries;
}
