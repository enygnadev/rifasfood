"use client";
import React, { useState } from "react";
import { useCart } from "./CartContext";

export function FloatingHeader() {
  const [open, setOpen] = useState(false);
  const cart = useCart();

  const total = cart.getTotal();

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[min(1024px,calc(100%-32px))] header-glass rounded-full px-4 py-2 flex items-center justify-between transition-shadow duration-200">
      <div className="flex items-center gap-4">
        <div className="font-bold text-lg flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-extrabold">RF</div>
          <span className="hidden sm:inline">RifaFood</span>
        </div>
        <nav className="hidden md:flex gap-4 items-center text-sm text-gray-700">
          <a href="/" className="hover:underline">Início</a>
          <a href="/historico" className="hover:underline">Histórico</a>
          <a href="/admin" className="hover:underline">Admin</a>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <button aria-label="Abrir carrinho" onClick={() => setOpen(true)} className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4" />
          </svg>
          {cart.items.length > 0 && <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full px-1">{cart.items.length}</span>}
        </button>

        <div className="hidden md:flex items-center gap-2">
          <button className="px-3 py-1 rounded bg-green-600 text-white text-sm">Entrar</button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-60 flex">
          <div className="ml-auto w-[min(420px,100%)] bg-white shadow-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Carrinho</h3>
              <button onClick={() => setOpen(false)} aria-label="Fechar">Fechar</button>
            </div>
            <div className="space-y-3">
              {cart.items.length === 0 && <div className="text-sm text-gray-500">Carrinho vazio</div>}
              {cart.items.map((it) => (
                <div key={it.rifaId} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{it.nome}</div>
                    <div className="text-xs text-gray-500">{it.quantidade} x R$ {it.valorPorNumero}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">R$ {(it.quantidade * it.valorPorNumero).toFixed(2)}</div>
                    <button className="text-xs text-red-500" onClick={() => cart.removeItem(it.rifaId)}>Remover</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t pt-4">
              <div className="flex justify-between items-center">
                <div className="font-semibold">Total</div>
                <div className="font-bold">R$ {total.toFixed(2)}</div>
              </div>

              <div className="mt-3">
                <button className="w-full bg-green-600 text-white py-2 rounded" onClick={() => {
                  // quick checkout behavior: create purchase for first item (simple flow)
                  if (cart.items.length === 0) return alert('Carrinho vazio');
                  const item = cart.items[0];
                  fetch('/api/comprar', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ rifaId: item.rifaId, userId: 'guest-' + Date.now() }) })
                    .then(r => r.json())
                    .then(d => { if (d.sessionUrl) window.location.href = d.sessionUrl; else if (d.purchaseId) alert('Compra criada: ' + d.purchaseId); else alert(d.error || 'Erro'); })
                    .catch(e => { console.error(e); alert('Erro ao criar compra'); });
                }}>Comprar</button>
              </div>

            </div>
          </div>
          <div className="flex-1" onClick={() => setOpen(false)} />
        </div>
      )}
    </header>
  );
}
