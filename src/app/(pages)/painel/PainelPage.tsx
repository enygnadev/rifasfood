"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth, db } from "@/firebase/client";
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, serverTimestamp } from "firebase/firestore";
import Link from "next/link";

type Tab = "dashboard" | "rifas" | "historico" | "configuracoes";

export default function PainelPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [userData, setUserData] = useState<any>(null);
  const [minhasRifas, setMinhasRifas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user && user.uid) {
      const fetchUserData = async () => {
        try {
          const userDoc = await getDoc(doc(db, "usuarios", user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchUserData();

      const q = query(collection(db, "compras"), where("userId", "==", user.uid));
      const unsub = onSnapshot(q, (snap) => {
        setMinhasRifas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });

      return () => unsub();
    }
  }, [user, authLoading, router]);

  async function handleLogout() {
    await signOut(auth);
    router.push("/");
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!user) return null;

  const tabs = [
    { id: "dashboard" as Tab, label: "Dashboard", icon: "📊" },
    { id: "rifas" as Tab, label: "Minhas Rifas", icon: "🎰" },
    { id: "historico" as Tab, label: "Histórico", icon: "📜" },
    { id: "configuracoes" as Tab, label: "Configurações", icon: "⚙️" },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Meu Painel</h1>
            <p className="text-gray-500">Bem-vindo, {userData?.nome || user.displayName || "Usuário"}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            Sair
          </button>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-green-400"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === "dashboard" && (
          <DashboardTab userData={userData} minhasRifas={minhasRifas} />
        )}
        {activeTab === "rifas" && <MinhasRifasTab minhasRifas={minhasRifas} />}
        {activeTab === "historico" && <HistoricoTab minhasRifas={minhasRifas} />}
        {activeTab === "configuracoes" && (
          <ConfiguracoesTab userData={userData} userId={user.uid} />
        )}
      </div>
    </main>
  );
}

