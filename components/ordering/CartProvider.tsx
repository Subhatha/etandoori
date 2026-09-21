"use client";

import { createContext, useContext, useMemo, useState, useSyncExternalStore } from "react";
import { addCartItem, readCart, cartCount, removeSubmitted, MAX_QUANTITY, MAX_TOTAL_QUANTITY } from "@/lib/ordering/cart";
import { saveTracking } from "@/lib/ordering/tracking-storage";
import type { CartLine, Receipt } from "@/lib/ordering/types";

const storageKey = "etandoori-cart-v1";
const eventName = "etandoori-cart-change";
let memory = "[]";
let storageUnavailable = false;
function snapshot() {
  if (storageUnavailable) return memory;
  try { return window.localStorage.getItem(storageKey) ?? memory; } catch { return memory; }
}
function parse(value: string): CartLine[] {
  try { return readCart(JSON.parse(value)); } catch { return []; }
}
function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(eventName, notify);
  return () => { window.removeEventListener("storage", notify); window.removeEventListener(eventName, notify); };
}

type CartContextType = {
  lines: CartLine[]; count: number; storageError: boolean; receipt: Receipt | null;
  add: (id: string) => void; remove: (id: string) => void; quantity: (id: string, value: number) => void;
  notes: (id: string, value: string) => void; clear: () => void;
  complete: (receipt: Receipt, submitted: CartLine[]) => void;
};
const CartContext = createContext<CartContextType | null>(null);

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const lines = useMemo(() => parse(raw), [raw]);
  const [storageError, setStorageError] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  function mutate(update: (items: CartLine[]) => CartLine[]) {
    memory = JSON.stringify(update(parse(snapshot())));
    try { window.localStorage.setItem(storageKey, memory); storageUnavailable = false; }
    catch { storageUnavailable = true; setStorageError(true); }
    window.dispatchEvent(new Event(eventName));
  }
  return <CartContext.Provider value={{
    lines, count: cartCount(lines), storageError, receipt,
    add: (id) => mutate((items) => addCartItem(items, id)),
    remove: (id) => mutate((items) => items.filter((item) => item.id !== id)),
    quantity: (id, value) => mutate((items) => {
      if (!Number.isInteger(value) || value < 1 || value > MAX_QUANTITY) return items;
      const next = items.map((item) => item.id === id ? { ...item, quantity: value } : item);
      return cartCount(next) <= MAX_TOTAL_QUANTITY ? next : items;
    }),
    notes: (id, value) => mutate((items) => items.map((item) => item.id === id ? { ...item, notes: value.slice(0, 300) } : item)),
    clear: () => mutate(() => []),
    complete: (result, submitted) => {
      setReceipt(result);
      if (!saveTracking(result)) setStorageError(true);
      try { window.sessionStorage.setItem("etandoori-receipt", JSON.stringify(result)); window.sessionStorage.removeItem("etandoori-order-attempt"); } catch { setStorageError(true); }
      mutate((items) => removeSubmitted(items, submitted));
    },
  }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("CartProvider is required");
  return context;
}
