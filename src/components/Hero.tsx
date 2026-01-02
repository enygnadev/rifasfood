"use client";
import React, { useEffect, useState } from 'react';
import { sendEvent } from '@/lib/analytics';
import { db } from '@/firebase/client';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

const VARIANTS = ['A', 'B'] as const;

interface Rifa {
  id: string;
  nome: string;
  imagem?: string;
}

export default function Hero() {
  const [variant, setVariant] = useState<string | null>(null);
  const [rifas, setRifas] = useState<Rifa[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Buscar imagens das rifas
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "rifas"), orderBy("createdAt", "desc"), limit(5));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Rifa))
        .filter((r) => r.imagem);
      setRifas(items);
    });
    return () => unsub();
  }, []);

  // Auto-slide
  useEffect(() => {
    if (rifas.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % rifas.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [rifas.length]);

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
    window.location.href = '/rifa';
  };

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % rifas.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + rifas.length) % rifas.length);

  return (
    <section className="bg-gradient-to-r from-yellow-50 to-white p-4 md:p-6 rounded-xl shadow-lg mb-6 overflow-hidden">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center">
        
        {/* Slider de Imagens */}
        {rifas.length > 0 && (
          <div className="relative w-full md:w-1/2 h-48 md:h-56 rounded-xl overflow-hidden group">
            {/* Imagens */}
            <div 
              className="flex transition-transform duration-500 ease-out h-full"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {rifas.map((rifa) => (
                <div key={rifa.id} className="min-w-full h-full relative">
                  <img
                    src={rifa.imagem}
                    alt={rifa.nome}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <span className="text-white font-semibold text-sm">{rifa.nome}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Controles */}
            {rifas.length > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-1.5 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Anterior"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-1.5 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Próximo"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Indicadores */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {rifas.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentSlide ? 'bg-white w-4' : 'bg-white/50'
                      }`}
                      aria-label={`Slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Texto e CTA */}
        <div className={`flex-1 text-center ${rifas.length > 0 ? 'md:text-left' : ''}`}>
          {variant === 'A' ? (
            <>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                🎉 Rifas com descontos reais — participe e ganhe!
              </h1>
              <p className="text-sm text-gray-600 mt-2">
                Compre números, aumente suas chances. Veja rifas terminando agora abaixo.
              </p>
              <div className="mt-4">
                <button 
                  className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md hover:shadow-lg transition-all" 
                  onClick={handleCTA} 
                  aria-label="Comprar agora"
                >
                  Comprar agora
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                🔥 Últimas rifas — números limitados!
              </h1>
              <p className="text-sm text-gray-600 mt-2">
                Garanta sua participação nas rifas que vão encerrar em minutos.
              </p>
              <div className="mt-4">
                <button 
                  className="px-6 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-md hover:shadow-lg transition-all" 
                  onClick={handleCTA} 
                  aria-label="Ver rifas encerrando"
                >
                  Ver rifas
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
