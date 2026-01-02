"use client";
import React, { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/firebase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function CadastroPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/painel";
  
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    password: "",
    confirmPassword: "",
    telefone: "",
    cep: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [endereco, setEndereco] = useState<any>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "cep" && value.replace(/\D/g, "").length === 8) {
      buscarCep(value.replace(/\D/g, ""));
    }
  }

  async function buscarCep(cep: string) {
    setCepLoading(true);
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
      } else {
        setEndereco(null);
      }
    } catch (err) {
      console.error("CEP error:", err);
      setEndereco(null);
    } finally {
      setCepLoading(false);
    }
  }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (formData.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (formData.telefone.replace(/\D/g, "").length < 10) {
      setError("Telefone inválido");
      return;
    }

    if (formData.cep.replace(/\D/g, "").length !== 8) {
      setError("CEP inválido");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      await updateProfile(userCredential.user, {
        displayName: formData.nome,
      });

      await setDoc(doc(db, "usuarios", userCredential.user.uid), {
        uid: userCredential.user.uid,
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone.replace(/\D/g, ""),
        cep: formData.cep.replace(/\D/g, ""),
        endereco: endereco || null,
        role: "cliente",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      router.push(redirectTo);
    } catch (err: any) {
      console.error("Signup error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("Este email já está cadastrado");
      } else if (err.code === "auth/invalid-email") {
        setError("Email inválido");
      } else if (err.code === "auth/weak-password") {
        setError("Senha muito fraca");
      } else {
        setError("Erro ao criar conta. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <span className="text-4xl mb-4 block">🎰</span>
            <h1 className="text-2xl font-bold text-gray-800">Criar Conta</h1>
            <p className="text-gray-500 mt-2">Preencha seus dados para participar das rifas</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome completo
              </label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                placeholder="João Silva"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="tel"
                name="telefone"
                value={formatTelefone(formData.telefone)}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    telefone: e.target.value.replace(/\D/g, "").slice(0, 11),
                  }))
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                placeholder="(11) 99999-9999"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
              <div className="relative">
                <input
                  type="text"
                  name="cep"
                  value={formatCep(formData.cep)}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      cep: e.target.value.replace(/\D/g, "").slice(0, 8),
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  placeholder="00000-000"
                  required
                />
                {cepLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {endereco && (
                <p className="text-xs text-gray-500 mt-1">
                  {endereco.logradouro}, {endereco.bairro} - {endereco.cidade}/{endereco.estado}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar senha
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Criando conta..." : "Criar conta"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Já tem uma conta?{" "}
              <Link href={`/login${redirectTo !== "/painel" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`} className="text-green-600 hover:text-green-700 font-medium">
                Entrar
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">
              Voltar para o início
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
