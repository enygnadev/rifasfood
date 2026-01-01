"use client";
import React from 'react';

export default function HowItWorks(){
  return (
    <section className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow mt-6">
      <h2 className="text-xl font-bold mb-3">Como funciona</h2>
      <ol className="space-y-3 list-decimal list-inside text-sm text-gray-700">
        <li><strong>Escolha a Rifa</strong> — veja rifas em destaque e as que estão para encerrar.</li>
        <li><strong>Compre números</strong> — sistema dá mais números quanto mais perto da meta.</li>
        <li><strong>Meta atingida</strong> — compras travadas, contagem regressiva de 10 minutos começa.</li>
        <li><strong>Sorteio automático</strong> — resultado transparente e anúncio imediato.</li>
        <li><strong>Nova rodada</strong> — rifa reiniciada automaticamente para manter o ritmo.</li>
      </ol>
      <div className="mt-4 text-xs text-gray-500">Dica: procure rifas com badge <span className="text-red-600 font-semibold">Últimos momentos</span> para oportunidades rápidas.</div>
    </section>
  );
}
