import type { CartLine, CatalogItem } from "./types";

export const MAX_QUANTITY = 20;
export const MAX_LINES = 50;
export const MAX_TOTAL_QUANTITY = 100;
export const MAX_ITEM_NOTES = 300;
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const toCents = (price: number) => Math.round(price * 100);
export const cartCount = (lines: CartLine[]) => lines.reduce((sum, line) => sum + line.quantity, 0);

export function readCart(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const lines: CartLine[] = [];
  for (const raw of value.slice(0, MAX_LINES)) {
    if (!raw || typeof raw !== "object" || typeof raw.id !== "string" || !uuidPattern.test(raw.id)
      || seen.has(raw.id) || !Number.isInteger(raw.quantity) || raw.quantity < 1 || raw.quantity > MAX_QUANTITY
      || typeof raw.notes !== "string" || raw.notes.length > MAX_ITEM_NOTES) continue;
    if (cartCount(lines) + raw.quantity > MAX_TOTAL_QUANTITY) break;
    seen.add(raw.id);
    lines.push({ id: raw.id, quantity: raw.quantity, notes: raw.notes });
  }
  return lines;
}

export function cartSubtotal(lines: CartLine[], catalog: CatalogItem[]): number {
  const lookup = new Map(catalog.map((item) => [item.id, item]));
  return lines.reduce((sum, line) => sum + toCents(lookup.get(line.id)?.price ?? 0) * line.quantity, 0) / 100;
}

export function addCartItem(lines: CartLine[], id: string): CartLine[] {
  if (!uuidPattern.test(id) || cartCount(lines) >= MAX_TOTAL_QUANTITY) return lines;
  const existing = lines.find((line) => line.id === id);
  if (existing) return lines.map((line) => line.id === id ? { ...line, quantity: Math.min(MAX_QUANTITY, line.quantity + 1) } : line);
  return lines.length < MAX_LINES ? [...lines, { id, quantity: 1, notes: "" }] : lines;
}

/** Only remove quantities actually submitted; retain changes from another tab. */
export function removeSubmitted(lines: CartLine[], submitted: CartLine[]): CartLine[] {
  return lines.flatMap((line) => {
    const sent = submitted.find((item) => item.id === line.id && item.notes === line.notes);
    if (!sent) return [line];
    const quantity = line.quantity - sent.quantity;
    return quantity > 0 ? [{ ...line, quantity }] : [];
  });
}
