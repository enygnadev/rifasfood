"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/client";
import { ensureAnonymous } from "@/lib/auth";

const AuthContext = createContext({ user: null as any, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ensure anonymous sign-in
    (async () => {
      try {
        const u = await ensureAnonymous();
      } catch (e) {
        console.warn("anonymous signin failed", e);
      }
    })();

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);

      // If user is present, try to register FCM token
      if (u && u.uid) {
        import("@/firebase/messaging").then(({ requestPermissionAndRegisterToken }) => {
          requestPermissionAndRegisterToken(u.uid).then((token) => {
            if (token) console.log("FCM token registered for user", u.uid);
          }).catch((e) => console.warn("FCM register error", e));
        }).catch(() => {});
      }
    });
    return () => unsub();
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
