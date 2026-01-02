"use client";
import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '@/firebase/client';
import Confetti from '@/components/Confetti';
import { useAuth } from '@/components/AuthProvider';

export default function SorteioClient(){
  const search = useSearchParams();
  const router = useRouter();
  const rifaId = search?.get('rifa') || '';
  const { user, loading: authLoading } = useAuth();
  
  const [rifa, setRifa] = useState<any | null>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [userComprou, setUserComprou] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Verificar se usuário comprou esta rifa
  useEffect(() => {
    async function checkAccess() {
      if (authLoading) return;
      
      if (!user?.uid) {
        setCheckingAccess(false);
        return;
      }
      
      if (!rifaId || !db) {
        setCheckingAccess(false);
        return;
      }
      
      try {
        const q = query(
          collection(db, "compras"),
          where("rifaId", "==", rifaId),
          where("userId", "==", user.uid),
          where("status", "==", "pago"),
          limit(1)
        );
        const snap = await getDocs(q);
        setUserComprou(!snap.empty);
      } catch (e) {
        console.error("Erro ao verificar acesso:", e);
      }
      setCheckingAccess(false);
    }
    checkAccess();
  }, [user?.uid, rifaId, authLoading]);

  useEffect(() => {
    if (!rifaId || !db) return;
    const rRef = doc(db, 'rifas', rifaId);
    const unsub = onSnapshot(rRef, (snap) => { if (snap.exists()) setRifa({ id: snap.id, ...snap.data() }); }, (e)=>console.error(e));

    const q = query(collection(db, 'historico'), where('rifaId', '==', rifaId), orderBy('timestamp','desc'));
    const unsub2 = onSnapshot(q, (snap) => setHistorico(snap.docs.map(d=>({ id: d.id, ...d.data() }))), (e)=>console.error(e));

    return () => { unsub(); unsub2(); };
  }, [rifaId]);

  useEffect(() => {
    if (rifa?.vencedor) {
      setShowConfetti(true);
      const t = setTimeout(()=>setShowConfetti(false), 5000);
      return ()=>clearTimeout(t);
    }
  }, [rifa]);

  // Verificando acesso
  if (authLoading || checkingAccess) {
    return (
      <div className="p-6 bg-gray-50 rounded text-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mb-4"></div>
        <p>Verificando acesso...</p>
      </div>
    );
  }

  // Usuário não logado
  if (!user) {
    return (
      <div className="p-6 bg-yellow-50 rounded text-center">
        <p className="text-lg mb-4">🔐 Faça login para acessar o sorteio</p>
        <button 
          onClick={() => router.push('/login')}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Fazer Login
        </button>
      </div>
    );
  }

  // Usuário não comprou
  if (!userComprou) {
    return (
      <div className="p-6 bg-red-50 rounded text-center">
        <p className="text-lg mb-2">🎟️ Acesso Restrito</p>
        <p className="text-gray-600 mb-4">
          Você precisa ter comprado números nesta rifa para acompanhar o sorteio.
        </p>
        <button 
          onClick={() => router.push('/')}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Ver Rifas Disponíveis
        </button>
      </div>
    );
  }

  return (
    <div>
      {!rifa && <div className="p-6 bg-gray-50 rounded">Carregando...</div>}

      {rifa && (
        <div className="mb-4 text-center">
          <div className="bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full inline-block mb-3">
            ✅ Você está participando!
          </div>
          <div className="text-lg font-semibold">Rifa: <span className="font-bold">{rifa.nome}</span></div>
          {rifa.vencedor ? (
            <div className="mt-4">
              <div className="text-lg font-semibold">🎉 Vencedor:</div>
              <div className="text-2xl text-green-700 font-bold">{rifa.vencedor.winner?.userId || 'Usuário'}</div>
              <div className="text-sm">Número sorteado: <span className="font-mono">{rifa.vencedor.winningNumber}</span></div>
              <div className="text-xs text-gray-500 mt-2">Semente: {rifa.vencedor.seed}</div>
              {rifa.vencedor.winner?.userId === user.uid && (
                <div className="mt-4 p-4 bg-yellow-100 rounded-lg animate-bounce">
                  <p className="text-xl font-bold text-yellow-700">🏆 PARABÉNS! VOCÊ GANHOU! 🏆</p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4">
              <div className="text-sm text-gray-600 mb-2">Aguardando sorteio...</div>
              <div className="animate-pulse text-4xl">🎰</div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 text-left">
        <div className="font-semibold mb-2">Histórico recente:</div>
        <ul className="text-xs bg-gray-50 rounded p-2 max-h-48 overflow-y-auto">
          {historico.length === 0 && <li className="text-gray-500">Nenhum histórico ainda.</li>}
          {historico.map((h) => (
            <li key={h.id} className="py-1 border-b border-gray-100">
              {h.timestamp}: vencedor {h.winner?.userId || 'usuário'}, número {h.winningNumber}
            </li>
          ))}
        </ul>
      </div>

      <Confetti trigger={showConfetti} />
    </div>
  );
}
