"use client";
import React, { useState } from 'react';

export default function HowItWorks(){
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="max-w-3xl mx-auto bg-white rounded-lg shadow mt-6 overflow-hidden">
      {/* Header clicável */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* SVG Animado de Sorteio */}
          <div className="relative w-10 h-10">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                {/* Gradientes para os segmentos */}
                <linearGradient id="seg1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
                <linearGradient id="seg2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ea580c" />
                </linearGradient>
                <linearGradient id="seg3" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#ca8a04" />
                </linearGradient>
                <linearGradient id="seg4" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#16a34a" />
                </linearGradient>
                <linearGradient id="seg5" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
                <linearGradient id="seg6" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#9333ea" />
                </linearGradient>
                {/* Brilho central */}
                <radialGradient id="centerGlow">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="70%" stopColor="#f8fafc" />
                  <stop offset="100%" stopColor="#e2e8f0" />
                </radialGradient>
                {/* Sombra */}
                <filter id="wheelShadow">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3"/>
                </filter>
              </defs>
              
              {/* Roda girando */}
              <g filter="url(#wheelShadow)">
                <g className="origin-center animate-spin" style={{ animationDuration: '3s' }}>
                  {/* Segmentos da roda */}
                  <path d="M50,50 L50,5 A45,45 0 0,1 89,27.5 Z" fill="url(#seg1)" />
                  <path d="M50,50 L89,27.5 A45,45 0 0,1 89,72.5 Z" fill="url(#seg2)" />
                  <path d="M50,50 L89,72.5 A45,45 0 0,1 50,95 Z" fill="url(#seg3)" />
                  <path d="M50,50 L50,95 A45,45 0 0,1 11,72.5 Z" fill="url(#seg4)" />
                  <path d="M50,50 L11,72.5 A45,45 0 0,1 11,27.5 Z" fill="url(#seg5)" />
                  <path d="M50,50 L11,27.5 A45,45 0 0,1 50,5 Z" fill="url(#seg6)" />
                  
                  {/* Linhas divisórias */}
                  <line x1="50" y1="50" x2="50" y2="5" stroke="white" strokeWidth="1.5" opacity="0.8" />
                  <line x1="50" y1="50" x2="89" y2="27.5" stroke="white" strokeWidth="1.5" opacity="0.8" />
                  <line x1="50" y1="50" x2="89" y2="72.5" stroke="white" strokeWidth="1.5" opacity="0.8" />
                  <line x1="50" y1="50" x2="50" y2="95" stroke="white" strokeWidth="1.5" opacity="0.8" />
                  <line x1="50" y1="50" x2="11" y2="72.5" stroke="white" strokeWidth="1.5" opacity="0.8" />
                  <line x1="50" y1="50" x2="11" y2="27.5" stroke="white" strokeWidth="1.5" opacity="0.8" />
                  
                  {/* Números nos segmentos */}
                  <text x="58" y="22" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">1</text>
                  <text x="78" y="52" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">2</text>
                  <text x="58" y="82" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">3</text>
                  <text x="42" y="82" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">4</text>
                  <text x="22" y="52" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">5</text>
                  <text x="42" y="22" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">6</text>
                </g>
                
                {/* Centro da roda */}
                <circle cx="50" cy="50" r="12" fill="url(#centerGlow)" stroke="#cbd5e1" strokeWidth="2" />
                <circle cx="50" cy="50" r="6" fill="#1f2937" />
                <circle cx="50" cy="50" r="3" fill="#6b7280" />
              </g>
              
              {/* Ponteiro */}
              <g>
                <polygon points="50,8 45,18 55,18" fill="#1f2937" stroke="#374151" strokeWidth="1" />
                <circle cx="50" cy="12" r="2" fill="#ef4444">
                  <animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite" />
                </circle>
              </g>
              
              {/* Partículas de brilho */}
              <circle cx="25" cy="25" r="1.5" fill="#fbbf24">
                <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" begin="0s" />
                <animate attributeName="r" values="1;2;1" dur="1.5s" repeatCount="indefinite" begin="0s" />
              </circle>
              <circle cx="75" cy="30" r="1" fill="#fbbf24">
                <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" begin="0.5s" />
                <animate attributeName="r" values="0.5;1.5;0.5" dur="1.5s" repeatCount="indefinite" begin="0.5s" />
              </circle>
              <circle cx="70" cy="75" r="1.5" fill="#fbbf24">
                <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" begin="1s" />
                <animate attributeName="r" values="1;2;1" dur="1.5s" repeatCount="indefinite" begin="1s" />
              </circle>
            </svg>
          </div>
          
          {/* Título com animação de cor */}
          <h2 
            className="text-xl font-bold"
            style={{
              background: 'linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'colorShift 3s linear infinite',
            }}
          >
            COMO FUNCIONA
          </h2>
        </div>
        
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* CSS para animação de cor */}
      <style jsx>{`
        @keyframes colorShift {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      {/* Conteúdo expansível */}
      <div 
        className={`transition-all duration-300 ease-out overflow-hidden ${
          isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-6 pt-2">
          <ol className="space-y-3 list-decimal list-inside text-sm text-gray-700">
            <li><strong>Escolha a Rifa</strong> — veja rifas em destaque e as que estão para encerrar.</li>
            <li><strong>Compre números</strong> — sistema dá mais números quanto mais perto da meta.</li>
            <li><strong>Meta atingida</strong> — compras travadas, contagem regressiva de 10 minutos começa.</li>
            <li><strong>Período 2X Premium</strong> — durante os 10 minutos de contagem, até 20 números extras ficam disponíveis pelo preço dobrado! 🔥 Oportunidade única para aumentar suas chances antes do sorteio.</li>
            <li><strong>Sorteio 100% Seguro</strong> — usamos criptografia SHA-256 com seed verificável (timestamp + rifaId + números vendidos). O algoritmo é auditável: qualquer pessoa pode recalcular o resultado com os mesmos dados. 🔐 Transparência total, sem manipulação.</li>
            <li><strong>Sorteio automático</strong> — resultado transparente e anúncio imediato.</li>
            <li><strong>Nova rodada</strong> — rifa reiniciada automaticamente para manter o ritmo.</li>
          </ol>
          <div className="mt-4 text-xs text-gray-500">Dica: procure rifas com badge <span className="text-red-600 font-semibold">Últimos momentos</span> para oportunidades rápidas. Durante o período 2X, aproveite os números extras antes que se esgotem!</div>
        </div>
      </div>
    </section>
  );
}
