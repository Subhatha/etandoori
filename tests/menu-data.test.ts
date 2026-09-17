import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { menuCategories } from "../lib/menu";
import { buildMenuSeedEntries, flattenLocalMenu } from "../lib/supabase/menu-mapping";
import { loadMenuData } from "../lib/supabase/menu-data";
import type { Database } from "../lib/supabase/database.types";

function mockClient(data: unknown, error: unknown = null) {
  const query = {
    select: () => query, in: () => query, eq: () => query, limit: () => query,
    abortSignal: async () => ({ data, error }),
  };
  return { from: () => query } as unknown as SupabaseClient<Database>;
}

test("stable UUIDs, all translations and images, and all serving prices", async () => {
  const entries = await buildMenuSeedEntries();
  assert.equal(flattenLocalMenu().length, 81);
  assert.equal(entries.length, 89);
  assert.deepEqual(entries, await buildMenuSeedEntries());
  assert.equal(new Set(entries.map(({ row }) => row.id)).size, entries.length);
  for (const { category, item } of flattenLocalMenu()) {
    const matches = entries.filter((entry) => entry.localId === item.id);
    assert.deepEqual(matches.map(({ row }) => row.price), item.prices?.map((option) => option.price) ?? [item.price]);
    for (const { row } of matches) {
      assert.match(row.id, /^[a-f0-9]{8}-[a-f0-9]{4}-8[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
      assert.deepEqual(row.name, item.name);
      assert.deepEqual(row.description, item.description);
      assert.equal(row.image, item.image);
      assert.equal(row.category, category);
      assert.equal(row.available, true);
    }
  }
});

test("database rows reconstruct the exact existing menu, independent of row order", async () => {
  const entries = await buildMenuSeedEntries();
  const result = await loadMenuData(mockClient(entries.map(({ row }) => row).reverse()));
  assert.equal(result.source, "supabase");
  assert.deepEqual(result.categories, menuCategories);
  assert.equal(result.orderableItems.length, 89);
});

test("missing/unavailable records and query failures fall back for display only", async () => {
  const entries = await buildMenuSeedEntries();
  for (const client of [mockClient([]), mockClient(entries.slice(1).map(({ row }) => row)), mockClient(null, { message: "network unavailable" })]) {
    const result = await loadMenuData(client);
    assert.equal(result.source, "local");
    assert.deepEqual(result.categories, menuCategories);
    assert.deepEqual(result.orderableItems, []);
  }
});

test("malformed database translations never replace the local menu", async () => {
  const entries = await buildMenuSeedEntries();
  const rows = entries.map(({ row }) => ({ ...row }));
  rows[0].name = { fr: "Incomplete" };
  const result = await loadMenuData(mockClient(rows));
  assert.equal(result.source, "local");
  assert.equal(result.reason, "invalid");
});
