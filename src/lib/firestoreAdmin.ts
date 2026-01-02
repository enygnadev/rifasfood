import admin from "firebase-admin";

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    // Not throwing to keep dev flow; server APIs should validate presence.
    console.warn("Firestore admin SDK not fully configured. Set FIREBASE_* env vars.");
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    } catch (e) {
      console.warn("Firebase admin init skipped:", e);
    }
  }
}

export const adminDb = admin.apps.length ? admin.firestore() : (null as any);
export const adminMessaging = admin.apps.length ? admin.messaging() : (null as any);
export const adminAuth = admin.apps.length ? admin.auth() : (null as any);
export default admin;
