import { strict as assert } from "node:assert";
import { test } from "node:test";
import { addCartItem, cartCount, cartSubtotal, readCart, removeSubmitted } from "../lib/ordering/cart";
import { validateOrder, priceOrder, selectedDelivery, OrderError } from "../lib/ordering/validation";
import type { CatalogItem } from "../lib/ordering/types";

const id = "20000000-0000-4000-8000-000000000001";
const other = "20000000-0000-4000-8000-000000000002";
const text = { fr: "Plat", en: "Dish", de: "Gericht" };
const catalog: CatalogItem[] = [{ id, localId: "test", name: text, description: text, category: "test", variant: null, image: null, price: 10.15 }, { id: other, localId: "wine", name: text, description: text, category: "test", variant: { fr: "Verre", en: "Glass", de: "Glas" }, image: null, price: 5.9 }];
const input = () => ({ requestId: "30000000-0000-4000-8000-000000000001", language: "en", customer: { name: " Customer ", phone: "+33 6 12 34 56 78", orderType: "pickup" }, items: [{ id, quantity: 2, notes: "" }] });
const invalid = (value: unknown) => assert.throws(() => validateOrder(value), (error: unknown) => error instanceof OrderError && error.code === "invalid");

test("cart uses integer cents and preserves serving identities", () => {
  let lines = addCartItem([], id); lines = addCartItem(lines, id); lines = addCartItem(lines, other);
  assert.equal(cartCount(lines), 3); assert.equal(cartSubtotal(lines, catalog), 26.2);
  assert.equal(lines.length, 2);
  assert.deepEqual(removeSubmitted(lines, [{ id, quantity: 1, notes: "" }]), [{ id, quantity: 1, notes: "" }, { id: other, quantity: 1, notes: "" }]);
});
test("cart limits and malformed persisted state", () => {
  assert.deepEqual(readCart({}), []);
  assert.deepEqual(readCart([{ id, quantity: -1, notes: "" }]), []);
  assert.deepEqual(readCart([{ id, quantity: 2, notes: "" }, { id, quantity: 2, notes: "" }]), [{ id, quantity: 2, notes: "" }]);
  assert.equal(addCartItem([{ id, quantity: 20, notes: "" }], id)[0].quantity, 20);
});
test("pickup requires no address and always has zero fee", () => {
  const result = priceOrder(validateOrder(input()), catalog, 5);
  assert.equal(result.subtotal, 20.3); assert.equal(result.deliveryFee, 0); assert.equal(result.total, 20.3);
});
test("browser-controlled prices/totals/payment fields are discarded", () => {
  const original = input(); const parsed = validateOrder({ ...original, total: 0, delivery_fee: 0, payment_status: "paid", items: [{ ...original.items[0], unit_price: 0, total_price: -100 }] });
  assert.equal(priceOrder(parsed, catalog, 0).total, 20.3);
  assert.ok(!("total" in parsed)); assert.ok(!("unit_price" in parsed.items[0]));
});
test("unavailable or unknown menu items fail closed", () => {
  assert.throws(() => priceOrder(validateOrder(input()), [], 0), /itemUnavailable/);
});
test("quantity, duplicate IDs, oversized notes and malformed contact details rejected", () => {
  for (const quantity of [0, -1, 1.5, 21, "2", null]) invalid({ ...input(), items: [{ id, quantity, notes: "" }] });
  invalid({ ...input(), items: [input().items[0], input().items[0]] });
  invalid({ ...input(), items: [{ id, quantity: 1, notes: "x".repeat(301) }] });
  for (const customer of [{ name: "" }, { name: "x".repeat(101) }, { phone: "123" }, { email: "not-an-email" }, { name: "<script>bad</script>" }]) invalid({ ...input(), customer: { ...input().customer, ...customer } });
});
test("delivery requires full address and matching area, enforces the minimum", () => {
  invalid({ ...input(), customer: { ...input().customer, orderType: "delivery" } });
  const value = validateOrder({ ...input(), customer: { ...input().customer, orderType: "delivery", street: "3 Rue des Italiens", postalCode: "74200", city: "Thonon-les-Bains", deliveryZone: "zone-1" } });
  const delivery = selectedDelivery(value, [{ id: "zone-1", towns: "Thonon", minimum: 20, fee: 3.5 }]);
  const result = priceOrder(value, catalog, delivery.fee, delivery.minimum);
  assert.equal(result.total, 23.8);
  assert.throws(() => priceOrder(value, catalog, 0, 30), /minimum/);
  assert.throws(() => selectedDelivery({ ...value, customer: { ...value.customer, city: "Paris" } }, [{ id: "zone-1", towns: "Thonon", minimum: 20, fee: 0 }]), /zone/);
});
test("wine snapshot includes the selected serving label", () => {
  const value = validateOrder({ ...input(), items: [{ id: other, quantity: 1 }] });
  assert.equal(priceOrder(value, catalog, 0).items[0].item_name, "Dish — Glass");
});
