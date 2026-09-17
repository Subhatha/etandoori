import { MAX_LINES, MAX_QUANTITY, MAX_TOTAL_QUANTITY, MAX_ITEM_NOTES, uuidPattern, toCents } from "./cart";
import type { OrderInput, CatalogItem, DeliveryZone } from "./types";

export class OrderError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new OrderError("invalid");
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number, required = false): string {
  if (value === undefined || value === null) value = "";
  if (typeof value !== "string" || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/.test(value)) throw new OrderError("invalid");
  const result = value.trim();
  if (required && !result) throw new OrderError("invalid");
  return result;
}

export function validateOrder(value: unknown): OrderInput {
  const input = object(value), raw = object(input.customer);
  if (typeof input.requestId !== "string" || !uuidPattern.test(input.requestId)) throw new OrderError("invalid");
  if (!["fr", "en", "de"].includes(String(input.language))) throw new OrderError("invalid");
  if (raw.orderType !== "delivery" && raw.orderType !== "pickup") throw new OrderError("invalid");
  const delivery = raw.orderType === "delivery";
  const customer = {
    name: text(raw.name, 100, true), phone: text(raw.phone, 30, true), email: text(raw.email, 254), orderType: raw.orderType,
    street: delivery ? text(raw.street, 200, true) : "", postalCode: delivery ? text(raw.postalCode, 10, true) : "",
    deliveryZone: delivery ? text(raw.deliveryZone, 20, true) : "",
    city: delivery ? text(raw.city, 100, true) : "", deliveryInstructions: delivery ? text(raw.deliveryInstructions, 500) : "",
    notes: text(raw.notes, 1000),
  } as OrderInput["customer"];
  if (!/^[+\d() .-]+$/.test(customer.phone) || customer.phone.replace(/\D/g, "").length < 7 || customer.phone.replace(/\D/g, "").length > 15) throw new OrderError("invalid");
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) throw new OrderError("invalid");
  if (delivery && !/^\d{5}$/.test(customer.postalCode)) throw new OrderError("invalid");
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > MAX_LINES) throw new OrderError("invalid");
  const seen = new Set<string>();
  const items = input.items.map((value) => {
    const item = object(value);
    if (typeof item.id !== "string" || !uuidPattern.test(item.id) || seen.has(item.id)
      || typeof item.quantity !== "number" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY) throw new OrderError("invalid");
    seen.add(item.id);
    return { id: item.id, quantity: item.quantity, notes: text(item.notes, MAX_ITEM_NOTES) };
  });
  if (items.reduce((sum, item) => sum + item.quantity, 0) > MAX_TOTAL_QUANTITY) throw new OrderError("invalid");
  // All other fields, including browser totals, prices, status and payment data, are discarded.
  return { requestId: input.requestId, language: input.language as OrderInput["language"], customer, items };
}

export function priceOrder(input: OrderInput, catalog: CatalogItem[], deliveryFee: number | null, minimum = 0) {
  if (input.customer.orderType === "delivery" && deliveryFee === null) throw new OrderError("deliveryDisabled", 503);
  const fee = input.customer.orderType === "delivery" ? deliveryFee! : 0;
  if (!Number.isFinite(fee) || fee < 0) throw new OrderError("unavailable", 503);
  const items = input.items.map((line) => {
    const item = catalog.find((entry) => entry.id === line.id);
    if (!item || !Number.isFinite(item.price) || item.price < 0) throw new OrderError("itemUnavailable", 409);
    const variant = item.variant?.[input.language];
    return { id: item.id, quantity: line.quantity, notes: line.notes,
      item_name: `${item.name[input.language]}${variant ? ` — ${variant}` : ""}`,
      unit_price: item.price, total_price: toCents(item.price) * line.quantity / 100 };
  });
  const subtotal = items.reduce((sum, item) => sum + toCents(item.total_price), 0) / 100;
  if (subtotal < minimum) throw new OrderError("minimum", 400);
  if (subtotal > 10000) throw new OrderError("invalid");
  return { items, subtotal, deliveryFee: fee, total: (toCents(subtotal) + toCents(fee)) / 100 };
}

export function selectedDelivery(input: OrderInput, zones: DeliveryZone[]) {
  if (input.customer.orderType === "pickup") return { fee: 0, minimum: 0 };
  const zone = zones.find((item) => item.id === input.customer.deliveryZone);
  if (!zone) throw new OrderError("invalid");
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "").replace(/(lesbains|surleman)$/, "");
  const cities = zone.towns.split(",").map(normalize);
  // Conventional spellings for the two locality spellings in the source PDF.
  if (cities.includes("perrigner")) cities.push("perrignier");
  if (cities.includes("massonay")) cities.push("massongy");
  if (!cities.includes(normalize(input.customer.city)) || !input.customer.postalCode.startsWith("74")) throw new OrderError("zone", 400);
  return { fee: zone.fee, minimum: zone.minimum };
}
