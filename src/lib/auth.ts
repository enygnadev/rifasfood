import { getAuth, signInAnonymously } from "firebase/auth";
import { auth as clientAuth } from "@/firebase/client";

export async function ensureAnonymous() {
  const auth = clientAuth || getAuth();
  if (auth.currentUser) return auth.currentUser;
  const { user } = await signInAnonymously(auth);
  return user;
}
