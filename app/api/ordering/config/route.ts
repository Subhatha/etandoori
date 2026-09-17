import { checkoutConfig } from "@/lib/ordering/config";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(checkoutConfig(), { headers: { "Cache-Control": "no-store" } });
}
