"use client";
import React, { useEffect, useState } from 'react';
import { sendEvent } from '@/lib/analytics';

const VARIANTS = ['A', 'B'] as const;

export default function Hero() {
  const [variant, setVariant] = useState<string | null>(null);

  useEffect(() => {
    try {
      const key = 'hero_variant';
      let v = localStorage.getItem(key);
      if (!v) {
        v = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
        localStorage.setItem(key, v);
      }
      setVariant(v);
      sendEvent('hero_view', { variant: v });
    } catch (e) {
      console.warn(e);
    }
  }, []);

  if (!variant) return null;

  const handleCTA = () => {
    sendEvent('hero_cta_click', { variant });
    // navigate to promoted rifa (first ending rifa ideally) - we redirect to /rifa for now
    window.location.href = '/rifa';
  };

  return (
    <section className="bg-gradient-to-r from-yellow-50 to-white p-6 rounded-lg shadow mb-6">
      {variant === 'A' ? (
        <div className="text-center">
          <h1 className="text-2xl font-bold">Rifas com descontos reais — participe e ganhe!</h1>
          <p className="text-sm text-gray-600 mt-2">Compre números, aumente suas chances. Veja rifas terminando agora abaixo.</p>
          <div className="mt-4">
            <button className="px-6 py-2 rounded bg-green-600 text-white font-semibold" onClick={handleCTA} aria-label="Comprar agora">Comprar agora</button>
          </div>
        </div>
      ) : (
        <div className="md:flex md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Últimas rifas — números limitados, prêmio real</h1>
            <p className="text-sm text-gray-600 mt-2">Garanta sua participação nas rifas que vão encerrar em minutos. Jury of winners and social proof inside.</p>
          </div>
          <div className="mt-4 md:mt-0">
            <button className="px-6 py-2 rounded bg-orange-500 text-white font-semibold" onClick={handleCTA} aria-label="Ver rifas encerrando">Ver rifas</button>
          </div>
        </div>
      )}
    </section>
  );
}
