"use client";
import React, { useEffect, useState } from "react";
import { db } from "@/firebase/client";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import { useCart } from "@/components/CartContext";

interface Rifa {
  id: string;
  nome: string;
  premio?: number;
  vendidos?: number;
  meta?: number;
  valorPorNumero?: number;
  valor?: number;
  timerExpiresAt?: string;
  status?: string;
  categoria?: string;
}

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Sorteando...");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span className="font-mono text-lg font-bold text-white">{timeLeft}</span>
  );
}

export default function EndingSoonRail() {
  const [rifas, setRifas] = useState<Rifa[]>([]);
  const [loading, setLoading] = useState(true);
  const cart = useCart();

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {rifas.map((rifa) => {
          const progresso = Math.round(((rifa.vendidos || 0) / (rifa.meta || 1)) * 100);
          const preco = rifa.valorPorNumero || rifa.valor || 10;

          const handleAdd = (e: React.MouseEvent) => {
            e.preventDefault();
            cart.addItem({
              rifaId: rifa.id,
              nome: rifa.nome,
              quantidade: 1,
              valorPorNumero: preco,
            });
          };

          return (
            <div
              key={rifa.id}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 p-[2px] shadow-lg hover:shadow-2xl transition-all duration-300 group"
            >
              <div className="bg-white rounded-2xl p-4 h-full flex flex-col">
                <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1">
                  <span className="text-xs text-gray-300">Termina em</span>
                  {rifa.timerExpiresAt && (
                    <CountdownTimer expiresAt={rifa.timerExpiresAt} />
                  )}
                </div>
                <div className="pt-8">
                  <h3 className="font-bold text-gray-800 text-lg mb-1 truncate">
                    {rifa.nome}
                  </h3>
                  <p className="text-green-600 font-semibold text-sm mb-3">
                    💰 Prêmio: R$ {rifa.premio || 100}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progresso}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    {rifa.vendidos || 0}/{rifa.meta || 0} vendidos ({progresso}%)
                  </p>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-lg font-bold text-green-700">
                      R$ {preco.toFixed(2)}
                    </span>
                    <button
                      onClick={handleAdd}
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg flex items-center gap-1"
                    >
                      <span>🛒</span> Comprar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
