import { getOrderingCatalog } from "@/lib/ordering/catalog";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json({ items: await getOrderingCatalog() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "unavailable" }, { status: 503 }); }
}
