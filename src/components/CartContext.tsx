"use client";
import React, { createContext, useContext, useEffect, useState, useRef } from "react";

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
  const lastAddTimeRef = useRef<{ [key: string]: number }>({});

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
    const now = Date.now();
    const lastTime = lastAddTimeRef.current[item.rifaId] || 0;
    
    // Previne adicionar o mesmo item em menos de 500ms
    if (now - lastTime < 500) {
      console.log(`[DEBUG CartContext] Rejeitado - último clique foi há ${now - lastTime}ms`);
      return;
    }
    
    lastAddTimeRef.current[item.rifaId] = now;
    console.log(`[DEBUG CartContext] addItem called with quantidade=${item.quantidade}`, item);
    
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.rifaId === item.rifaId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantidade += item.quantidade;
        console.log(`[DEBUG CartContext] Item exists, updated quantidade from ${copy[idx].quantidade - item.quantidade} to ${copy[idx].quantidade}`);
        return copy;
      }
      console.log(`[DEBUG CartContext] New item added with quantidade=${item.quantidade}`);
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
