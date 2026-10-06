import { readCart, writeCart, validCart, cartQuantity } from "../utils/cartStorage.js";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
const C = createContext();
const KEY = "drixel_cart";
export function CartProvider({
  children
}) {
  const [items, setItems] = useState(() => {
    try {
      return readCart(localStorage);
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      writeCart(localStorage, items);
    } catch {}
  }, [items]);
  const api = useMemo(() => ({
    items,
    count: items.reduce((n, x) => n + Number(x.quantity || 0), 0),
    subtotal: items.reduce((n, x) => n + Number(x.price || 0) * Number(x.quantity || 0), 0),
    add(item) {
      if (!validCart([item]).length) return;
      setItems(old => {
        const i = old.findIndex(x => x.productId === item.productId && x.sku === item.sku && x.size === item.size && x.color === item.color);
        if (i < 0) return [...old, {
          ...item,
          quantity: 1
        }];
        return old.map((x, n) => n === i ? {
          ...x,
          quantity: cartQuantity(x.quantity + 1)
        } : x);
      });
    },
    quantity(i, q) {
      setItems(old => old.map((x, n) => n === i ? {
        ...x,
        quantity: cartQuantity(q)
      } : x));
    },
    remove(i) {
      setItems(old => old.filter((_, n) => n !== i));
    },
    clear() {
      setItems([]);
    }
  }), [items]);
  return <C.Provider value={api}>{children}</C.Provider>;
}
export const useCart = () => useContext(C);