function DashboardTab({ userData, minhasRifas }: { userData: any; minhasRifas: any[] }) {
  const totalGasto = minhasRifas.reduce((acc, r) => acc + (r.valor || 0), 0);
  const totalNumeros = minhasRifas.reduce((acc, r) => acc + (r.quantidade || 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🎫</span>
          <span className="text-gray-500 text-sm">Rifas Participando</span>
        </div>
        <p className="text-3xl font-bold text-gray-800">{minhasRifas.length}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🔢</span>
          <span className="text-gray-500 text-sm">Total de Números</span>
        </div>
        <p className="text-3xl font-bold text-gray-800">{totalNumeros}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">💰</span>
          <span className="text-gray-500 text-sm">Total Investido</span>
        </div>
        <p className="text-3xl font-bold text-green-600">R$ {totalGasto.toFixed(2)}</p>
      </div>

      <div className="md:col-span-3 bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Últimas Atividades</h3>
        {minhasRifas.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">🎰</span>
            <p className="text-gray-500">Você ainda não participou de nenhuma rifa</p>
            <Link
              href="/"
              className="inline-block mt-4 px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
            >
              Ver rifas disponíveis
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {minhasRifas.slice(0, 5).map((rifa) => (
              <div
                key={rifa.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-800">{rifa.rifaNome || "Rifa"}</p>
                  <p className="text-sm text-gray-500">
                    {rifa.quantidade} número(s) - R$ {(rifa.valor || 0).toFixed(2)}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  rifa.status === "confirmado"
                    ? "bg-green-100 text-green-700"
                    : rifa.status === "pendente"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
                }`}>
                  {rifa.status || "Pendente"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MinhasRifasTab({ minhasRifas }: { minhasRifas: any[] }) {
  const rifasAtivas = minhasRifas.filter((r) => r.status !== "finalizado");
  const rifasFinalizadas = minhasRifas.filter((r) => r.status === "finalizado");

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Rifas Ativas ({rifasAtivas.length})</h3>
        {rifasAtivas.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Nenhuma rifa ativa no momento</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rifasAtivas.map((rifa) => (
              <div key={rifa.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-800">{rifa.rifaNome}</h4>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    Ativa
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  Seus números: {rifa.numeros?.join(", ") || rifa.quantidade + " número(s)"}
                </p>
                <p className="text-sm text-gray-500">
                  Valor: R$ {(rifa.valor || 0).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Rifas Finalizadas ({rifasFinalizadas.length})</h3>
        {rifasFinalizadas.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Nenhuma rifa finalizada ainda</p>
        ) : (
          <div className="space-y-3">
            {rifasFinalizadas.map((rifa) => (
              <div key={rifa.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{rifa.rifaNome}</p>
                  <p className="text-sm text-gray-500">
                    {rifa.quantidade} número(s)
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  rifa.ganhou ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"
                }`}>
                  {rifa.ganhou ? "🏆 Vencedor!" : "Não ganhou"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoricoTab({ minhasRifas }: { minhasRifas: any[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="font-semibold text-gray-800 mb-4">Histórico de Compras</h3>
      {minhasRifas.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Nenhuma compra realizada ainda</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="pb-3 font-medium text-gray-600">Rifa</th>
                <th className="pb-3 font-medium text-gray-600">Qtd</th>
                <th className="pb-3 font-medium text-gray-600">Valor</th>
                <th className="pb-3 font-medium text-gray-600">Status</th>
                <th className="pb-3 font-medium text-gray-600">Data</th>
              </tr>
            </thead>
            <tbody>
              {minhasRifas.map((rifa) => (
                <tr key={rifa.id} className="border-b">
                  <td className="py-3">{rifa.rifaNome || "Rifa"}</td>
                  <td className="py-3">{rifa.quantidade}</td>
                  <td className="py-3">R$ {(rifa.valor || 0).toFixed(2)}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      rifa.status === "confirmado"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {rifa.status || "Pendente"}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500">
                    {rifa.createdAt?.toDate?.()?.toLocaleDateString?.() || "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ConfiguracoesTab({ userData, userId }: { userData: any; userId: string }) {
  const [formData, setFormData] = useState({
    nome: userData?.nome || "",
    telefone: userData?.telefone || "",
    cep: userData?.cep || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [endereco, setEndereco] = useState(userData?.endereco || null);

  function formatTelefone(value: string) {
    const nums = value.replace(/\D/g, "");
    if (nums.length <= 2) return nums;
    if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7, 11)}`;
  }

  function formatCep(value: string) {
    const nums = value.replace(/\D/g, "");
    if (nums.length <= 5) return nums;
    return `${nums.slice(0, 5)}-${nums.slice(5, 8)}`;
  }

  async function buscarCep(cep: string) {
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEndereco({
          logradouro: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          estado: data.uf,
        });
      }
    } catch (err) {
      console.error("CEP error:", err);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDoc(doc(db, "usuarios", userId), {
        nome: formData.nome,
        telefone: formData.telefone.replace(/\D/g, ""),
        cep: formData.cep.replace(/\D/g, ""),
        endereco: endereco,
        updatedAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Error saving:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Dados Pessoais</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input
              type="tel"
              value={formatTelefone(formData.telefone)}
              onChange={(e) =>
                setFormData((p) => ({ ...p, telefone: e.target.value.replace(/\D/g, "").slice(0, 11) }))
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
            <input
              type="text"
              value={formatCep(formData.cep)}
              onChange={(e) => {
                const cep = e.target.value.replace(/\D/g, "").slice(0, 8);
                setFormData((p) => ({ ...p, cep }));
                if (cep.length === 8) buscarCep(cep);
              }}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {endereco && (
              <p className="text-xs text-gray-500 mt-1">
                {endereco.logradouro}, {endereco.bairro} - {endereco.cidade}/{endereco.estado}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
            {saved && <span className="text-green-600 text-sm">Salvo com sucesso!</span>}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mt-4">
        <h3 className="font-semibold text-gray-800 mb-2">Email</h3>
        <p className="text-gray-500">{userData?.email}</p>
        <p className="text-xs text-gray-400 mt-1">O email não pode ser alterado</p>
      </div>
    </div>
  );
}
