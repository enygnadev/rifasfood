"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

type CartItem = {
  rifaId: string;
  nome: string;
  quantidade: number;
  valorPorNumero: number;
  numeros?: number[];
  emoji?: string;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (rifaId: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  getTotalQuantidade: () => number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rf_cart");
      if (raw) setItems(JSON.parse(raw));
    } catch (e) {
      console.warn("Failed to read cart from localStorage", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("rf_cart", JSON.stringify(items));
    } catch (e) {
      console.warn("Failed to write cart to localStorage", e);
    }
  }, [items]);

  function addItem(item: CartItem) {
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.rifaId === item.rifaId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantidade += item.quantidade;
        return copy;
      }
      return [...prev, item];
    });
  }

  function removeItem(rifaId: string) {
    setItems((prev) => prev.filter((p) => p.rifaId !== rifaId));
  }

  function clearCart() {
    setItems([]);
  }

  function getTotal() {
    return items.reduce((s, i) => s + (i.valorPorNumero || 0) * (i.quantidade || 1), 0);
  }

  function getTotalQuantidade() {
    return items.reduce((s, i) => s + (i.quantidade || 1), 0);
  }

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, getTotal, getTotalQuantidade }}>
      {children}
    </CartContext.Provider>
  );
}
