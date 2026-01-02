"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/firebase/client";
import { collection, query, where, orderBy, onSnapshot, limit, getDocs } from "firebase/firestore";
import { useCart } from "@/components/CartContext";
import { useAuth } from "@/components/AuthProvider";

interface Rifa {
  id: string;
  nome: string;
  vendidos?: number;
  meta?: number;
  valorPorNumero?: number;
  valor?: number;
  timerExpiresAt?: string;
  status?: string;
  categoria?: string;
  descricao?: string;
  imagem?: string;
}

function useCountdown(expiresAt: string) {
  const [timeLeft, setTimeLeft] = useState("");
  const [minutesLeft, setMinutesLeft] = useState<number>(999);

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Sorteando...");
        setMinutesLeft(0);
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
      setMinutesLeft(mins + secs / 60);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return { timeLeft, minutesLeft };
}

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const { timeLeft } = useCountdown(expiresAt);
  return (
    <span className="font-mono text-lg font-bold text-white">{timeLeft}</span>
  );
}

// Componente individual do card para poder usar hooks por rifa
function RifaCard({ rifa, addedId, setAddedId }: { rifa: Rifa; addedId: string | null; setAddedId: (id: string | null) => void }) {
  const cart = useCart();
  const router = useRouter();
  const { user } = useAuth();
  const [extras, setExtras] = useState<number>(0);
  const [userComprou, setUserComprou] = useState<boolean>(false);
  const [checkingCompra, setCheckingCompra] = useState<boolean>(true);
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);
  const isAddingRef = React.useRef(false);
  
  const { minutesLeft } = useCountdown(rifa.timerExpiresAt || new Date().toISOString());
  
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
          where("pagamentoStatus", "==", "paid"),
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

  const progresso = Math.round(((rifa.vendidos || 0) / (rifa.meta || 1)) * 100);
  const disponivel = (rifa.meta || 100) - (rifa.vendidos || 0);
  const precoBase = rifa.valorPorNumero || rifa.valor || 10;
  
  // Lógica de tempo (contagem de 10 minutos):
  // < 2 min = TRAVADO (não pode comprar, só Entrar)
  // 2-10 min = valor DOBRADO (2x), máximo 20 números extras (mesmo se esgotado)
  // > 10 min = sorteio ainda não iniciou (normal)
  const travado = minutesLeft < 2;
  const valorDobrado = minutesLeft >= 2 && minutesLeft <= 10;
  const precoFinal = valorDobrado ? precoBase * 2 : precoBase;
  const maxExtras = 20; // Máximo de 20 números extras por rodada
  const extrasDisponiveis = maxExtras - extras; // Quantos extras ainda podem ser comprados nesta rodada

  // Carregar extras no período 2x
  useEffect(() => {
    async function loadExtras() {
      if (!valorDobrado || !db) {
        setExtras(0);
        return;
      }
      try {
        // Contar quantos extras (números > meta) já foram comprados
        const q = query(
          collection(db, "compras"),
          where("rifaId", "==", rifa.id),
          where("pagamentoStatus", "==", "paid")
        );
        const snap = await getDocs(q);
        let totalExtras = 0;
        snap.forEach((doc) => {
          const nums = doc.data().numeros || [];
          const extrasNeste = nums.filter((n: number) => n > (rifa.meta || 100)).length;
          totalExtras += extrasNeste;
        });
        setExtras(Math.min(totalExtras, 20)); // Máximo 20 visíveis
      } catch (e) {
        console.error("Erro ao carregar extras:", e);
        setExtras(0);
      }
    }
    loadExtras();
  }, [valorDobrado, rifa.id, rifa.meta]);
  
  // Durante período 2x, permite comprar +20 mesmo se esgotado
  const esgotado = valorDobrado ? false : disponivel <= 0;
  const podeComprar2x = valorDobrado && !travado && extrasDisponiveis > 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Proteção dupla: ref + state
    if (isAddingRef.current || isAddingToCart) {
      console.log(`[DEBUG RifaCard] Clique bloqueado - isAddingRef=${isAddingRef.current}, isAddingToCart=${isAddingToCart}`);
      return;
    }
    
    if (travado) {
      alert('⏰ Compras travadas! Faltam menos de 2 minutos para o sorteio.');
      return;
    }
    
    if (esgotado) {
      alert('Esta rifa já esgotou!');
      return;
    }
    
    const noCarrinho = cart.items.find(i => i.rifaId === rifa.id)?.quantidade || 0;
    
    // Período 2x: permite até 20 extras, mas em múltiplos de 1
    if (valorDobrado) {
      // Verifica se já tem 20+ números no carrinho para esta rifa
      if (noCarrinho >= 20) {
        alert(`🔥 Você atingiu o máximo de 20 números extras neste período!`);
        return;
      }
    } else {
      // Período normal: respeita disponibilidade
      if (noCarrinho >= disponivel) {
        alert(`Você já tem ${noCarrinho} no carrinho. Só restam ${disponivel} números disponíveis.`);
        return;
      }
    }
    
    // Marcar como adicionando ANTES de qualquer operação
    isAddingRef.current = true;
    setIsAddingToCart(true);
    
    cart.addItem({
      rifaId: rifa.id,
      nome: rifa.nome + (valorDobrado ? ' (DOBRADO)' : ''),
      quantidade: 1,
      valorPorNumero: precoFinal,
    });
    setAddedId(rifa.id);
    
    // Reset após 1500ms para permitir novo clique
    setTimeout(() => {
      isAddingRef.current = false;
      setIsAddingToCart(false);
      setAddedId(null);
    }, 1500);
  };

  const handleEntrar = () => {
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
    router.push(`/sorteio/${rifa.id}`);
  };

  return (
    <div
      className="relative min-w-[280px] max-w-xs w-full snap-center overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 p-[2px] shadow-lg hover:shadow-2xl transition-all duration-300 group"
    >
      <div className="bg-white rounded-2xl overflow-hidden h-full flex flex-col">
        {/* Miniatura da imagem */}
        {rifa.imagem && (
          <div className="relative h-28 w-full overflow-hidden">
            <img
              src={rifa.imagem}
              alt={rifa.nome}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        
        <div className="p-4 flex-1 flex flex-col relative">
          <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1">
            <span className="text-xs text-gray-300">Termina em</span>
            {rifa.timerExpiresAt && (
              <CountdownTimer expiresAt={rifa.timerExpiresAt} />
            )}
          </div>
          
          {/* Badge de status especial */}
          {travado && (
            <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full animate-pulse">
              🔒 TRAVADO
            </div>
          )}
          {valorDobrado && !travado && (
            <div className="absolute top-2 left-2 bg-yellow-500 text-black text-xs px-2 py-1 rounded-full animate-pulse font-bold">
              💰 2X VALOR
            </div>
          )}
          
          <div className="pt-10">
            <h3 className="font-bold text-gray-800 text-lg mb-1 truncate">
              {rifa.nome}
            </h3>
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {rifa.descricao || 'Rifa especial'}
            </p>
            
            {/* Barra progresso normal */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progresso}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mb-3">
              {rifa.vendidos || 0}/{rifa.meta || 0} vendidos ({progresso}%)
            </p>
          
            {/* Barra de extras - período 2x */}
            {valorDobrado && !travado && (
              <>
                <div className="w-full bg-yellow-100 rounded-full h-2 mb-1">
                  <div
                    className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (extras / maxExtras) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-yellow-700 font-semibold mb-3">
                  💰 Extras 2X: {extras}/20
                </p>
              </>
            )}
            
            {/* Mostrar preço atual - período 2x */}
            {valorDobrado && !travado && (
              <p className="text-xs text-yellow-600 font-semibold mb-2">
                🔥 ÚLTIMOS MINUTOS! R$ {precoFinal.toFixed(2)}/número
              </p>
            )}
            {travado && (
              <p className="text-xs text-red-600 font-semibold mb-2">
                🔒 Compras bloqueadas - Sorteio iminente!
              </p>
            )}
          
            <div className="mt-auto flex items-center gap-2">
              {/* Botão Comprar - visível durante contagem 2x (2-10 min) */}
              {podeComprar2x && (
                <button
                  onClick={handleAdd}
                  disabled={false}
                  className={`flex-1 px-3 py-2 font-semibold rounded-lg transition-all shadow-md flex items-center justify-center gap-1 text-sm
                    bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:from-yellow-600 hover:to-orange-600 animate-pulse
                    ${addedId === rifa.id ? 'ring-2 ring-green-400 scale-105' : ''}`}
                  aria-label={`Adicionar ${rifa.nome} ao carrinho`}
                >
                  <span>🛒</span> 
                  {addedId === rifa.id ? 'Adicionado!' : '+20 Números 2X'}
                </button>
              )}
              
              {/* Se não está em período 2x e esgotado, mostrar mensagem */}
              {!podeComprar2x && esgotado && !userComprou && (
                <div className="flex-1 px-3 py-2 bg-gray-400 text-gray-200 rounded-lg text-center text-sm font-semibold">
                  ✅ Esgotado
                </div>
              )}
            
              {/* Botão Entrar - aparece para quem comprou */}
              {userComprou && (
                <button
                  onClick={handleEntrar}
                  disabled={checkingCompra}
                  className={`${podeComprar2x ? '' : 'flex-1'} px-4 py-2 font-semibold rounded-lg transition-all shadow-md flex items-center justify-center gap-1 text-sm
                    bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed`}
                  aria-label={`Entrar no sorteio ${rifa.nome}`}
                >
                  🎰 {checkingCompra ? 'Verificando...' : 'Entrar na Sala'}
                </button>
              )}
              
              {/* Mensagem quando travado e não comprou */}
              {travado && !userComprou && (
                <div className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-center text-sm font-semibold">
                  🔒 Sorteio em andamento
                </div>
              )}
            </div>
          
            {/* Indicador se usuário já comprou */}
            {userComprou && (
              <p className="text-xs text-green-600 mt-2 text-center">✅ Você está participando!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EndingSoonRail() {
  const [rifas, setRifas] = useState<Rifa[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    const q = query(
      collection(db, "rifas"),
      where("status", "==", "contagem"),
      orderBy("timerExpiresAt", "asc"),
      limit(4)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRifas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Rifa)));
        setLoading(false);
      },
      (err) => {
        console.error("rifas:onSnapshot", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🔥</span>
          <h2 className="text-xl font-bold text-gray-800">Prestes a Sortear</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-200 rounded-2xl h-48 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (rifas.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl animate-pulse">🔥</span>
        <h2 className="text-xl font-bold text-gray-800">Prestes a Sortear</h2>
        <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full animate-pulse">
          AO VIVO
        </span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        {rifas.map((rifa) => (
          <RifaCard key={rifa.id} rifa={rifa} addedId={addedId} setAddedId={setAddedId} />
        ))}
      </div>
    </section>
  );
}
