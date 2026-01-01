import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { db } from "@/firebase/client";
import { doc, setDoc, arrayUnion } from "firebase/firestore";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";

export async function requestPermissionAndRegisterToken(userId: string) {
  if (!('Notification' in window)) return null;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const messaging = getMessaging();
  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token) {
      // Save token to user's doc
      await setDoc(doc(db, 'users', userId), { fcmTokens: arrayUnion(token), notificationsEnabled: true }, { merge: true });
      return token;
    }
  } catch (err) {
    console.warn('FCM token error', err);
  }
  return null;
}

export async function removeAllTokensForUser(userId: string) {
  try {
    await setDoc(doc(db, 'users', userId), { fcmTokens: [] , notificationsEnabled: false }, { merge: true });
  } catch (e) {
    console.warn('remove tokens error', e);
  }
}

export function subscribeToMessages(onPayload: (payload: any) => void) {
  const messaging = getMessaging();
  return onMessage(messaging, (payload) => onPayload(payload));
}
