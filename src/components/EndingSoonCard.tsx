"use client";
import React, { useEffect, useState } from "react";
import { BarraProgresso } from "@/components/BarraProgresso";
import { useCart } from "./CartContext";

export function EndingSoonCard({ rifa }: { rifa: any }) {
  const [now, setNow] = useState(new Date());
  const cart = useCart();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const expires = rifa.timerExpiresAt ? new Date(rifa.timerExpiresAt) : null;
  const remaining = expires ? Math.max(0, Math.floor((expires.getTime() - now.getTime()) / 1000)) : null;
  const mm = remaining !== null ? Math.floor(remaining / 60) : 0;
  const ss = remaining !== null ? (remaining % 60) : 0;
  const ariaRemaining = expires ? `${mm} minutos e ${ss} segundos` : 'tempo indefinido';

  function addToCart() {
    cart.addItem({ rifaId: rifa.id, nome: rifa.nome, quantidade: 1, valorPorNumero: rifa.valorPorNumero || rifa.valor || 10 });
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 animate-fade-in card-hover">
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="text-sm text-red-600 font-semibold badge-pulse">Últimos momentos</div>
          <h3 className="font-bold text-lg">{rifa.nome}</h3>
          <div className="text-xs text-gray-500">Vendidos: {rifa.vendidos || 0} / {rifa.meta || 100}</div>
        </div>
        <div className={`text-right ${remaining!==null && remaining<=60 ? 'shake' : ''}`} aria-live="polite" aria-atomic="true" aria-label={`Contagem regressiva: ${ariaRemaining}`}>
          <div className="font-mono text-lg">{mm}:{ss.toString().padStart(2, '0')}</div>
          <div className="text-xs text-gray-500">termina em</div>
        </div>
      </div>

      <div className="mt-3">
        <BarraProgresso progresso={Math.round(((rifa.vendidos||0)/(rifa.meta||100))*100)} />
      </div>

      <div className="mt-3 flex gap-2">
        <button className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-2 rounded cta-animated" onClick={() => window.location.href = `/rifa?rifa=${rifa.id}`} aria-label={`Ver ${rifa.nome}`}>Ver</button>
        <button className="bg-white border px-3 py-2 rounded hover:bg-gray-50" onClick={addToCart} aria-label={`Adicionar ${rifa.nome} ao carrinho`}>+ Carrinho</button>
      </div>
    </div>
  );
}
