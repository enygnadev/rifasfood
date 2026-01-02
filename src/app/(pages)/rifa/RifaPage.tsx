
"use client";
import React, { useEffect, useState } from "react";
import { BarraProgresso } from "@/components/BarraProgresso";
import PaymentSelector, { PaymentMethod } from "@/components/PaymentSelector";
import { calcularNumerosPorCompra } from "@/utils/rifa";
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/firebase/client";
import { useSearchParams } from "next/navigation";

export default function RifaPage() {
  const search = useSearchParams();
  const id = search?.get("id") || "galinha";
  const [rifa, setRifa] = useState<any | null>(null);
  const [comprando, setComprando] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(process.env.NEXT_PUBLIC_PAYMENT_PROVIDER === 'stripe' ? 'stripe' : 'pix');

  useEffect(() => {
    const ref = doc(db, "rifas", id);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setRifa({ id: snap.id, ...snap.data() });
    }, (err) => console.error("rifa:onSnapshot", err));

    return () => unsub();
  }, [id]);

  const stripeAvailable = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_PAYMENT_PROVIDER === 'stripe');

  async function handleComprar() {
    if (rifa.locked || progresso >= 99) return;
    setComprando(true);

    // Use current user if available
    const userId = auth.currentUser?.uid || "guest-" + Date.now();

    // If user picked stripe but stripe isn't configured, warn
    if (paymentMethod === 'stripe' && process.env.NEXT_PUBLIC_PAYMENT_PROVIDER !== 'stripe') {
      alert('Cartão/Stripe não configurado no servidor. Escolha PIX.');
      setComprando(false);
      return;
    }

    try {
      const res = await fetch("/api/comprar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rifaId: id, userId, paymentMethod })
      });
      const data = await res.json();
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else if (data.error) {
        alert("Erro: " + data.error);
      } else {
        // no stripe configured — show purchaseId
        alert("Compra criada: " + data.purchaseId);
      }
    } catch (err: any) {
      console.error(err);
      alert("Erro ao processar compra");
    } finally {
      setComprando(false);
    }
  }


  if (!rifa) return <main className="max-w-md mx-auto p-4">Carregando...</main>;

  const progresso = Math.round(((rifa.vendidos || 0) / (rifa.meta || 100)) * 100);
  const numeros = calcularNumerosPorCompra(progresso);

  // Payment UI
  function PaymentUI(){
    return (
      <div className="mt-3 mb-4">
        <div className="text-sm font-semibold mb-2">Forma de pagamento</div>
        <div className="text-sm">
          <PaymentSelector value={paymentMethod} onChange={(v) => setPaymentMethod(v)} stripeAvailable={stripeAvailable} />
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-bold mb-2">{rifa.nome}</h1>
      <BarraProgresso progresso={progresso} />
      <div className="flex justify-between mt-2 text-sm">
        <span>Meta: {rifa.meta}</span>
        <span>Vendidos: {rifa.vendidos || 0}</span>
        <span>Status: {rifa.status || "Ativa"}</span>
      </div>
      <div className="mt-4 p-4 bg-yellow-50 rounded">
        <div className="text-lg font-semibold">R$ {rifa.valorPorNumero || rifa.valor || 10} = {numeros} número(s)</div>
        <div className="text-xs text-gray-500">Quanto mais perto da meta, mais números por compra!</div>
      </div>

      <PaymentUI />

      <button
        className={`mt-6 w-full py-3 rounded text-white font-bold text-lg transition ${rifa.locked || progresso >= 99 ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
        disabled={rifa.locked || progresso >= 99 || comprando}
        onClick={handleComprar}
      >
        {rifa.locked ? "Compras travadas" : comprando ? "Processando..." : progresso >= 80 ? "Últimos números! Comprar agora" : "Comprar agora"}
      </button>

    </main>
  );
}
