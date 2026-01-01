
"use client";
import React, { useState } from "react";

export default function AdminPage() {
  const [result, setResult] = useState<string | null>(null);
  const [rifas, setRifas] = useState<any[]>([]);

  async function fetchRifas() {
    const res = await fetch('/api/admin/list-rifas', { headers: { 'x-admin-secret': String(process.env.NEXT_PUBLIC_ADMIN_SECRET || '') } });
    const data = await res.json();
    if (data.rifas) setRifas(data.rifas);
  }

  React.useEffect(() => { fetchRifas(); }, []);

  async function criarRifa(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const nome = form.get("nome")?.toString();
    const meta = form.get("meta")?.toString();
    const valor = form.get("valor")?.toString();

    if (!nome || !meta || !valor) return alert("Preencha todos os campos");

    const res = await fetch("/api/admin/criar-rifa", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": String(process.env.NEXT_PUBLIC_ADMIN_SECRET || "") },
      body: JSON.stringify({ nome, meta, valor })
    });
    const data = await res.json();
    if (data.id) {
      setResult(`Rifa criada: ${data.id}`);
      fetchRifas();
    } else setResult(`Erro: ${data.error || "unknown"}`);
  }

  return (
    <main className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Painel Admin</h1>
      <div className="bg-gray-100 rounded p-4 mb-4">
        <div className="font-semibold mb-2">Criar nova rifa</div>
        <form className="flex flex-col gap-2" onSubmit={criarRifa}>
          <input className="border rounded p-2" placeholder="Nome da rifa" name="nome" />
          <input className="border rounded p-2" placeholder="Meta de números" type="number" name="meta" />
          <input className="border rounded p-2" placeholder="Valor do número (R$)" type="number" name="valor" />
          <button className="bg-green-600 text-white rounded py-2 font-bold" type="submit">Criar</button>
        </form>
        {result && <div className="mt-2 text-sm">{result}</div>}
      </div>
      <div className="bg-white rounded shadow p-4">
        <div className="font-semibold mb-2">Resumo</div>
        <ul className="text-sm">
          <li>Lucro total: <span className="font-mono">R$ 1.200,00</span></li>
          <li>Rifas encerradas: 12</li>
          <li>Últimos vencedores: Ana, Bruno, Carlos</li>
        </ul>
      </div>

      <div className="mt-6 bg-white rounded shadow p-4">
        <div className="font-semibold mb-2">Rifas (admin)</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left"><th>Nome</th><th>Meta</th><th>Vendidos</th><th>Valor</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {rifas.map(r => (
              <tr key={r.id} className="border-t">
                <td>{r.nome}</td>
                <td>{r.meta}</td>
                <td>{r.vendidos || 0}</td>
                <td>R$ {r.valorPorNumero || r.valor || 10}</td>
                <td>{r.status}</td>
                <td>
                  <button className="mr-2 px-2 py-1 bg-blue-600 text-white rounded" onClick={async () => { const res = await fetch('/api/admin/force-run', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-secret': String(process.env.NEXT_PUBLIC_ADMIN_SECRET || '') }, body: JSON.stringify({ rifaId: r.id }) }); const data = await res.json(); alert(JSON.stringify(data)); fetchRifas(); }}>Forçar Sorteio</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
