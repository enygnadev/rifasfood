"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/client";
import { requestPermissionAndRegisterToken } from "@/firebase/messaging";

export default function NotificationSettings() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      const d = snap.data() as any;
      setEnabled(!!d?.notificationsEnabled);
    });
    return () => unsub();
  }, [user?.uid]);

  async function toggle() {
    if (!user?.uid) return alert("Usuário não autenticado");
    setSaving(true);
    try {
      const ref = doc(db, "users", user.uid);
      if (!enabled) {
        // enable: request permission and register token
        const token = await requestPermissionAndRegisterToken(user.uid);
        await setDoc(ref, { notificationsEnabled: true }, { merge: true });
        setEnabled(true);
      } else {
        // disable: clear tokens and flag
        await updateDoc(ref, { notificationsEnabled: false, fcmTokens: [] });
        setEnabled(false);
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao atualizar preferência");
    } finally {
      setSaving(false);
    }
  }

  if (enabled === null) return null;

  return (
    <div className="mb-4 p-3 bg-white rounded shadow flex items-center justify-between">
      <div>
        <div className="font-semibold">Notificações</div>
        <div className="text-xs text-gray-500">Receba alertas de sorteio e resultados</div>
      </div>
      <div>
        <button
          className={`px-3 py-2 rounded font-bold ${enabled ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
          onClick={toggle}
          disabled={saving}
        >
          {enabled ? 'Ativado' : 'Ativar'}
        </button>
      </div>
    </div>
  );
}
