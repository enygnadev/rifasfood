"use client";
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/client';
import Confetti from '@/components/Confetti';

export default function SorteioClient(){
  const search = useSearchParams();
  const rifaId = search?.get('rifa') || '';
  const [rifa, setRifa] = useState<any | null>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

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

  return (
    <div>
      {!rifa && <div className="p-6 bg-gray-50 rounded">Carregando...</div>}

      {rifa && (
        <div className="mb-4 text-center">
          <div className="text-lg font-semibold">Rifa: <span className="font-bold">{rifa.nome}</span></div>
          {rifa.vencedor ? (
            <div className="mt-4">
              <div className="text-lg font-semibold">Vencedor:</div>
              <div className="text-2xl text-green-700 font-bold">{rifa.vencedor.winner?.userId || 'Usuário'}</div>
              <div className="text-sm">Número sorteado: <span className="font-mono">{rifa.vencedor.winningNumber}</span></div>
              <div className="text-xs text-gray-500 mt-2">Semente: {rifa.vencedor.seed}</div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-gray-600">Sorteio ainda não realizado.</div>
          )}
        </div>
      )}

      <div className="mt-6 text-left">
        <div className="font-semibold mb-2">Histórico recente:</div>
        <ul className="text-xs bg-gray-50 rounded p-2">
          {historico.map((h) => (
            <li key={h.id}>{h.timestamp}: vencedor {h.winner?.userId || 'usuário'}, número {h.winningNumber}</li>
          ))}
        </ul>
      </div>

      <Confetti trigger={showConfetti} />
    </div>
  );
}
