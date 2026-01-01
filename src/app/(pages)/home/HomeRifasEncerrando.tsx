"use client";
import React, { useEffect, useState } from "react";
import { EndingSoonCard } from "@/components/EndingSoonCard";
import { db } from "@/firebase/client";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";

export default function HomeRifasEncerrando() {
  const [rifas, setRifas] = useState<any[]>([]);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'rifas'), where('status', '==', 'contagem'), orderBy('timerExpiresAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setRifas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error('rifas:onSnapshot', err));

    return () => unsub();
  }, []);

  if (!rifas || rifas.length === 0) return null;

  return (
    <section className="max-w-4xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Encerrando</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rifas.map(r => <EndingSoonCard key={r.id} rifa={r} />)}
      </div>
    </section>
  );
}
