"use client";
import React, { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase/client";

export default function AutomaticoTab() {
  const [autoRifaEnabled, setAutoRifaEnabled] = useState<boolean>(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  // Garante que todos os modelos tenham os campos extras
  function withExtraFields(arr: any[]) {
    return arr.map(tpl => ({
      ...tpl,
      valorQueVouPagar: tpl.valorQueVouPagar ?? 0,
      porcentoQueQueroGanhar: tpl.porcentoQueQueroGanhar ?? 0,
      quantidadeDeTickets: tpl.quantidadeDeTickets ?? 0,
    }));
  }

  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Buscar status do motor e templates do Firestore/config
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const docRef = doc(db, "config", "autoTemplates");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setTemplates(withExtraFields(snap.data().templates || []));
        }
        const autoRifaRef = doc(db, "config", "autoRifa");
        const autoRifaSnap = await getDoc(autoRifaRef);
        setAutoRifaEnabled(!!(autoRifaSnap.exists() && autoRifaSnap.data()?.enabled));
      } catch {}
      setLoading(false);
    }
    fetchData();
  }, []);

  async function handleToggleAutoRifa() {
    setToggleLoading(true);
    try {
      const autoRifaRef = doc(db, "config", "autoRifa");
      await setDoc(autoRifaRef, { enabled: !autoRifaEnabled }, { merge: true });
      setAutoRifaEnabled(!autoRifaEnabled);
      if (!autoRifaEnabled) {
        // Chama endpoint para criar rifas automáticas
        await fetch("/api/auto-rifa/init", { method: "POST" });
      }
    } catch (e) {
      alert("Erro ao ativar/desativar motor automático");
    }
    setToggleLoading(false);
  }

  function handleChange(idx: number, field: string, value: any) {
    setTemplates((prev) => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  }

  function calcularValorPorNumero(idx: number) {
    setTemplates((prev) => prev.map((t, i) => {
      if (i !== idx) return t;
      const valor = Number(t.valorQueVouPagar) || 0;
      const porcento = Number(t.porcentoQueQueroGanhar) || 0;
      const qtd = Number(t.meta) || 0;
      if (valor > 0 && qtd > 0) {
        const valorTotal = valor + (valor * porcento / 100);
        return { ...t, valorPorNumero: Math.ceil((valorTotal / qtd) * 100) / 100 };
      }
      return t;
    }));
  }

  // Botão de salvar sempre liberado
  function validateTemplates() {
    return true;
  }

  async function handleSave() {
    if (!validateTemplates()) {
      alert("Preencha todos os campos obrigatórios dos modelos antes de salvar.");
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, "config", "autoTemplates"), { templates });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (e) {
      let msg = "";
      if (e instanceof Error) msg = e.message;
      else if (typeof e === "string") msg = e;
      else msg = JSON.stringify(e);
      alert("Erro ao salvar: " + msg);
    }
    setSaving(false);
  }

  return (
    <section>
      <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-4">
        <div className="flex flex-col flex-1">
          <span className="font-bold text-lg text-green-800">Motor de Rifas Automáticas</span>
          <span className="text-green-900 text-sm">Sistema autônomo que cria, gerencia e reinicia rifas automaticamente</span>
        </div>
        <button
          className={`px-3 py-1 rounded-full font-bold text-xs transition ${autoRifaEnabled ? "bg-green-600 text-white" : "bg-gray-300 text-gray-700"}`}
          onClick={handleToggleAutoRifa}
          disabled={toggleLoading}
        >
          {toggleLoading ? "..." : autoRifaEnabled ? "ATIVO" : "ATIVAR"}
        </button>
      </div>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">🤖 Modelos Automáticos</h2>
      {loading ? (
        <div>Carregando...</div>
      ) : (
        <form className="space-y-8">
          {templates.map((tpl, idx) => (
            <div key={tpl.id} className="bg-white rounded-xl shadow p-4 flex flex-col gap-2 border border-gray-100">
              <div className="flex gap-2 items-center">
                <span className="text-2xl">{tpl.emoji}</span>
                <input className="font-bold text-lg flex-1 border-b border-gray-200 focus:border-green-500 outline-none bg-transparent" value={tpl.nome} onChange={e => handleChange(idx, "nome", e.target.value)} />
                <input className="w-16 text-center border-b border-gray-200 focus:border-green-500 outline-none bg-transparent" value={tpl.emoji} onChange={e => handleChange(idx, "emoji", e.target.value)} maxLength={2} />
              </div>
              <div className="flex gap-4 flex-wrap">
                <label className="flex flex-col text-xs text-gray-500">Meta
                  <input type="number" className="border rounded px-2 py-1" value={tpl.meta} onChange={e => handleChange(idx, "meta", Number(e.target.value))} />
                </label>
                <label className="flex flex-col text-xs text-gray-500">Valor que vou pagar (R$)
                  <input type="number" className="border rounded px-2 py-1" value={tpl.valorQueVouPagar || ""} onChange={e => handleChange(idx, "valorQueVouPagar", Number(e.target.value))} />
                </label>
                <label className="flex flex-col text-xs text-gray-500">% que quero ganhar
                  <input type="number" className="border rounded px-2 py-1" value={tpl.porcentoQueQueroGanhar || 0} onChange={e => handleChange(idx, "porcentoQueQueroGanhar", Number(e.target.value))} />
                </label>
                <label className="flex flex-col text-xs text-gray-500">Qtd. de Tickets
                  <input type="number" className="border rounded px-2 py-1" value={tpl.quantidadeDeTickets || ""} onChange={e => handleChange(idx, "quantidadeDeTickets", Number(e.target.value))} />
                </label>
                <label className="flex flex-col text-xs text-gray-500">Valor por Número (R$)
                  <div className="flex gap-2 items-center">
                    <input type="number" className="border rounded px-2 py-1" value={tpl.valorPorNumero || ""} onChange={e => handleChange(idx, "valorPorNumero", Number(e.target.value))} placeholder="Automático" />
                    <button type="button" className="px-2 py-1 bg-blue-500 text-white rounded text-xs" onClick={() => calcularValorPorNumero(idx)}>
                      Calcular
                    </button>
                  </div>
                </label>
              </div>
              <label className="flex flex-col text-xs text-gray-500">Descrição
                <input className="border rounded px-2 py-1" value={tpl.descricao} onChange={e => handleChange(idx, "descricao", e.target.value)} />
              </label>
              <label className="flex flex-col text-xs text-gray-500">Imagem
                <input className="border rounded px-2 py-1" value={tpl.imagem} onChange={e => handleChange(idx, "imagem", e.target.value)} />
              </label>
            </div>
          ))}
          <button
            type="button"
            className={`mt-4 px-6 py-2 rounded font-bold text-white ${saving ? "bg-gray-400" : validateTemplates() ? "bg-green-600" : "bg-gray-300"}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
          {success && <span className="ml-4 text-green-600 font-semibold">Salvo!</span>}
        </form>
      )}
    </section>
  );
}
