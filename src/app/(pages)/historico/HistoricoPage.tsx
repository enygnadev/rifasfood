"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/firebase/client";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import Link from "next/link";

interface Compra {
  id: string;
  rifaId: string;
  rifaNome?: string;
  quantidade: number;
  valor: number;
  numeros?: number[];
  status: string;
  createdAt: any;
}

export default function HistoricoPage() {
  const { user, loading: authLoading } = useAuth();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [rifasInfo, setRifasInfo] = useState<Record<string, any>>({});

  const isLoggedIn = user && !user.isAnonymous;

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "compras"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, async (snap) => {
      const comprasData = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Compra));
      setCompras(comprasData);

      const rifaIds = [...new Set(comprasData.map((c) => c.rifaId).filter(Boolean))];
      const rifasData: Record<string, any> = {};
      
      await Promise.all(
        rifaIds.map(async (rifaId) => {
          try {
            const rifaDoc = await getDoc(doc(db, "rifas", rifaId));
            if (rifaDoc.exists()) {
              rifasData[rifaId] = rifaDoc.data();
            }
          } catch (err) {
            console.error("Error fetching rifa:", err);
          }
        })
      );

      setRifasInfo(rifasData);
      setLoading(false);
    });

    return () => unsub();
  }, [user, authLoading, isLoggedIn]);

  if (authLoading) {
    return (
      <main className="max-w-2xl mx-auto p-4 pt-24">
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="max-w-2xl mx-auto p-4 pt-24">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <span className="text-5xl mb-4 block">🔒</span>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Faça login para ver seu histórico</h1>
          <p className="text-gray-500 mb-6">Você precisa estar logado para ver suas compras de rifas.</p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
          >
            Fazer Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-4 pt-24">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span>📋</span> Meu Histórico de Compras
      </h1>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : compras.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <span className="text-5xl block mb-4">🎰</span>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Nenhuma compra ainda</h2>
          <p className="text-gray-500 mb-6">Você ainda não participou de nenhuma rifa.</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
          >
            Ver Rifas Disponíveis
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {compras.map((compra) => {
            const rifaData = rifasInfo[compra.rifaId];
            const rifaNome = compra.rifaNome || rifaData?.nome || "Rifa";
            const status = compra.status || "pendente";
            const statusColors: Record<string, string> = {
              confirmado: "bg-green-100 text-green-700",
              pendente: "bg-yellow-100 text-yellow-700",
              cancelado: "bg-red-100 text-red-700",
            };

            return (
              <div key={compra.id} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-lg">{rifaNome}</h3>
                    <div className="text-sm text-gray-500 mt-1">
                      <span>{compra.quantidade} número{compra.quantidade > 1 ? "s" : ""}</span>
                      <span className="mx-2">•</span>
                      <span>R$ {(compra.valor || 0).toFixed(2)}</span>
                    </div>
                    {compra.numeros && compra.numeros.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {compra.numeros.slice(0, 10).map((num) => (
                          <span
                            key={num}
                            className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded font-mono"
                          >
                            {String(num).padStart(4, "0")}
                          </span>
                        ))}
                        {compra.numeros.length > 10 && (
                          <span className="px-2 py-0.5 text-gray-500 text-xs">
                            +{compra.numeros.length - 10} mais
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || "bg-gray-100 text-gray-700"}`}>
                      {status === "confirmado" ? "Confirmado" : status === "pendente" ? "Pendente" : status}
                    </span>
                    <div className="text-xs text-gray-400 mt-2">
                      {compra.createdAt?.toDate?.()?.toLocaleDateString?.("pt-BR") || ""}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
