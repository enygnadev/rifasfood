"use client";
import React, { useState, useEffect } from "react";
import { useCart } from "./CartContext";
import { useAuth } from "./AuthProvider";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/client";
import { db } from "@/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function FloatingHeader() {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const cart = useCart();
  const { user, loading } = useAuth();
  const router = useRouter();

  const total = cart.getTotal();
  const isLoggedIn = user && !user.isAnonymous;
  const totalQuantidade = cart.getTotalQuantidade();

  useEffect(() => {
    async function checkAdmin() {
      if (!isLoggedIn || !user) {
        setIsAdmin(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        setIsAdmin(userDoc.exists() && userDoc.data().role === "admin");
      } catch {
        setIsAdmin(false);
      }
    }
    checkAdmin();
  }, [user, isLoggedIn]);

  async function handleLogout() {
    await signOut(auth);
    setMenuOpen(false);
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 w-full md:top-4 md:left-1/2 md:-translate-x-1/2 md:w-[min(1024px,calc(100%-32px))] header-glass md:rounded-full px-3 md:px-5 py-2 md:py-2.5 flex items-center justify-between transition-all duration-200">
        <div className="flex items-center gap-2 md:gap-5 flex-1 min-w-0">
          <Link href="/" className="font-bold text-base md:text-lg flex items-center gap-1 md:gap-2 min-w-fit flex-shrink-0 group">
            <div className="w-7 md:w-9 h-7 md:h-9 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-extrabold text-xs md:text-sm group-hover:scale-110 transition-transform">
              RF
            </div>
            <span className="hidden sm:inline text-sm md:text-base group-hover:text-green-600 transition">RifaFood</span>
          </Link>
          
          <nav className="hidden lg:flex gap-3 md:gap-5 items-center text-xs md:text-sm text-gray-700">
            <Link href="/" className="hover:text-green-600 transition-colors">Início</Link>
            <Link href="/historico" className="hover:text-green-600 transition-colors">Histórico</Link>
            {isLoggedIn && <Link href="/painel" className="hover:text-green-600 transition-colors">Meu Painel</Link>}
            {isAdmin && <Link href="/admin" className="hover:text-green-600 transition-colors font-medium">Admin</Link>}
          </nav>
        </div>

        <div className="flex items-center gap-1 md:gap-3">
          {/* Cart Button */}
          <button 
            aria-label="Abrir carrinho" 
            onClick={() => setOpen(true)} 
            className="relative p-2 md:p-2.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 active:bg-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 md:h-6 w-5 md:w-6 text-gray-800" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 1h4l.6 2.6H23l-3 11H5.1l.5-2h11.4l2-8H6.1l1-4.6H1zm7 18a2 2 0 100 4 2 2 0 000-4zm12 0a2 2 0 100 4 2 2 0 000-4z"/>
            </svg>
            {cart.items.length > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 md:w-5 md:h-5 flex items-center justify-center font-bold text-[10px] md:text-[11px]">
                {totalQuantidade > 99 ? '99+' : totalQuantidade}
              </span>
            )}
          </button>

          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center gap-2">
            {loading ? (
              <div className="w-20 h-9 md:h-8 bg-gray-200 rounded-full animate-pulse" />
            ) : isLoggedIn ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-2.5 md:px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs md:text-sm font-medium hover:bg-green-100 transition-colors whitespace-nowrap"
                >
                  <span className="w-5 md:w-6 h-5 md:h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                  </span>
                  <span className="hidden sm:inline max-w-[120px] truncate text-xs md:text-sm">
                    {user.displayName || user.email?.split("@")[0] || "User"}
                  </span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg py-2 border border-gray-100 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Link href="/painel" className="block px-4 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      Meu Painel
                    </Link>
                    {isAdmin && (
                      <Link href="/admin" className="block px-4 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium">
                        Admin
                      </Link>
                    )}
                    <hr className="my-1" />
                    <button 
                      onClick={handleLogout} 
                      className="w-full text-left px-4 py-2 text-xs md:text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Sair
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="px-3 py-1.5 text-xs md:text-sm font-medium bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors whitespace-nowrap">
                Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 md:hidden hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 active:bg-gray-200"
            aria-label="Menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="md:hidden fixed top-12 left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col p-3 space-y-1">
            <Link 
              href="/" 
              className="px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors" 
              onClick={() => setMenuOpen(false)}
            >
              Início
            </Link>
            <Link 
              href="/historico" 
              className="px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors" 
              onClick={() => setMenuOpen(false)}
            >
              Histórico
            </Link>
            {isLoggedIn ? (
              <>
                <Link 
                  href="/painel" 
                  className="px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors" 
                  onClick={() => setMenuOpen(false)}
                >
                  Meu Painel
                </Link>
                {isAdmin && (
                  <Link 
                    href="/admin" 
                    className="px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors font-medium" 
                    onClick={() => setMenuOpen(false)}
                  >
                    Admin
                  </Link>
                )}
                <hr className="my-1" />
                <button 
                  onClick={() => {
                    handleLogout();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Sair
                </button>
              </>
            ) : (
              <Link 
                href="/login" 
                className="px-3 py-2.5 text-sm text-green-600 font-medium hover:bg-green-50 rounded-lg transition-colors" 
                onClick={() => setMenuOpen(false)}
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      )}

      {/* Cart Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/20 md:bg-black/40 animate-in fade-in duration-200">
          <div className="w-full h-[90vh] md:h-auto md:w-[min(460px,95%)] md:max-h-[85vh] bg-white shadow-2xl rounded-t-3xl md:rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 duration-300">
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 md:px-5 py-4 md:py-5 border-b border-gray-100 bg-gradient-to-r from-green-50 via-white to-white sticky top-0 z-10">
              <div className="flex items-center gap-2 md:gap-3">
                <span className="text-xl md:text-2xl">🛒</span>
                <div>
                  <h3 className="font-bold text-base md:text-lg text-gray-900">Carrinho</h3>
                  {cart.items.length > 0 && <p className="text-xs text-gray-500">{cart.items.length} item{cart.items.length !== 1 ? 's' : ''}</p>}
                </div>
              </div>
              <button 
                onClick={() => setOpen(false)} 
                aria-label="Fechar" 
                className="text-gray-400 hover:text-gray-600 text-2xl font-light p-1 hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200"
              >
                ×
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto px-3 md:px-4 py-3 md:py-4 space-y-2 md:space-y-3">
              {cart.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 md:py-20">
                  <div className="text-5xl md:text-6xl mb-3 md:mb-4">📦</div>
                  <div className="text-gray-500 text-sm md:text-base font-medium mb-2">Seu carrinho está vazio</div>
                  <p className="text-xs md:text-sm text-gray-400 mb-4">Adicione rifas para começar a comprar</p>
                  <button 
                    onClick={() => setOpen(false)} 
                    className="text-green-600 text-xs md:text-sm font-semibold hover:text-green-700 hover:underline transition-colors"
                  >
                    Continuar comprando
                  </button>
                </div>
              ) : (
                cart.items.map((it) => (
                  <div key={it.rifaId} className="flex items-start gap-3 p-3 md:p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-green-200 hover:bg-green-50/50 transition-all duration-200">
                    <div className="text-lg md:text-xl flex-shrink-0 w-8 md:w-10 h-8 md:h-10 flex items-center justify-center bg-white rounded-lg">
                      {it.emoji || "🎁"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm md:text-base text-gray-900 truncate">{it.nome}</div>
                      <div className="text-xs md:text-sm text-gray-600 mt-1">
                        {it.quantidade} × R$ {it.valorPorNumero.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                      <div className="font-bold text-sm md:text-base text-green-600">
                        R$ {(it.quantidade * it.valorPorNumero).toFixed(2)}
                      </div>
                      <button 
                        className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline transition-colors active:font-bold" 
                        onClick={() => cart.removeItem(it.rifaId)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {cart.items.length > 0 && (
              <div className="border-t border-gray-100 p-3 md:p-5 space-y-3 md:space-y-4 bg-white sticky bottom-0">
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="font-medium text-gray-700 text-sm md:text-base">Subtotal</span>
                    <span className="font-bold text-base md:text-lg text-green-600">R$ {total.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-500 text-center">Pagamento seguro via Stripe</p>
                </div>

                <button
                  className="w-full bg-green-600 text-white font-bold py-3 md:py-3.5 rounded-lg hover:bg-green-700 active:bg-green-800 transition-all text-sm md:text-base touch-highlight-transparent hover:shadow-lg"
                  onClick={() => {
                    if (cart.items.length === 0) {
                      alert('Carrinho vazio');
                      return;
                    }
                    setOpen(false); // Fecha a janela flutuante
                    router.push('/checkout');
                  }}
                >
                  Finalizar Compra
                </button>

                <button
                  className="w-full text-gray-600 font-medium text-sm md:text-base py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  Continuar Comprando
                </button>
              </div>
            )}
          </div>
          
          {/* Overlay clicável para fechar em mobile */}
          <div className="md:hidden flex-1" onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
