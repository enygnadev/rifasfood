import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Função HTTP para atualizar claim admin
export const setUserAdminClaim = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError("permission-denied", "Somente administradores podem alterar claims.");
  }
  const { uid, admin: isAdmin } = data;
  if (!uid || typeof isAdmin !== "boolean") {
    throw new functions.https.HttpsError("invalid-argument", "Parâmetros inválidos.");
  }
  await admin.auth().setCustomUserClaims(uid, { admin: isAdmin });
  return { success: true };
});
