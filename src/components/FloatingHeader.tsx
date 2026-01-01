"use client";
import React, { useState } from "react";
import { useCart } from "./CartContext";
import { useAuth } from "./AuthProvider";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/client";
import Link from "next/link";

export function FloatingHeader() {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const cart = useCart();
  const { user, loading } = useAuth();

  const total = cart.getTotal();

  async function handleLogout() {
    await signOut(auth);
    setMenuOpen(false);
  }

  const isLoggedIn = user && !user.isAnonymous;

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[min(1024px,calc(100%-32px))] header-glass rounded-full px-4 py-2 flex items-center justify-between transition-shadow duration-200">
      <div className="flex items-center gap-4">
        <Link href="/" className="font-bold text-lg flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-extrabold">RF</div>
          <span className="hidden sm:inline">RifaFood</span>
        </Link>
        <nav className="hidden md:flex gap-4 items-center text-sm text-gray-700">
          <Link href="/" className="hover:underline">Início</Link>
          <Link href="/historico" className="hover:underline">Histórico</Link>
          {isLoggedIn && <Link href="/painel" className="hover:underline">Meu Painel</Link>}
          <Link href="/admin" className="hover:underline">Admin</Link>
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
          {loading ? (
            <div className="w-16 h-8 bg-gray-200 rounded animate-pulse" />
          ) : isLoggedIn ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 transition"
              >
                <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                </span>
                <span className="max-w-24 truncate">{user.displayName || user.email?.split("@")[0]}</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-2 border">
                  <Link
                    href="/painel"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Meu Painel
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="px-3 py-1 rounded bg-green-600 text-white text-sm hover:bg-green-700 transition">
              Entrar
            </Link>
          )}
        </div>

        <button
          className="md:hidden p-1"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg py-4 mx-4">
          <nav className="flex flex-col gap-2 px-4">
            <Link href="/" className="py-2 text-gray-700" onClick={() => setMenuOpen(false)}>Início</Link>
            <Link href="/historico" className="py-2 text-gray-700" onClick={() => setMenuOpen(false)}>Histórico</Link>
            {isLoggedIn && (
              <Link href="/painel" className="py-2 text-gray-700" onClick={() => setMenuOpen(false)}>Meu Painel</Link>
            )}
            <Link href="/admin" className="py-2 text-gray-700" onClick={() => setMenuOpen(false)}>Admin</Link>
            <div className="border-t pt-2 mt-2">
              {isLoggedIn ? (
                <button onClick={handleLogout} className="py-2 text-red-600 w-full text-left">Sair</button>
              ) : (
                <Link href="/login" className="py-2 text-green-600 font-medium block" onClick={() => setMenuOpen(false)}>Entrar</Link>
              )}
            </div>
          </nav>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-60 flex">
          <div className="ml-auto w-[min(420px,100%)] bg-white shadow-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Carrinho</h3>
              <button onClick={() => setOpen(false)} aria-label="Fechar" className="text-gray-500 hover:text-gray-700">Fechar</button>
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
                <button className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition" onClick={() => {
                  if (cart.items.length === 0) return alert('Carrinho vazio');
                  const item = cart.items[0];
                  const userId = user?.uid || 'guest-' + Date.now();
                  fetch('/api/comprar', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ rifaId: item.rifaId, userId }) })
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
