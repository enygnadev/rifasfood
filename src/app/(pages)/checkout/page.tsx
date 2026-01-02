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
  const [paymentMethod, setPaymentMethod] = useState("credit-card"); // credit-card, pix
  const [pixPayerName, setPixPayerName] = useState("");
  const [pixValidationError, setPixValidationError] = useState("");
  const [pixCopied, setPixCopied] = useState(false);
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

  const PIX_CODE = "00020126330014br.gov.bcb.pix0111100498419715204000053039865802BR5925Gustavo De Aguiar Martins6009Sao Paulo62290525REC6957E45AB6C1437405864563042F8A";

  function copyPixCode() {
    const pixMessage = PIX_CODE;
    
    // Usar método compatível com todos os navegadores
    const textarea = document.createElement('textarea');
    textarea.value = pixMessage;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
      alert('Não foi possível copiar. Tente novamente.');
    } finally {
      document.body.removeChild(textarea);
    }
  }

  // Validação inteligente de PIX
  function validatePixPayer() {
    setPixValidationError("");
    
    if (!pixPayerName.trim()) {
      setPixValidationError("Digite o nome do pagador PIX");
      return false;
    }

    // Extrair primeiro nome do comprador
    const buyerFirstName = (user?.displayName || email || "")
      .split(" ")[0]
      .toLowerCase()
      .trim();

    // Extrair primeiro nome do pagador
    const payerFirstName = pixPayerName
      .split(" ")[0]
      .toLowerCase()
      .trim();

    // Validação 1: Se nomes são iguais (mesma pessoa pagando)
    if (buyerFirstName === payerFirstName) {
      return true;
    }

    // Validação 2: Se names compartilham sobrenome comum (família)
    const buyerParts = (user?.displayName || email || "").toLowerCase().split(" ");
    const payerParts = pixPayerName.toLowerCase().split(" ");

    // Verificar se compartilham pelo menos 2 palavras (indica mesmo sobrenome)
    const commonWords = buyerParts.filter(word => 
      word.length > 3 && payerParts.includes(word)
    );

    if (commonWords.length >= 1) {
      return true;
    }

    // Se não passou na validação, pede confirmação
    const confirmed = confirm(
      `⚠️ O nome do pagador PIX (${pixPayerName}) é diferente do seu (${user?.displayName || email}).\n\n` +
      `Tem certeza que está recebendo PIX de ${pixPayerName}?\n\n` +
      `Clique OK para continuar ou CANCELAR para ajustar.`
    );

    return confirmed;
  }

  async function handleCheckout() {
    if (!email || !phone) {
      alert("Preencha email e telefone");
      return;
    }

    // Validação PIX
    if (paymentMethod === "pix") {
      if (!validatePixPayer()) {
        return;
      }
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
          paymentMethod,
          pixPayerName: paymentMethod === "pix" ? pixPayerName : undefined,
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

              {/* Método de Pagamento */}
              <div>
                <label className="block text-sm font-semibold mb-3">💳 Método de Pagamento</label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-blue-50 transition" style={{backgroundColor: paymentMethod === 'credit-card' ? '#f0f9ff' : 'transparent', borderColor: paymentMethod === 'credit-card' ? '#0ea5e9' : '#d1d5db'}}>
                    <input
                      type="radio"
                      name="payment"
                      value="credit-card"
                      checked={paymentMethod === "credit-card"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-4 h-4 accent-blue-500"
                    />
                    <span className="ml-3 font-semibold text-gray-900">Cartão de Crédito</span>
                  </label>
                  
                  <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-orange-50 transition" style={{backgroundColor: paymentMethod === 'pix' ? '#fff7ed' : 'transparent', borderColor: paymentMethod === 'pix' ? '#fb923c' : '#d1d5db'}}>
                    <input
                      type="radio"
                      name="payment"
                      value="pix"
                      checked={paymentMethod === "pix"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <span className="ml-3 font-semibold text-gray-900">PIX</span>
                  </label>
                </div>
              </div>

              {/* Campo PIX - Validação Inteligente */}
              {paymentMethod === "pix" && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2 text-orange-900">
                      👤 Nome do Pagador PIX
                    </label>
                    <input
                      type="text"
                      value={pixPayerName}
                      onChange={(e) => {
                        setPixPayerName(e.target.value);
                        setPixValidationError("");
                      }}
                      placeholder="Digite o nome de quem está enviando o PIX"
                      className="w-full px-4 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-gray-600 mt-2">
                      💡 Digite o nome da pessoa que está fazendo o PIX. Será validado automaticamente.
                    </p>
                  </div>

                  {pixValidationError && (
                    <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg text-sm">
                      ❌ {pixValidationError}
                    </div>
                  )}

                  {pixPayerName && !pixValidationError && (
                    <div className="p-3 bg-green-100 border border-green-300 text-green-800 rounded-lg text-sm">
                      ✓ Nome validado: {pixPayerName}
                    </div>
                  )}

                  {/* QR Code e PIX */}
                  <div className="mt-4 p-4 bg-white border border-orange-200 rounded-lg">
                    <p className="font-semibold text-gray-900 mb-3">📱 Código PIX para Pagamento</p>
                    
                    <div className="flex gap-4 items-start">
                      {/* QR Code */}
                      <div className="flex-shrink-0">
                        <img
                          src="/qrcode.jpeg"
                          alt="QR Code PIX"
                          className="w-32 h-32 border-2 border-orange-300 rounded-lg bg-white object-cover"
                        />
                        <p className="text-xs text-center text-gray-600 mt-2">QR Code PIX</p>
                      </div>

                      {/* Código PIX */}
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 mb-2">Copie o código PIX:</p>
                        <button
                          onClick={copyPixCode}
                          className={`w-full px-4 py-3 rounded-lg font-semibold transition-all text-sm flex items-center justify-center gap-2 ${
                            pixCopied
                              ? 'bg-green-500 text-white'
                              : 'bg-orange-500 text-white hover:bg-orange-600'
                          }`}
                        >
                          {pixCopied ? (
                            <>✓ Copiado com sucesso!</>
                          ) : (
                            <>📋 Copiar Código PIX</>
                          )}
                        </button>
                        <p className="text-xs text-gray-600 mt-3">Clique no botão acima para copiar o código PIX. Você pode usar o QR code ao lado ou colar o código em seu banco.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-white border border-orange-200 rounded-lg text-xs text-gray-700">
                    <p className="font-semibold mb-2">🔒 Como funciona:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Escaneie o QR code ou copie o código PIX</li>
                      <li>Abra seu app de banco e faça o PIX para o valor de R$ {total.toFixed(2)}</li>
                      <li>Use o nome: {pixPayerName || 'seu nome'}</li>
                      <li>Após confirmar o pagamento, seu pedido será liberado</li>
                    </ul>
                  </div>
                </div>
              )}
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
              disabled={loading || !email || !phone || (paymentMethod === "pix" && !pixPayerName)}
              className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 active:bg-green-800 disabled:bg-gray-400 transition text-lg"
            >
              {loading ? "Processando..." : paymentMethod === "pix" ? "Gerar Código PIX" : "Confirmar Pedido"}
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
