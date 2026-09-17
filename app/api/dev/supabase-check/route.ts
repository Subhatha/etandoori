import { createSupabaseServerClient } from "@/lib/supabase/server";

// Preserve the site's static export. Production returns 404 before reading env
// or contacting Supabase; development runs the query on each request.
export const dynamic = "force-static";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }

  const headers = { "Cache-Control": "no-store" };

  try {
    const projectUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    if (projectUrl.hostname === "supabase.com" || projectUrl.hostname === "www.supabase.com") {
      return Response.json({ ok: false, message: "NEXT_PUBLIC_SUPABASE_URL must be the project API URL (https://your-project-ref.supabase.co), not a Supabase dashboard URL." }, { status: 503, headers });
    }

    // Refuse privileged keys even if accidentally placed in the public variable.
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
    let role: unknown;
    if (key.split(".").length === 3) {
      try {
        role = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role;
      } catch {
        return Response.json({ ok: false, message: "Invalid public API key configuration." }, { status: 503, headers });
      }
    }
    if (key.startsWith("sb_secret_") || (role !== undefined && role !== "anon")) {
      return Response.json({ ok: false, message: "Use a publishable or legacy anon key, never a privileged key." }, { status: 503, headers });
    }

    const supabase = createSupabaseServerClient();
    const { data, error, count } = await supabase
      .from("menu_items")
      .select("id, name, description, category, price, image, available", { count: "exact" })
      .eq("available", true)
      .order("created_at", { ascending: false })
      .limit(10)
      .abortSignal(AbortSignal.timeout(15000));

    if (error) {
      return Response.json({
        ok: false,
        code: error.code || "CONNECTION_FAILED",
        message: "Could not read available menu_items. Check the project URL, public key, migration, RLS SELECT policy and network access.",
      }, { status: 502, headers });
    }

    return Response.json({
      ok: true,
      message: "Supabase public-client query succeeded with RLS enabled.",
      availableCount: count,
      items: data,
      ...(data.length === 0 ? { note: "No available rows are visible. An empty table is a successful connection, not an error." } : {}),
    }, { headers });
  } catch {
    return Response.json({
      ok: false,
      message: "Connection check failed. Verify both public Supabase variables in .env.local and restart npm run dev. No credentials are included in this response.",
    }, { status: 503, headers });
  }
}
