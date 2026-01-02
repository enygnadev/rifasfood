import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let app: App | null = null;
let db: Firestore | null = null;

function initAdmin() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      console.warn("[Firebase Admin] Missing credentials, some features will be disabled");
      return null;
    }

    try {
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } catch (error) {
      console.error("[Firebase Admin] Failed to initialize:", error);
      return null;
    }
  } else {
    app = getApps()[0];
  }

  return app;
}

const adminApp = initAdmin();
if (adminApp) {
  db = getFirestore(adminApp);
}

export { db, app };
