import { loadEnvConfig } from "@next/env";
import { writeFile } from "node:fs/promises";
import { buildMenuSeedEntries, flattenLocalMenu } from "../lib/supabase/menu-mapping";
import { createSupabaseAdminClient } from "../lib/supabase/admin";
import { createSupabaseServerClient } from "../lib/supabase/server";
import { loadMenuData } from "../lib/supabase/menu-data";
import { menuCategories } from "../lib/menu";
import { isDeepStrictEqual } from "node:util";

loadEnvConfig(process.cwd(), true);

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => !["--apply", "--verify", "--sql"].includes(arg)) || args.length > 1) {
    throw new Error("Use no flag (dry run), --apply, --verify, or --sql.");
  }
  const entries = await buildMenuSeedEntries();
  const rows = entries.map(({ row }) => row);
  console.log(`Local items: ${flattenLocalMenu().length}; database rows including servings: ${rows.length}.`);

  if (args.includes("--sql")) {
    // Generated on demand from the source; no second committed menu dataset.
    const literal = JSON.stringify(rows).replaceAll("'", "''");
    await writeFile("/tmp/etandoori-menu-seed.sql", `begin;\ninsert into public.menu_items (id,name,description,category,price,image,available)\nselect id,name,description,category,price,image,available\nfrom jsonb_to_recordset('${literal}'::jsonb) as x(id uuid,name jsonb,description jsonb,category text,price numeric,image text,available boolean)\non conflict (id) do nothing;\ncommit;\n`);
    console.log("Generated /tmp/etandoori-menu-seed.sql. Run in Supabase SQL Editor, then run npm run db:seed -- --verify.");
    return;
  }

  if (args.includes("--apply")) {
    const admin = createSupabaseAdminClient();
    // One atomic INSERT ... ON CONFLICT DO NOTHING, safe under concurrent reruns.
    // Existing menu rows, availability and prices are never overwritten or deleted.
    const { data, error } = await admin.from("menu_items")
      .upsert(rows, { onConflict: "id", ignoreDuplicates: true }).select("id")
      .abortSignal(AbortSignal.timeout(30000));
    if (error) throw new Error(`Import failed (${error.code || "network/configuration"}); no credentials logged.`);
    console.log(`Inserted: ${data.length}; already present: ${rows.length - data.length}.`);
  }

  if (args.includes("--apply") || args.includes("--verify")) {
    const result = await loadMenuData(createSupabaseServerClient());
    if (result.source !== "supabase" || !isDeepStrictEqual(result.categories, menuCategories)) {
      throw new Error("Public verification failed: missing/unavailable records, changed fields, or RLS/network configuration. Existing database rows were not overwritten.");
    }
    for (const expected of rows) {
      const actual = result.orderableItems.find((item) => item.id === expected.id);
      if (!actual || Object.entries(expected).some(([field, value]) =>
        !isDeepStrictEqual(actual[field as keyof typeof actual], value))) {
        throw new Error("A database row differs from the source menu; no existing rows were overwritten.");
      }
    }
    console.log(`Verified ${result.orderableItems.length} available rows through the public-key client. Full menu round-trip matches local content, categories, images and all serving prices.`);
    return;
  }
  console.log("Dry run only. Use --apply to import, --verify to check public reads, or --sql for SQL Editor import.");
}

main().catch((error: unknown) => {
  // Only our own concise messages; never dump Supabase clients or environment values.
  console.error(error instanceof Error ? error.message : "Import failed.");
  process.exitCode = 1;
});
