"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/firebase/client";
import { BarraProgresso } from "@/components/BarraProgresso";
import { useCart } from "./CartContext";
import { useAuth } from "./AuthProvider";

export function EndingSoonCard({ rifa }: { rifa: any }) {
  const [now, setNow] = useState(new Date());
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const cart = useCart();
  const router = useRouter();
  const { user } = useAuth();
  const [userComprou, setUserComprou] = useState(false);
  const [checkingCompra, setCheckingCompra] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Verificar se usuário comprou esta rifa
  useEffect(() => {
    async function checkCompra() {
      if (!user?.uid || !db) {
        setCheckingCompra(false);
        return;
      }
      try {
        const q = query(
          collection(db, "compras"),
          where("rifaId", "==", rifa.id),
          where("userId", "==", user.uid),
          where("status", "==", "pago"),
          limit(1)
        );
        const snap = await getDocs(q);
        setUserComprou(!snap.empty);
      } catch (e) {
        console.error("Erro ao verificar compra:", e);
      }
      setCheckingCompra(false);
    }
    checkCompra();
  }, [user?.uid, rifa.id]);

  const expires = rifa.timerExpiresAt ? new Date(rifa.timerExpiresAt) : null;
  const remaining = expires ? Math.max(0, Math.floor((expires.getTime() - now.getTime()) / 1000)) : null;
  const mm = remaining !== null ? Math.floor(remaining / 60) : 0;
  const ss = remaining !== null ? (remaining % 60) : 0;
  const ariaRemaining = expires ? `${mm} minutos e ${ss} segundos` : 'tempo indefinido';
  
  const minutesLeft = remaining !== null ? remaining / 60 : 999;
  const disponivel = (rifa.meta || 100) - (rifa.vendidos || 0);
  const esgotado = disponivel <= 0;
  
  // Lógica de tempo:
  // < 2 min = TRAVADO
  // 2-5 min = valor DOBRADO, máximo 20 extras
  const travado = minutesLeft < 2;
  const valorDobrado = minutesLeft >= 2 && minutesLeft <= 5;
  const precoBase = rifa.valorPorNumero || rifa.valor || 10;
  const precoFinal = valorDobrado ? precoBase * 2 : precoBase;
  const maxExtras = valorDobrado ? 20 : disponivel;

  function addToCart() {
    if (isAddingToCart) return; // Previne múltiplos cliques
    if (travado) {
      alert('⏰ Compras travadas! Faltam menos de 2 minutos para o sorteio.');
      return;
    }
    if (esgotado) {
      alert('Esta rifa já esgotou!');
      return;
    }
    const noCarrinho = cart.items.find(i => i.rifaId === rifa.id)?.quantidade || 0;
    
    if (valorDobrado && noCarrinho >= maxExtras) {
      alert(`🔥 Últimos minutos! Máximo de ${maxExtras} números extras permitidos.`);
      return;
    }
    
    if (noCarrinho >= disponivel) {
      alert(`Você já tem ${noCarrinho} no carrinho. Só restam ${disponivel} números disponíveis.`);
      return;
    }
    
    setIsAddingToCart(true);
    console.log(`[DEBUG] Adicionando 1x ${rifa.nome} - antes tinha ${noCarrinho}, vai ter ${noCarrinho + 1}`);
    cart.addItem({ 
      rifaId: rifa.id, 
      nome: rifa.nome + (valorDobrado ? ' (DOBRADO)' : ''), 
      quantidade: 1, 
      valorPorNumero: precoFinal 
    });
    // Reset após 300ms para permitir novo clique
    setTimeout(() => setIsAddingToCart(false), 300);
  }

  function handleEntrar() {
    if (!user) {
      alert('Faça login para entrar no sorteio!');
      router.push('/login');
      return;
    }
    if (checkingCompra) {
      alert('Verificando...');
      return;
    }
    if (!userComprou) {
      alert('🎟️ Você precisa ter comprado números nesta rifa para entrar no sorteio!');
      return;
    }
    router.push(`/sorteio?rifa=${rifa.id}`);
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 animate-fade-in card-hover">
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="flex gap-2 items-center">
            <div className="text-sm text-red-600 font-semibold badge-pulse">Últimos momentos</div>
            {travado && (
              <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">🔒 TRAVADO</span>
            )}
            {valorDobrado && !travado && (
              <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full animate-pulse font-bold">💰 2X</span>
            )}
          </div>
          <h3 className="font-bold text-lg">{rifa.nome}</h3>
          <div className="text-xs text-gray-500">Vendidos: {rifa.vendidos || 0} / {rifa.meta || 100}</div>
          {valorDobrado && !travado && (
            <div className="text-xs text-yellow-600 font-semibold mt-1">
              ⚡ R$ {precoFinal.toFixed(2)}/número (máx. {maxExtras} extras)
            </div>
          )}
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
        <button 
          className={`px-3 py-2 rounded text-sm font-semibold transition-all ${
            travado || esgotado || isAddingToCart
              ? 'bg-gray-400 cursor-not-allowed text-gray-200' 
              : valorDobrado 
                ? 'bg-yellow-500 text-black hover:bg-yellow-600' 
                : 'bg-white border hover:bg-gray-50'
          }`}
          onClick={addToCart} 
          disabled={travado || esgotado || isAddingToCart}
          aria-label={`Adicionar ${rifa.nome} ao carrinho`}
        >
          {travado ? '🔒 Travado' : esgotado ? 'Esgotado' : isAddingToCart ? '⏳' : valorDobrado ? '+ 2X' : '+ Carrinho'}
        </button>
        <button 
          className={`px-3 py-2 rounded text-sm font-semibold ${
            userComprou 
              ? 'bg-purple-600 text-white hover:bg-purple-700' 
              : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
          }`}
          onClick={handleEntrar}
          aria-label={`Entrar no sorteio ${rifa.nome}`}
        >
          🎰 Entrar
        </button>
      </div>
      
      {userComprou && (
        <p className="text-xs text-green-600 mt-2 text-center">✅ Você está participando!</p>
      )}
    </div>
  );
}
