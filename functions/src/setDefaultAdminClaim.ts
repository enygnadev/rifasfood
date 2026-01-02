import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Quando um usuário é criado, já adiciona a custom claim admin: false
export const setDefaultAdminClaim = functions.auth.user().onCreate(async (user) => {
  try {
    await admin.auth().setCustomUserClaims(user.uid, { admin: false });
    console.log(`Custom claim admin: false set for user ${user.uid}`);
  } catch (e) {
    console.error("Error setting custom claim on create:", e);
  }
});
