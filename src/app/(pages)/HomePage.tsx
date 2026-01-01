
"use client";
import React, { useEffect, useState } from "react";
import { CardRifa } from "@/components/CardRifa";
import NotificationSettings from "@/components/NotificationSettings";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/firebase/client";
import HomeRifasEncerrando from "./home/HomeRifasEncerrando";
import dynamic from 'next/dynamic';
const Hero = dynamic(() => import('@/components/Hero'), { ssr: false });
const HowItWorks = dynamic(() => import('@/components/HowItWorks'), { ssr: false });

export default function HomePage() {
  const [rifas, setRifas] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "rifas"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRifas(docs as any[]);
    }, (err) => console.error("rifas:onSnapshot", err));

    return () => unsub();
  }, []);

  return (
    <main className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Rifas Ativas</h1>
      {/* Notification settings for the current user */}
      <div className="mb-4">
        <NotificationSettings />
      </div>

      {/* Hero */}
      <div className="mb-6">
        <div>
          <Hero />
        </div>
      </div>

      {/* How it works */}
      <div className="mb-6">
        <HowItWorks />
      </div>
      {/* Section: Rifas que vão encerrar */}
      <div className="mb-6">
        <div className="text-lg font-semibold mb-2">Encerrando</div>
        <div>
          {/* HomeRifasEncerrando is client and shows real-time ending rifas */}
          <HomeRifasEncerrando />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {rifas.map((rifa) => {
          // Psicologia de vendas: escassez, urgência, confiança, desconto
          const progresso = Math.round(((rifa.vendidos || 0) / (rifa.meta || 100)) * 100);
          const quaseAcabando = progresso >= 80;
          const desconto = rifa.desconto || (progresso >= 90 ? 10 : 0); // Exemplo: 10% se quase acabando
          const precoOriginal = rifa.valorPorNumero || rifa.valor || 10;
          const precoComDesconto = desconto ? (precoOriginal * (1 - desconto/100)).toFixed(2) : precoOriginal.toFixed(2);
          const badge = quaseAcabando ? '🔥 Quase acabando' : (rifa.status === 'contagem' ? '⏰ Sorteio em breve' : '🎯 Rifa ativa');
          const corBadge = quaseAcabando ? 'bg-red-100 text-red-700' : (rifa.status === 'contagem' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700');
          const simboloConf = '⭐';
          const simboloLucro = '💰';
          const simboloCarrinho = '🛒';
          // Tempo restante fake para simulação
          const tempoRestante = rifa.tempoRestante || (rifa.timerExpiresAt ? `${Math.max(0, Math.floor((new Date(rifa.timerExpiresAt).getTime() - Date.now())/60000))} min` : '--');
          // Adicionar ao carrinho
          const { useCart } = require('@/components/CartContext');
          const cart = useCart();
          function addToCart(e: React.MouseEvent) {
            e.preventDefault();
            cart.addItem({ rifaId: rifa.id, nome: rifa.nome, quantidade: 1, valorPorNumero: precoOriginal });
          }
          return (
            <div key={rifa.id} className="relative group bg-white rounded-xl shadow-md hover:shadow-xl transition overflow-hidden border border-gray-100">
              <div className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold z-10 {corBadge} animate-pulse select-none" style={{background: quaseAcabando ? '#fee2e2' : rifa.status==='contagem' ? '#fef9c3' : '#dcfce7', color: quaseAcabando ? '#b91c1c' : rifa.status==='contagem' ? '#b45309' : '#15803d'}}>{badge}</div>
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold text-gray-800 group-hover:text-green-600 transition">{simboloConf} {rifa.nome}</span>
                  {desconto ? <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold animate-bounce">-{desconto}%</span> : null}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{simboloLucro} Prêmio: <span className="font-semibold text-green-700">R$ {rifa.premio || 100}</span></span>
                  <span className="ml-auto">{simboloCarrinho} {rifa.vendidos || 0}/{rifa.meta || 100}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Tempo: {tempoRestante}</span>
                  <span className="ml-auto text-xs text-gray-400">{progresso}% vendido</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                  <div className="bg-gradient-to-r from-green-400 to-green-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progresso}%` }}></div>
                </div>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-lg font-bold text-green-700">R$ {precoComDesconto}</span>
                  {desconto ? <span className="text-xs line-through text-gray-400">R$ {precoOriginal.toFixed(2)}</span> : null}
                  <button className="ml-auto px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-semibold shadow flex items-center gap-1 cta-animated" onClick={addToCart} aria-label={`Adicionar ${rifa.nome} ao carrinho`}>
                    <span className="text-lg">🛒</span> Adicionar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
