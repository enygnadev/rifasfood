"use client";
import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/painel");
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === "auth/user-not-found") {
        setError("Usuário não encontrado. Verifique seu email.");
      } else if (err.code === "auth/wrong-password") {
        setError("Senha incorreta. Tente novamente.");
      } else if (err.code === "auth/invalid-email") {
        setError("Email inválido.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Muitas tentativas. Aguarde alguns minutos.");
      } else {
        setError("Erro ao fazer login. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <span className="text-4xl mb-4 block">🎰</span>
            <h1 className="text-2xl font-bold text-gray-800">Entrar no RifaFood</h1>
            <p className="text-gray-500 mt-2">Acesse sua conta para participar das rifas</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Não tem uma conta?{" "}
              <Link href="/cadastro" className="text-green-600 hover:text-green-700 font-medium">
                Criar conta
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
