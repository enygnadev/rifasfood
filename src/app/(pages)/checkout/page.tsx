"use client";
import React, { useEffect, useState } from "react";
import { useCart } from "@/components/CartContext";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function CheckoutPage() {
  const cart = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [rifasData, setRifasData] = useState<any[]>([]);

  useEffect(() => {
    if (cart.items.length === 0) {
      router.push("/");
    }
  }, [cart.items.length, router]);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  // Carregar dados das rifas para mostrar disponibilidade
  useEffect(() => {
    async function loadRifasData() {
      if (cart.items.length === 0 || !db) return;
      try {
        const ids = cart.items.map(i => i.rifaId);
        const q = query(collection(db, 'rifas'), where('__name__', 'in', ids));
        const snap = await getDocs(q);
        const data: any[] = [];
        snap.forEach(doc => {
          data.push({ id: doc.id, ...doc.data() });
        });
        setRifasData(data);
      } catch (e) {
        console.error('Erro ao carregar rifas:', e);
      }
    }
    loadRifasData();
  }, [cart.items]);

  const total = cart.getTotal();
  const quantidadeTotal = cart.getTotalQuantidade();

  async function handleCheckout() {
    if (!email || !phone) {
      alert("Preencha email e telefone");
      return;
    }

    setLoading(true);
    try {
      const userId = user?.uid || "guest-" + Date.now();

      // Enviar todos os itens do carrinho
      const res = await fetch("/api/comprar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items.map((item) => ({
            rifaId: item.rifaId,
            quantidade: item.quantidade,
            valor: item.valorPorNumero,
          })),
          userId,
          email,
          phone,
        }),
      });

      const data = await res.json();

      if (data.sessionUrl) {
        // Stripe - limpa carrinho antes de redirecionar
        cart.clearCart();
        window.location.href = data.sessionUrl;
      } else if (data.pixUrl) {
        // PIX - limpa carrinho antes de redirecionar
        cart.clearCart();
        window.location.href = data.pixUrl;
      } else if (data.purchaseIds || data.purchaseId) {
        // Pagamento direto confirmado
        cart.clearCart();
        alert("Pedido confirmado com sucesso!");
        router.push("/historico");
      } else {
        alert(data.error || "Erro ao processar pedido");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao processar pedido");
    } finally {
      setLoading(false);
    }
  }

  if (cart.items.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8 mt-16">
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🛒</div>
          <h1 className="text-2xl font-bold mb-2">Carrinho vazio</h1>
          <Link href="/" className="text-green-600 font-semibold hover:underline">
            Voltar às rifas
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 mt-16 mb-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Resumo do Pedido */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">📦 Seu Pedido</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {cart.items.map((item) => {
                const rifa = rifasData.find(r => r.id === item.rifaId);
                const disponivel = rifa ? (rifa.meta || 100) - (rifa.vendidos || 0) : '...';
                return (
                  <div
                    key={item.rifaId}
                    className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{item.nome}</div>
                      {disponivel !== '...' && disponivel > 0 && (
                        <div className="text-xs text-green-600 font-semibold mt-1">
                          ✓ {disponivel} tickets disponíveis
                        </div>
                      )}
                      {disponivel === 0 && (
                        <div className="text-xs text-red-600 font-semibold mt-1">
                          ⚠️ Esgotado
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1 border border-gray-300 rounded-lg px-2 py-1 bg-white">
                          <button
                            onClick={() => cart.updateQuantity(item.rifaId, Math.max(1, item.quantidade - 1))}
                            className="px-1 text-sm font-bold text-gray-600 hover:text-gray-800"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm font-semibold text-gray-800">{item.quantidade}</span>
                          <button
                            onClick={() => cart.updateQuantity(item.rifaId, item.quantidade + 1)}
                            className="px-1 text-sm font-bold text-gray-600 hover:text-gray-800"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-sm text-gray-600">
                          R$ {item.valorPorNumero.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-green-600">
                        R$ {(item.quantidade * item.valorPorNumero).toFixed(2)}
                      </div>
                      <button
                        onClick={() => cart.removeItem(item.rifaId)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium mt-1"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dados Pessoais */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">👤 Seus Dados</h2>
            
            {/* Card do Perfil */}
            {user && (
              <div className="mb-6 p-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg border border-green-100 flex items-center gap-4">
                <div className="flex-shrink-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || user.email || 'Usuário'}
                      className="w-16 h-16 rounded-full object-cover border-2 border-green-500"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-blue-400 flex items-center justify-center text-white text-2xl font-bold">
                      {(user.displayName || user.email || 'U')?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    {user.displayName || 'Usuário'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {user.email}
                  </div>
                  <div className="text-xs text-green-600 font-semibold mt-1">
                    ✓ Logado e verificado
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Telefone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Resumo de Pagamento */}
        <div className="md:col-span-1">
          <div className="bg-gradient-to-br from-green-50 to-white rounded-xl border-2 border-green-200 p-6 sticky top-24">
            <h2 className="text-lg font-bold mb-6">💰 Resumo</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Itens ({quantidadeTotal})</span>
                <span className="font-semibold">R$ {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Frete</span>
                <span>Grátis</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between items-baseline">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-bold text-green-600">R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-xs text-gray-500">
                <p>✓ Pagamento seguro</p>
                <p>✓ Sorteio garantido</p>
                <p>✓ Suporte 24/7</p>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading || !email || !phone}
              className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 active:bg-green-800 disabled:bg-gray-400 transition text-lg"
            >
              {loading ? "Processando..." : "Confirmar Pedido"}
            </button>

            <button
              onClick={() => router.push("/")}
              className="w-full mt-3 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-100 transition"
            >
              Continuar Comprando
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
