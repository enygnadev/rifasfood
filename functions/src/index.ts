import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

// RNG auditable
import crypto from "crypto";
function chooseWinningNumber(seed: string, totalNumbers: number): number {
  const hash = crypto.createHash("sha256").update(seed).digest("hex");
  const slice = hash.slice(0, 15);
  const num = parseInt(slice, 16);
  return (num % totalNumbers) + 1;
}

// Scheduled job: runs every minute, finds rifas in 'contagem' with timerExpiresAt <= now
export const checkAndRunSorteios = functions.pubsub
  .schedule("every 1 minutes")
  .onRun(async (context) => {
    const now = new Date().toISOString();
    const q = db.collection("rifas").where("status", "==", "contagem").where("timerExpiresAt", "<=", now).limit(20);
    const snap = await q.get();
    const results: any[] = [];

    for (const doc of snap.docs) {
      const r = doc.data();
      const rId = doc.id;

      // Gather purchases
      const purchasesSnap = await db.collection("compras").where("rifaId", "==", rId).where("pagamentoStatus", "==", "paid").get();
      const ownerMap = new Map<number, any>();
      let totalNumbers = 0;
      purchasesSnap.forEach(p => {
        const pData: any = p.data();
        (pData.numeros || []).forEach((n: number) => ownerMap.set(n, { userId: pData.userId, purchaseId: pData.id }));
        totalNumbers = Math.max(totalNumbers, ...(pData.numeros || []));
      });

      if (totalNumbers === 0) {
        await db.collection("rifas").doc(rId).update({ status: "encerrada", updatedAt: new Date().toISOString() });
        results.push({ rifa: rId, winner: null, reason: "no participants" });
        continue;
      }

      const seed = `${rId}-${r.timerExpiresAt}-${new Date().toISOString()}`;
      const winningNumber = chooseWinningNumber(seed, totalNumbers);
      const winner = ownerMap.get(winningNumber) || null;

      // Write winner + historico
      await db.collection("rifas").doc(rId).update({ status: "encerrada", vencedor: { winner, winningNumber, seed, drawnAt: new Date().toISOString() }, updatedAt: new Date().toISOString() });
      await db.collection("historico").add({ rifaId: rId, winner, winningNumber, seed, timestamp: new Date().toISOString() });

      // Notifications
      try {
        // collect user tokens
        const userIds = Array.from(new Set([ ...(purchasesSnap.docs.map(d => d.data().userId)) ]));
        const tokens: string[] = [];
        for (const uid of userIds) {
          const uSnap = await db.collection("users").doc(uid).get();
          const u = uSnap.data();
          if (u && u.fcmTokens) tokens.push(...(u.fcmTokens || []));

          // Send email to winner if this uid is the winner
          if (winner && u && u.email && winner.userId === uid) {
            try {
              const sg = require('@sendgrid/mail');
              sg.setApiKey(process.env.SENDGRID_API_KEY || '');
              const msg = {
                to: u.email,
                from: process.env.SENDGRID_FROM_EMAIL || 'no-reply@rifafood.example',
                subject: `Você venceu a ${r.nome}!`,
                text: `Parabéns! O número ${winningNumber} foi sorteado e você é o vencedor da rifa ${r.nome}. Entre no app para ver como resgatar seu prêmio.`,
                html: `<p>Parabéns! O número <strong>${winningNumber}</strong> foi sorteado e você é o vencedor da rifa <strong>${r.nome}</strong>.</p><p>Entre no app para ver como resgatar seu prêmio.</p>`,
              };
              await sg.send(msg);
            } catch (e) {
              console.warn('sendgrid error', e);
            }
          }
        }
        if (tokens.length) {
          const message = {
            notification: { title: "Sorteio realizado", body: winner ? `Vencedor: ${winner.userId || 'usuário'}` : "Sorteio realizado" },
            tokens: tokens.slice(0, 500)
          } as any;
          await messaging.sendMulticast(message);
        }
      } catch (e) {
        console.warn("notification error", e);
      }

      // Auto-create new rifa (clone)
      try {
        const newName = `${r.nome} — nova rodada`;
        await db.collection("rifas").add({
          nome: newName,
          meta: r.meta || 100,
          valorPorNumero: r.valorPorNumero || r.valor || 10,
          vendidos: 0,
          locked: false,
          status: "ativa",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("auto-create rifa error", e);
      }

      results.push({ rifa: rId, winner, winningNumber });
    }

    return null;
  });
