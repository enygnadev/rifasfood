"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
const AutomaticoTab = dynamic(() => import("./AutomaticoTab"), { ssr: false });
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { db } from "@/firebase/client";
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, addDoc, serverTimestamp, getDocs, where, getDoc } from "firebase/firestore";
import Link from "next/link";

type AdminTab = "dashboard" | "rifas" | "usuarios" | "vendas" | "configuracoes" | "automatico";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    async function checkAdminRole() {
      if (authLoading) return;
      
      if (!user || user.isAnonymous) {
        setCheckingAdmin(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists() && userDoc.data().role === "admin") {
          setIsAdmin(true);
        }
      } catch (err) {
        console.error("Error checking admin role:", err);
      } finally {
        setCheckingAdmin(false);
      }
    }

    checkAdminRole();
  }, [user, authLoading]);

  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!user || user.isAnonymous) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <span className="text-5xl mb-4 block">🔒</span>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Acesso Restrito</h1>
          <p className="text-gray-500 mb-6">Você precisa estar logado para acessar o painel admin.</p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
          >
            Fazer Login
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <span className="text-5xl mb-4 block">⛔</span>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Sem Permissão</h1>
          <p className="text-gray-500 mb-6">Você não tem permissão de administrador para acessar esta página.</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
          >
            Voltar para Início
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard" as AdminTab, label: "Dashboard", icon: "📊" },
    { id: "rifas" as AdminTab, label: "Rifas", icon: "🎰" },
    { id: "usuarios" as AdminTab, label: "Usuários", icon: "👥" },
    { id: "vendas" as AdminTab, label: "Vendas", icon: "💰" },
    { id: "automatico" as AdminTab, label: "Automático", icon: "🤖" },
    { id: "configuracoes" as AdminTab, label: "Configurações", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className={`${sidebarOpen ? "w-64" : "w-16"} bg-gray-900 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 flex items-center gap-3 border-b border-gray-700">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center text-white font-extrabold">
            RF
          </div>
          {sidebarOpen && <span className="font-bold text-lg">Admin</span>}
        </div>

        <nav className="flex-1 py-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                activeTab === tab.id
                  ? "bg-green-600 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              {sidebarOpen && <span>{tab.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white transition"
          >
            {sidebarOpen ? "◀ Recolher" : "▶"}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {activeTab === "dashboard" && <DashboardTab />}
          {activeTab === "rifas" && <RifasTab />}
          {activeTab === "usuarios" && <UsuariosTab />}
          {activeTab === "vendas" && <VendasTab />}
          {activeTab === "automatico" && <AutomaticoTab />}
          {activeTab === "configuracoes" && <ConfiguracoesTab />}
        </div>
      </main>
    </div>
  );
}

function DashboardTab() {
  const [stats, setStats] = useState({
    totalRifas: 0,
    rifasAtivas: 0,
    totalUsuarios: 0,
    totalVendas: 0,
    lucroTotal: 0,
    vendasHoje: 0,
    vendasSemana: 0,
    vendasMes: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [topRifas, setTopRifas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const rifasSnap = await getDocs(collection(db, "rifas"));
        const rifasAtivas = rifasSnap.docs.filter((d) => d.data().status !== "finalizado").length;
        const usuariosSnap = await getDocs(collection(db, "usuarios"));
        const comprasSnap = await getDocs(collection(db, "compras"));
        
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        let vendasHoje = 0, vendasSemana = 0, vendasMes = 0, lucroTotal = 0;
        const activities: any[] = [];

        comprasSnap.docs.forEach((d) => {
          const data = d.data();
          const valor = data.valor || 0;
          lucroTotal += valor;
          const createdAt = data.createdAt?.toDate?.();
          if (createdAt) {
            if (createdAt >= todayStart) vendasHoje += valor;
            if (createdAt >= weekStart) vendasSemana += valor;
            if (createdAt >= monthStart) vendasMes += valor;
            activities.push({ type: "compra", text: `Compra de R$ ${valor.toFixed(2)}`, time: createdAt, icon: "🎫" });
          }
        });

        const historicoSnap = await getDocs(query(collection(db, "historico"), orderBy("sortedAt", "desc")));
        historicoSnap.docs.slice(0, 3).forEach((d) => {
          const data = d.data();
          activities.push({ type: "sorteio", text: `Sorteio: ${data.rifaNome}`, time: data.sortedAt?.toDate?.(), icon: "🏆" });
        });

        usuariosSnap.docs.slice(0, 3).forEach((d) => {
          const data = d.data();
          const createdAt = data.createdAt?.toDate?.();
          if (createdAt) {
            activities.push({ type: "usuario", text: `Novo usuário: ${data.nome || "Anônimo"}`, time: createdAt, icon: "👤" });
          }
        });

        activities.sort((a, b) => (b.time?.getTime?.() || 0) - (a.time?.getTime?.() || 0));
        setRecentActivity(activities.slice(0, 6));

        const topRifasData = rifasSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((r: any) => r.status !== "finalizado")
          .sort((a: any, b: any) => (b.vendidos || 0) - (a.vendidos || 0))
          .slice(0, 5);
        setTopRifas(topRifasData);

        setStats({
          totalRifas: rifasSnap.size,
          rifasAtivas,
          totalUsuarios: usuariosSnap.size,
          totalVendas: comprasSnap.size,
          lucroTotal,
          vendasHoje,
          vendasSemana,
          vendasMes,
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  function formatTimeAgo(date: Date | undefined) {
    if (!date) return "-";
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "agora";
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours}h`;
    const days = Math.floor(hours / 24);
    return `há ${days}d`;
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-200 h-32 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const taxaConversao = stats.totalUsuarios > 0 ? ((stats.totalVendas / stats.totalUsuarios) * 100).toFixed(1) : "0";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon="🎰" label="Total de Rifas" value={stats.totalRifas} />
        <StatCard icon="🔥" label="Rifas Ativas" value={stats.rifasAtivas} color="green" />
        <StatCard icon="👥" label="Usuários" value={stats.totalUsuarios} color="blue" />
        <StatCard icon="💰" label="Lucro Total" value={`R$ ${stats.lucroTotal.toFixed(2)}`} color="yellow" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Atividade Recente</h3>
          {recentActivity.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhuma atividade recente</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((a, i) => (
                <ActivityItem key={i} icon={a.icon} text={a.text} time={formatTimeAgo(a.time)} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Resumo de Vendas</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Vendas hoje</span>
              <span className="font-medium text-green-600">R$ {stats.vendasHoje.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Vendas esta semana</span>
              <span className="font-medium">R$ {stats.vendasSemana.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Vendas este mês</span>
              <span className="font-medium">R$ {stats.vendasMes.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600">Taxa de conversão</span>
              <span className="font-medium text-blue-600">{taxaConversao}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Top Rifas Ativas</h3>
        {topRifas.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhuma rifa ativa</p>
        ) : (
          <div className="space-y-3">
            {topRifas.map((rifa: any) => {
              const percent = rifa.meta > 0 ? Math.round(((rifa.vendidos || 0) / rifa.meta) * 100) : 0;
              return (
                <div key={rifa.id} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{rifa.nome}</span>
                      <span className="text-xs text-gray-500">{rifa.vendidos || 0}/{rifa.meta}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${percent >= 80 ? "bg-green-500" : percent >= 50 ? "bg-yellow-500" : "bg-blue-500"}`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${percent >= 80 ? "text-green-600" : "text-gray-600"}`}>{percent}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color = "gray" }: { icon: string; label: string; value: string | number; color?: string }) {
  const colorClasses = {
    gray: "bg-gray-100",
    green: "bg-green-100",
    blue: "bg-blue-100",
    yellow: "bg-yellow-100",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className={`w-12 h-12 ${colorClasses[color as keyof typeof colorClasses]} rounded-lg flex items-center justify-center text-2xl mb-3`}>
        {icon}
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

function ActivityItem({ icon, text, time }: { icon: string; text: string; time: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <p className="text-sm text-gray-700">{text}</p>
        <p className="text-xs text-gray-400">{time}</p>
      </div>
    </div>
  );
}

function RifasTab() {
  const [rifas, setRifas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editRifa, setEditRifa] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, "rifas"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setRifas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta rifa?")) return;
    try {
      await deleteDoc(doc(db, "rifas", id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Erro ao excluir");
    }
  }

  async function handleCreate(data: any) {
    try {
      await addDoc(collection(db, "rifas"), {
        ...data,
        vendidos: 0,
        status: "aberta",
        createdAt: serverTimestamp(),
      });
      setShowCreate(false);
    } catch (err) {
      console.error("Create error:", err);
      alert("Erro ao criar rifa");
    }
  }

  async function handleUpdate(id: string, data: any) {
    try {
      await updateDoc(doc(db, "rifas", id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
      setEditRifa(null);
    } catch (err) {
      console.error("Update error:", err);
      alert("Erro ao atualizar");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gerenciar Rifas</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-2"
        >
          <span>+</span> Nova Rifa
        </button>
      </div>

      {showCreate && (
        <RifaForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {editRifa && (
        <RifaForm
          rifa={editRifa}
          onSubmit={(data) => handleUpdate(editRifa.id, data)}
          onCancel={() => setEditRifa(null)}
        />
      )}

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Nome</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Meta</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Vendidos</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Valor</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rifas.map((rifa) => (
                <tr key={rifa.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{rifa.nome}</td>
                  <td className="px-4 py-3">{rifa.meta}</td>
                  <td className="px-4 py-3">{rifa.vendidos || 0}</td>
                  <td className="px-4 py-3">R$ {rifa.valorPorNumero || rifa.valor || 10}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      rifa.status === "aberta"
                        ? "bg-green-100 text-green-700"
                        : rifa.status === "contagem"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {rifa.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditRifa(rifa)}
                        className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(rifa.id)}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                      >
                        Excluir
                      </button>
                    </div>
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

function RifaForm({ rifa, onSubmit, onCancel }: { rifa?: any; onSubmit: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    nome: rifa?.nome || "",
    meta: rifa?.meta || "",
    valorPorNumero: rifa?.valorPorNumero || rifa?.valor || "",
    categoria: rifa?.categoria || "outros",
    descricao: rifa?.descricao || "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      nome: formData.nome,
      meta: Number(formData.meta),
      valorPorNumero: Number(formData.valorPorNumero),
      categoria: formData.categoria,
      descricao: formData.descricao,
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <h3 className="font-semibold text-gray-800 mb-4">
        {rifa ? "Editar Rifa" : "Nova Rifa"}
      </h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <input
            type="text"
            value={formData.nome}
            onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Meta de Números</label>
          <input
            type="number"
            value={formData.meta}
            onChange={(e) => setFormData((p) => ({ ...p, meta: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor por Número (R$)</label>
          <input
            type="number"
            step="0.01"
            value={formData.valorPorNumero}
            onChange={(e) => setFormData((p) => ({ ...p, valorPorNumero: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
          <select
            value={formData.categoria}
            onChange={(e) => setFormData((p) => ({ ...p, categoria: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="eletronicos">Eletrônicos</option>
            <option value="veiculos">Veículos</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="experiencias">Experiências</option>
            <option value="outros">Outros</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <textarea
            value={formData.descricao}
            onChange={(e) => setFormData((p) => ({ ...p, descricao: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg"
            rows={3}
          />
        </div>
        <div className="md:col-span-2 flex gap-3">
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
          >
            {rifa ? "Salvar" : "Criar Rifa"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

function UsuariosTab() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const q = query(collection(db, "usuarios"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setUsuarios(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredUsuarios = usuarios.filter(
    (u) =>
      u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>("");
  const [savingRole, setSavingRole] = useState(false);

  async function saveRole(userId: string, newRole: string) {
    setSavingRole(true);
    try {
      await updateDoc(doc(db, "usuarios", userId), { role: newRole });
      // Chama Cloud Function para atualizar custom claim
      const res = await fetch("/api/setUserAdminClaim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: userId, admin: newRole === "admin" })
      });
      if (!res.ok) throw new Error("Erro ao atualizar claim");
      setEditingUserId(null);
    } catch (err) {
      alert("Erro ao salvar papel: " + (err as any)?.message);
    }
    setSavingRole(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gerenciar Usuários</h1>
        <input
          type="text"
          placeholder="Buscar usuário..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border rounded-lg w-64"
        />
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Nome</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Telefone</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsuarios.map((u) => (
                <tr key={u.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{u.nome}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.telefone || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      u.role === "admin"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {u.role || "cliente"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {editingUserId === u.id ? (
                      <div className="flex gap-2 items-center">
                        <select
                          value={editRole}
                          onChange={e => setEditRole(e.target.value)}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value="cliente">Cliente</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                          disabled={savingRole}
                          onClick={() => saveRole(u.id, editRole)}
                        >Salvar</button>
                        <button
                          className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs"
                          disabled={savingRole}
                          onClick={() => setEditingUserId(null)}
                        >Cancelar</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingUserId(u.id); setEditRole(u.role || "cliente"); }}
                        className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                      >Editar</button>
                    )}
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

function VendasTab() {
  const [vendas, setVendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<Record<string, any>>({});
  const [rifas, setRifas] = useState<Record<string, any>>({});

  useEffect(() => {
    const q = query(collection(db, "compras"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, async (snap) => {
      const vendasData = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
      setVendas(vendasData);

      const userIds = [...new Set(vendasData.map((v) => v.userId).filter(Boolean))];
      const rifaIds = [...new Set(vendasData.map((v) => v.rifaId).filter(Boolean))];

      const usuariosData: Record<string, any> = {};
      const rifasData: Record<string, any> = {};

      await Promise.all([
        ...userIds.map(async (userId) => {
          try {
            const userDoc = await getDoc(doc(db, "usuarios", userId));
            if (userDoc.exists()) {
              usuariosData[userId] = userDoc.data();
            }
          } catch (err) {}
        }),
        ...rifaIds.map(async (rifaId) => {
          try {
            const rifaDoc = await getDoc(doc(db, "rifas", rifaId));
            if (rifaDoc.exists()) {
              rifasData[rifaId] = rifaDoc.data();
            }
          } catch (err) {}
        }),
      ]);

      setUsuarios(usuariosData);
      setRifas(rifasData);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const totalVendas = vendas.reduce((acc, v) => acc + (v.valor || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Relatório de Vendas</h1>
        <div className="bg-green-100 px-4 py-2 rounded-lg">
          <span className="text-green-800 font-medium">Total: R$ {totalVendas.toFixed(2)}</span>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      ) : vendas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <span className="text-4xl block mb-4">💰</span>
          <p className="text-gray-500">Nenhuma venda registrada ainda</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Rifa</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Usuário</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Qtd</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Valor</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Data</th>
              </tr>
            </thead>
            <tbody>
              {vendas.map((v) => {
                const usuario = usuarios[v.userId];
                const rifa = rifas[v.rifaId];
                return (
                  <tr key={v.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">{v.id.slice(0, 8)}...</td>
                    <td className="px-4 py-3">{v.rifaNome || rifa?.nome || v.rifaId?.slice(0, 8) || "-"}</td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{usuario?.nome || "-"}</div>
                        <div className="text-xs text-gray-500">{usuario?.email || v.userId?.slice(0, 8) || "-"}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{v.quantidade || 1}</td>
                    <td className="px-4 py-3">R$ {(v.valor || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        v.status === "confirmado"
                          ? "bg-green-100 text-green-700"
                          : v.status === "pendente"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {v.status || "pendente"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {v.createdAt?.toDate?.()?.toLocaleDateString?.("pt-BR") || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ConfiguracoesTab() {
  const [config, setConfig] = useState({
    siteName: "RifaFood",
    commission: "10",
    minPurchase: "1",
    maxPurchase: "50",
    enableNotifications: true,
    maintenanceMode: false,
    boostThreshold: "80",
    boostStagnantMinutes: "5",
    countdownMinutes: "10",
    bonusAt50: "1",
    bonusAt70: "2",
    bonusAt90: "3",
  });
  const [autoRifaEnabled, setAutoRifaEnabled] = useState(false);
  const [autoRifaLoading, setAutoRifaLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const unsubAuto = onSnapshot(doc(db, "config", "autoRifa"), (snap) => {
      if (snap.exists()) {
        setAutoRifaEnabled(snap.data().enabled || false);
      }
      setAutoRifaLoading(false);
    });

    const unsubConfig = onSnapshot(doc(db, "config", "system"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setConfig((prev) => ({
          ...prev,
          siteName: data.siteName || prev.siteName,
          commission: String(data.commission || prev.commission),
          minPurchase: String(data.minPurchase || prev.minPurchase),
          maxPurchase: String(data.maxPurchase || prev.maxPurchase),
          enableNotifications: data.enableNotifications ?? prev.enableNotifications,
          maintenanceMode: data.maintenanceMode ?? prev.maintenanceMode,
          boostThreshold: String(data.boostThreshold || prev.boostThreshold),
          boostStagnantMinutes: String(data.boostStagnantMinutes || prev.boostStagnantMinutes),
          countdownMinutes: String(data.countdownMinutes || prev.countdownMinutes),
          bonusAt50: String(data.bonusAt50 || prev.bonusAt50),
          bonusAt70: String(data.bonusAt70 || prev.bonusAt70),
          bonusAt90: String(data.bonusAt90 || prev.bonusAt90),
        }));
      }
      setConfigLoading(false);
    });

    return () => { unsubAuto(); unsubConfig(); };
  }, []);

  async function toggleAutoRifa() {
    try {
      const newValue = !autoRifaEnabled;
      const { setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "config", "autoRifa"), { enabled: newValue, updatedAt: serverTimestamp() }, { merge: true });

      if (newValue) {
        fetch("/api/auto-rifa/init", { method: "POST" }).catch(console.error);
      }
    } catch (err) {
      console.error("Error toggling auto-rifa:", err);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "config", "system"), {
        siteName: config.siteName,
        commission: Number(config.commission),
        minPurchase: Number(config.minPurchase),
        maxPurchase: Number(config.maxPurchase),
        enableNotifications: config.enableNotifications,
        maintenanceMode: config.maintenanceMode,
        boostThreshold: Number(config.boostThreshold),
        boostStagnantMinutes: Number(config.boostStagnantMinutes),
        countdownMinutes: Number(config.countdownMinutes),
        bonusAt50: Number(config.bonusAt50),
        bonusAt70: Number(config.bonusAt70),
        bonusAt90: Number(config.bonusAt90),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Error saving config:", err);
      alert("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  }

  const products = [
    { emoji: "🍗", nome: "Frango Assado", meta: 100, valor: 5 },
    { emoji: "🥩", nome: "Carne Assada", meta: 150, valor: 8 },
    { emoji: "🍱", nome: "Marmita P", meta: 50, valor: 3 },
    { emoji: "🍱", nome: "Marmita M", meta: 80, valor: 5 },
    { emoji: "🍱", nome: "Marmita G", meta: 100, valor: 7 },
  ];

  if (configLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-200 h-40 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Configurações do Sistema</h1>

      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span>🔁</span> Motor de Rifas Automáticas
            </h3>
            <p className="text-purple-100 mt-1 text-sm">
              Sistema autônomo que cria, gerencia e reinicia rifas automaticamente
            </p>
          </div>
          <div className="flex items-center gap-4">
            {autoRifaLoading ? (
              <div className="w-16 h-8 bg-white/20 rounded-full animate-pulse" />
            ) : (
              <>
                <span className={`text-sm font-medium ${autoRifaEnabled ? "text-green-200" : "text-gray-300"}`}>
                  {autoRifaEnabled ? "ATIVO" : "DESATIVADO"}
                </span>
                <button
                  onClick={toggleAutoRifa}
                  className={`relative w-16 h-8 rounded-full transition-colors ${
                    autoRifaEnabled ? "bg-green-400" : "bg-white/30"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                      autoRifaEnabled ? "translate-x-9" : "translate-x-1"
                    }`}
                  />
                </button>
              </>
            )}
          </div>
        </div>
        {autoRifaEnabled && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-sm text-purple-200 mb-3">Produtos ativos no motor automático:</p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {products.map((p, i) => (
                <div key={i} className="bg-white/10 rounded-lg px-3 py-2 text-center">
                  <div className="text-lg">{p.emoji}</div>
                  <div className="text-sm font-medium">{p.nome}</div>
                  <div className="text-xs text-purple-200">Meta: {p.meta} | R${p.valor}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg p-6 mb-6 text-white">
        <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
          <span>🚀</span> Táticas de Vendas Automáticas
        </h3>
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-orange-100 mb-1">Boost ativa em (%)</label>
            <input
              type="number"
              value={config.boostThreshold}
              onChange={(e) => setConfig((p) => ({ ...p, boostThreshold: e.target.value }))}
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50"
              placeholder="80"
            />
            <p className="text-xs text-orange-200 mt-1">Sistema acelera vendas automaticamente</p>
          </div>
          <div>
            <label className="block text-sm text-orange-100 mb-1">Tempo estagnado (min)</label>
            <input
              type="number"
              value={config.boostStagnantMinutes}
              onChange={(e) => setConfig((p) => ({ ...p, boostStagnantMinutes: e.target.value }))}
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50"
              placeholder="5"
            />
            <p className="text-xs text-orange-200 mt-1">Aguarda X min antes de acelerar</p>
          </div>
          <div>
            <label className="block text-sm text-orange-100 mb-1">Countdown (min)</label>
            <input
              type="number"
              value={config.countdownMinutes}
              onChange={(e) => setConfig((p) => ({ ...p, countdownMinutes: e.target.value }))}
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50"
              placeholder="10"
            />
            <p className="text-xs text-orange-200 mt-1">Tempo antes do sorteio</p>
          </div>
          <div>
            <label className="block text-sm text-orange-100 mb-1">Bônus em 50%</label>
            <input
              type="number"
              value={config.bonusAt50}
              onChange={(e) => setConfig((p) => ({ ...p, bonusAt50: e.target.value }))}
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50"
              placeholder="1"
            />
            <p className="text-xs text-orange-200 mt-1">Números bônus grátis</p>
          </div>
          <div>
            <label className="block text-sm text-orange-100 mb-1">Bônus em 70%</label>
            <input
              type="number"
              value={config.bonusAt70}
              onChange={(e) => setConfig((p) => ({ ...p, bonusAt70: e.target.value }))}
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50"
              placeholder="2"
            />
            <p className="text-xs text-orange-200 mt-1">Números bônus grátis</p>
          </div>
          <div>
            <label className="block text-sm text-orange-100 mb-1">Bônus em 90%</label>
            <input
              type="number"
              value={config.bonusAt90}
              onChange={(e) => setConfig((p) => ({ ...p, bonusAt90: e.target.value }))}
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50"
              placeholder="3"
            />
            <p className="text-xs text-orange-200 mt-1">Números bônus grátis</p>
          </div>
          <div className="md:col-span-3 flex gap-3 mt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-white text-orange-600 rounded-lg font-bold hover:bg-orange-50 transition disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar Táticas"}
            </button>
            {saved && <span className="text-white text-sm flex items-center">Salvo com sucesso!</span>}
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Configurações Gerais</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Site</label>
              <input
                type="text"
                value={config.siteName}
                onChange={(e) => setConfig((p) => ({ ...p, siteName: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comissão (%)</label>
              <input
                type="number"
                value={config.commission}
                onChange={(e) => setConfig((p) => ({ ...p, commission: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
              {saved && <span className="text-green-600 text-sm">Salvo!</span>}
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Limites de Compra</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mínimo de números</label>
              <input
                type="number"
                value={config.minPurchase}
                onChange={(e) => setConfig((p) => ({ ...p, minPurchase: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Máximo de números</label>
              <input
                type="number"
                value={config.maxPurchase}
                onChange={(e) => setConfig((p) => ({ ...p, maxPurchase: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Notificações</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enableNotifications}
                onChange={(e) => setConfig((p) => ({ ...p, enableNotifications: e.target.checked }))}
                className="w-5 h-5 rounded"
              />
              <span>Habilitar notificações push</span>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Manutenção</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.maintenanceMode}
                onChange={(e) => setConfig((p) => ({ ...p, maintenanceMode: e.target.checked }))}
                className="w-5 h-5 rounded"
              />
              <span>Modo manutenção</span>
            </label>
            <p className="text-xs text-gray-500">
              Quando ativado, apenas administradores podem acessar o site.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
