"use client";
import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/firebase/client";
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  onSnapshot, 
  orderBy, 
  limit, 
  serverTimestamp 
} from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";

interface Rifa {
  id: string;
  nome: string;
  descricao?: string;
  imagem?: string;
  vendidos?: number;
  meta?: number;
  status?: string;
  timerExpiresAt?: string;
  vencedor?: any;
}

interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  userName: string;
  createdAt: any;
}

function useCountdown(expiresAt: string | undefined) {
  const [timeLeft, setTimeLeft] = useState("");
  const [secondsLeft, setSecondsLeft] = useState<number>(999);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft("--:--");
      return;
    }
    
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Sorteando...");
        setSecondsLeft(0);
        setFinished(true);
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setSecondsLeft(mins * 60 + secs);
      setTimeLeft(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
    };
    
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return { timeLeft, secondsLeft, finished };
}

export default function SorteioRifaPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const rifaId = (params?.rifaId as string) || "";

  const [rifa, setRifa] = useState<Rifa | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Participantes online (simulado)
  const [onlineCount, setOnlineCount] = useState(0);

  const { timeLeft, secondsLeft, finished } = useCountdown(rifa?.timerExpiresAt);
  const startAnimation = secondsLeft <= 10 && secondsLeft > 0;
  const showWinner = finished && rifa?.vencedor;

  // Verificar se usuário pode entrar (comprou números)
  useEffect(() => {
    if (!rifaId || !user) {
      setCheckingAuth(false);
      return;
    }

    async function checkAccess() {
      try {
        const comprasRef = collection(db, "compras");
        const q = query(
          comprasRef,
          where("rifaId", "==", rifaId),
          where("userId", "==", user.uid),
          where("pagamentoStatus", "==", "paid")
        );
        const snap = await getDocs(q);
        setAuthorized(!snap.empty);
      } catch (e) {
        console.error("Erro ao verificar acesso:", e);
        setAuthorized(false);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAccess();
  }, [rifaId, user]);

  // Carregar dados da rifa em tempo real
  useEffect(() => {
    if (!rifaId) return;

    const rifaRef = doc(db, "rifas", rifaId);
    const unsub = onSnapshot(rifaRef, (snap) => {
      if (snap.exists()) {
        setRifa({ id: snap.id, ...snap.data() } as Rifa);
      } else {
        // Se a rifa foi deletada de "rifas", buscar em "sorteiosFinalizados"
        const sorteiosRef = collection(db, "sorteiosFinalizados");
        const q = query(sorteiosRef, where("rifaId", "==", rifaId), limit(1));
        getDocs(q).then((snap) => {
          if (!snap.empty) {
            const doc = snap.docs[0];
            setRifa({ id: doc.id, ...doc.data() } as Rifa);
          }
        });
      }
      setLoading(false);
    });

    return () => unsub();
  }, [rifaId]);

  // Carregar mensagens do chat em tempo real
  useEffect(() => {
    if (!rifaId || !authorized) return;

    const chatRef = collection(db, "rifas", rifaId, "chat");
    const q = query(chatRef, orderBy("createdAt", "asc"), limit(100));
    
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ChatMessage[];
      setMessages(msgs);
      
      // Scroll para o final
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => unsub();
  }, [rifaId, authorized]);

  // Simular contagem de participantes online
  useEffect(() => {
    if (!authorized) return;
    
    // Simular pessoas entrando/saindo
    setOnlineCount(Math.floor(Math.random() * 20) + 5);
    const interval = setInterval(() => {
      setOnlineCount((prev) => Math.max(5, prev + Math.floor(Math.random() * 5) - 2));
    }, 10000);
    
    return () => clearInterval(interval);
  }, [authorized]);

  // Enviar mensagem no chat
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !user || !authorized || sending) return;

    setSending(true);
    try {
      const chatRef = collection(db, "rifas", rifaId, "chat");
      await addDoc(chatRef, {
        text: newMessage.trim(),
        userId: user.uid,
        userName: user.displayName || user.email?.split("@")[0] || "Anônimo",
        createdAt: serverTimestamp(),
      });
      setNewMessage("");
    } catch (e) {
      console.error("Erro ao enviar mensagem:", e);
    } finally {
      setSending(false);
    }
  }

  // Loading state
  if (loading || checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Entrando na sala do sorteio...</p>
        </div>
      </div>
    );
  }

  // Não logado
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-8 text-center max-w-md">
          <span className="text-6xl mb-4 block">🔒</span>
          <h1 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h1>
          <p className="text-gray-400 mb-6">Faça login para entrar na sala do sorteio</p>
          <button
            onClick={() => router.push("/login")}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
          >
            Fazer Login
          </button>
        </div>
      </div>
    );
  }

  // Não autorizado (não comprou)
  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-8 text-center max-w-md">
          <span className="text-6xl mb-4 block">🎟️</span>
          <h1 className="text-2xl font-bold text-white mb-2">Acesso Exclusivo</h1>
          <p className="text-gray-400 mb-6">
            Apenas participantes que compraram números podem entrar nesta sala do sorteio.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
          >
            Ver Rifas Disponíveis
          </button>
        </div>
      </div>
    );
  }

  // Rifa não encontrada
  if (!rifa) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-8 text-center max-w-md">
          <span className="text-6xl mb-4 block">❓</span>
          <h1 className="text-2xl font-bold text-white mb-2">Rifa não encontrada</h1>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="text-gray-400 hover:text-white transition"
            >
              ← Voltar
            </button>
            <div>
              <h1 className="text-white font-bold text-lg">{rifa.nome}</h1>
              <p className="text-gray-400 text-sm">Sala do Sorteio</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-sm">{onlineCount} online</span>
            </div>
            <div className="bg-red-600 px-4 py-2 rounded-lg">
              <span className="text-white font-mono font-bold text-xl">{timeLeft}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-80px)]">
        
        {/* TV / Área Principal do Sorteio */}
        <div className="lg:col-span-2 bg-gray-800 rounded-2xl overflow-hidden flex flex-col">
          {/* Tela do Sorteio */}
          <div className="flex-1 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center relative">
            {/* Efeito de fundo animado */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -top-20 -left-20 animate-pulse"></div>
              <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -bottom-20 -right-20 animate-pulse delay-1000"></div>
            </div>
            
            {/* Conteúdo */}
            <div className="relative z-10 text-center p-8 w-full">
              {rifa.imagem && !startAnimation && (
                <img 
                  src={rifa.imagem} 
                  alt={rifa.nome} 
                  className="w-40 h-40 object-cover rounded-2xl mx-auto mb-6 shadow-2xl ring-4 ring-white/20"
                />
              )}
              
              {/* Animação de Sorteio - últimos 10 segundos */}
              {startAnimation && !showWinner && (
                <div className="mb-8 flex justify-center relative">
                  {/* Efeito de luz ao redor */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-72 h-72 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 rounded-full blur-3xl opacity-40 animate-pulse"></div>
                  </div>
                  
                  {/* Partículas animadas */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-3 h-3 bg-yellow-300 rounded-full"
                        style={{
                          animation: `orbit 3s linear infinite`,
                          animationDelay: `${(i * 0.25)}s`,
                          left: '50%',
                          top: '50%',
                          transformOrigin: `0 0`,
                          transform: `rotate(${i * 30}deg) translateX(120px)`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Roda principal */}
                  <svg
                    width="240"
                    height="240"
                    viewBox="0 0 240 240"
                    className="relative z-10"
                    style={{
                      filter: 'drop-shadow(0 0 30px rgba(255, 193, 7, 0.8))',
                    }}
                  >
                    {/* Gradient definitions */}
                    <defs>
                      <radialGradient id="wheelGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
                        <stop offset="100%" stopColor="#f97316" stopOpacity="0.8" />
                      </radialGradient>
                      <linearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fef3c7" />
                        <stop offset="50%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#f97316" />
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Aro externo brilhante */}
                    <circle cx="120" cy="120" r="115" fill="none" stroke="url(#rimGrad)" strokeWidth="6" filter="url(#glow)" />
                    
                    {/* Círculos concêntricos */}
                    <circle cx="120" cy="120" r="105" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                    <circle cx="120" cy="120" r="95" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    
                    {/* Segmentos da roda com cores vibrantes */}
                    {[0, 1, 2, 3, 4, 5].map((i) => {
                      const startAngle = (i * 60) * (Math.PI / 180);
                      const endAngle = ((i + 1) * 60) * (Math.PI / 180);
                      const colors = ['#fbbf24', '#f97316', '#dc2626', '#ec4899', '#8b5cf6', '#3b82f6'];
                      const x1 = 120 + 85 * Math.cos(startAngle);
                      const y1 = 120 + 85 * Math.sin(startAngle);
                      const x2 = 120 + 85 * Math.cos(endAngle);
                      const y2 = 120 + 85 * Math.sin(endAngle);
                      
                      return (
                        <g key={`segment-${i}`}>
                          <path
                            d={`M 120 120 L ${x1} ${y1} A 85 85 0 0 1 ${x2} ${y2} Z`}
                            fill={colors[i]}
                            fillOpacity="0.8"
                            style={{
                              filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.3))',
                            }}
                          />
                          {/* Número no segmento */}
                          <text
                            x={120 + 60 * Math.cos((startAngle + endAngle) / 2)}
                            y={120 + 60 * Math.sin((startAngle + endAngle) / 2)}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="white"
                            fontSize="16"
                            fontWeight="bold"
                            style={{
                              pointerEvents: 'none',
                              textShadow: '0 0 4px rgba(0,0,0,0.8)',
                            }}
                          >
                            {i + 1}
                          </text>
                        </g>
                      );
                    })}

                    {/* Centro com efeito 3D */}
                    <circle cx="120" cy="120" r="35" fill="url(#wheelGrad)" filter="url(#glow)" />
                    <circle cx="120" cy="120" r="30" fill="#fef3c7" fillOpacity="0.9" />
                    <circle cx="120" cy="120" r="25" fill="#fbbf24" />
                    <circle cx="118" cy="118" r="8" fill="rgba(255,255,255,0.6)" />

                    {/* Apontador no topo */}
                    <polygon 
                      points="120,30 130,50 110,50" 
                      fill="#dc2626" 
                      filter="url(#glow)"
                    />
                  </svg>

                  {/* Animação da roda */}
                  <style>{`
                    svg {
                      animation: spin 1s linear infinite;
                    }
                    
                    @keyframes spin {
                      from {
                        transform: rotate(0deg);
                      }
                      to {
                        transform: rotate(360deg);
                      }
                    }

                    @keyframes orbit {
                      from {
                        opacity: 1;
                        transform: rotate(0deg) translateX(120px) rotate(0deg);
                      }
                      to {
                        opacity: 0;
                        transform: rotate(360deg) translateX(120px) rotate(-360deg);
                      }
                    }
                  `}</style>
                </div>
              )}
              
              {finished || rifa.status === "encerrada" ? (
                // Sorteio finalizado
                <div>
                  {showWinner ? (
                    <>
                      <div className="text-6xl mb-6 animate-bounce">🏆</div>
                      <h2 className="text-4xl font-bold text-white mb-4">🎉 VENCEDOR! 🎉</h2>
                      <div className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-300 text-black px-12 py-6 rounded-3xl inline-block mb-6 shadow-2xl animate-pulse">
                        <p className="text-7xl font-black">#{rifa.vencedor.winningNumber}</p>
                      </div>
                      <p className="text-xl text-gray-200 mt-6">
                        ✨ Parabéns ao ganhador! ✨
                      </p>
                    </>
                  ) : (
                    <>
                      {!startAnimation && (
                        <>
                          <div className="text-6xl mb-4 animate-spin">🎰</div>
                          <h2 className="text-3xl font-bold text-white mb-2">Sorteando...</h2>
                          <p className="text-gray-300">Aguarde o resultado!</p>
                        </>
                      )}
                    </>
                  )}
                </div>
              ) : (
                // Aguardando sorteio
                <div>
                  <div className="text-6xl mb-6">🎰</div>
                  <h2 className="text-3xl font-bold text-white mb-2">{rifa.nome}</h2>
                  <p className="text-gray-300 mb-6">{rifa.descricao || "Prepare-se para o sorteio!"}</p>
                  
                  {/* Progresso */}
                  <div className="bg-black/30 rounded-xl p-4 max-w-sm mx-auto">
                    <div className="flex justify-between text-sm text-gray-300 mb-2">
                      <span>Participantes</span>
                      <span>{rifa.vendidos || 0}/{rifa.meta || 0}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((rifa.vendidos || 0) / (rifa.meta || 100)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Countdown grande */}
                  <div className="mt-8">
                    <p className="text-gray-400 text-sm mb-2">Sorteio em</p>
                    <p className="text-6xl font-mono font-bold text-white">{timeLeft}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Barra inferior da TV */}
          <div className="bg-gray-900 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-red-500">●</span>
              <span className="text-white text-sm font-semibold">AO VIVO</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-sm">🎟️ {rifa.vendidos || 0} números vendidos</span>
              <span className="text-gray-400 text-sm">👥 {onlineCount} assistindo</span>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="bg-gray-800 rounded-2xl flex flex-col h-full max-h-[calc(100vh-100px)]">
          {/* Header do Chat */}
          <div className="bg-gray-900 p-4 rounded-t-2xl border-b border-gray-700">
            <h3 className="text-white font-bold flex items-center gap-2">
              💬 Chat da Sala
              <span className="bg-green-600 text-xs px-2 py-0.5 rounded-full">{messages.length}</span>
            </h3>
            <p className="text-gray-400 text-xs mt-1">Apenas participantes podem enviar mensagens</p>
          </div>

          {/* Mensagens */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-3"
          >
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <span className="text-4xl block mb-2">💬</span>
                <p>Seja o primeiro a enviar uma mensagem!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.userId === user.uid ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                      msg.userId === user.uid
                        ? "bg-green-600 text-white rounded-br-sm"
                        : "bg-gray-700 text-white rounded-bl-sm"
                    }`}
                  >
                    {msg.userId !== user.uid && (
                      <p className="text-xs text-green-400 font-semibold mb-1">{msg.userName}</p>
                    )}
                    <p className="text-sm break-words">{msg.text}</p>
                  </div>
                  <span className="text-xs text-gray-500 mt-1">
                    {msg.createdAt?.toDate?.()?.toLocaleTimeString?.("pt-BR", { 
                      hour: "2-digit", 
                      minute: "2-digit" 
                    }) || "agora"}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Input de mensagem */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                maxLength={200}
                className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition"
              >
                {sending ? "..." : "➤"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
