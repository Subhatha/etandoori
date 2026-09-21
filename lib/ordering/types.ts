import type { MenuText } from "../menu";
import type { Language } from "../translations";

export type CatalogItem = {
  id: string;
  localId: string;
  name: MenuText;
  description: MenuText;
  category: string;
  variant: MenuText | null;
  price: number;
  image: string | null;
};
export type CartLine = { id: string; quantity: number; notes: string };
export type Customer = {
  name: string; phone: string; email: string;
  orderType: "delivery" | "pickup";
  street: string; postalCode: string; city: string; deliveryZone: string;
  deliveryInstructions: string; notes: string;
};
export type OrderInput = {
  requestId: string; language: Language; customer: Customer; items: CartLine[];
};
export type Receipt = {
  tracking?: { token: string; expiresAt: number };
  id: string; order_number: number; order_type: "delivery" | "pickup";
  customer_name: string; customer_phone: string; customer_email: string | null;
  delivery_address: string | null; customer_notes: string | null;
  subtotal: number; delivery_fee: number; total: number;
  order_status: string; payment_status: string;
  items: { item_name: string; quantity: number; unit_price: number; total_price: number; notes: string | null }[];
};
export type DeliveryZone = { id: string; towns: string; minimum: number; fee: number };
export type CheckoutConfig = { zones: DeliveryZone[] };
