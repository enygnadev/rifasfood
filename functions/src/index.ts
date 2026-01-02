import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

// RNG auditável usando SHA-256
import crypto from "crypto";
function chooseWinningNumber(seed: string, totalNumbers: number): number {
  const hash = crypto.createHash("sha256").update(seed).digest("hex");
  const slice = hash.slice(0, 15);
  const num = parseInt(slice, 16);
  return (num % totalNumbers) + 1;
}

// Interface para tipagem
interface Winner {
  userId: string;
  purchaseId: string;
  email?: string;
  phone?: string;
}

// Scheduled job: runs every minute, finds rifas in 'contagem' with timerExpiresAt <= now
export const checkAndRunSorteios = functions.pubsub
  .schedule("every 1 minutes")
  .onRun(async () => {
    const now = new Date().toISOString();
    const q = db.collection("rifas")
      .where("status", "==", "contagem")
      .where("timerExpiresAt", "<=", now)
      .limit(20);
    const snap = await q.get();
    const results: any[] = [];

    for (const rifaDoc of snap.docs) {
      const r = rifaDoc.data();
      const rId = rifaDoc.id;

      console.log(`[Sorteio] Iniciando sorteio para rifa ${rId}: ${r.nome}`);

      // Buscar compras pagas
      const purchasesSnap = await db.collection("compras")
        .where("rifaId", "==", rId)
        .where("pagamentoStatus", "==", "paid")
        .get();

      const ownerMap = new Map<number, Winner>();
      const participantIds = new Set<string>();
      let maxNumber = 0;

      purchasesSnap.forEach(p => {
        const pData = p.data();
        participantIds.add(pData.userId);
        (pData.numeros || []).forEach((n: number) => {
          ownerMap.set(n, { 
            userId: pData.userId, 
            purchaseId: p.id,
            email: pData.email,
            phone: pData.phone,
          });
          maxNumber = Math.max(maxNumber, n);
        });
      });

      // Se não há participantes, encerrar sem vencedor
      if (maxNumber === 0) {
        // Mover para sorteiosFinalizados
        await db.collection("sorteiosFinalizados").add({
          rifaId: rId,
          nome: r.nome,
          meta: r.meta,
          vendidos: r.vendidos,
          status: "encerrada",
          vencedor: null,
          motivoEncerramento: "sem_participantes",
          sorteadoEm: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Deletar da coleção rifas
        await db.collection("rifas").doc(rId).delete();
        results.push({ rifa: rId, winner: null, reason: "no participants" });
        console.log(`[Sorteio] Rifa ${rId} encerrada sem participantes (deletada)`);
        continue;
      }

      // Gerar seed auditável
      const seed = `${rId}-${r.timerExpiresAt}-${new Date().toISOString()}-${maxNumber}`;
      const winningNumber = chooseWinningNumber(seed, maxNumber);
      const winnerBasic = ownerMap.get(winningNumber) || null;

      // Buscar dados completos do usuário vencedor
      let winnerFullData = null;
      if (winnerBasic && winnerBasic.userId) {
        try {
          const userDoc = await db.collection("users").doc(winnerBasic.userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            winnerFullData = {
              ...winnerBasic,
              name: userData?.name || userData?.displayName || "Anônimo",
              email: userData?.email || winnerBasic.email,
              phone: userData?.phone || winnerBasic.phone,
              photoURL: userData?.photoURL,
            };
          } else {
            // Se não encontrar usuário, usa dados básicos
            winnerFullData = winnerBasic;
          }
        } catch (e) {
          console.error(`[Sorteio] Erro ao buscar dados do usuário ${winnerBasic.userId}:`, e);
          winnerFullData = winnerBasic;
        }
      }

      console.log(`[Sorteio] Rifa ${rId}: Número sorteado ${winningNumber}, Vencedor: ${winnerFullData?.userId || 'nenhum'}`);

      // Preparar dados da rifa finalizada
      const sorteioFinalizado = {
        rifaId: rId,
        nome: r.nome,
        meta: r.meta,
        vendidos: r.vendidos,
        descricao: r.descricao,
        imagem: r.imagem,
        categoria: r.categoria,
        valorPorNumero: r.valorPorNumero || r.valor,
        status: "encerrada",
        vencedor: winnerFullData ? {
          ...winnerFullData,
          winningNumber, 
          seed, 
          drawnAt: admin.firestore.FieldValue.serverTimestamp(),
        } : null,
        winningNumber: winningNumber,
        createdAt: r.createdAt,
        sorteadoEm: admin.firestore.FieldValue.serverTimestamp(),
      };

      // 1. Mover para sorteiosFinalizados
      await db.collection("sorteiosFinalizados").add(sorteioFinalizado);
      console.log(`[Sorteio] Rifa ${rId} movida para sorteiosFinalizados`);

      // 2. Deletar da coleção rifas
      await db.collection("rifas").doc(rId).delete();
      console.log(`[Sorteio] Rifa ${rId} deletada da coleção rifas`);

      // Registrar no histórico
      await db.collection("historico").add({ 
        rifaId: rId, 
        rifaNome: r.nome,
        winner: winnerFullData,
        winningNumber, 
        seed, 
        descricao: r.descricao,
        totalVendidos: r.vendidos,
        totalParticipantes: participantIds.size,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // === NOTIFICAÇÕES ===
      const allTokens: string[] = [];
      const winnerTokens: string[] = [];
      let winnerEmail: string | null = null;

      for (const uid of participantIds) {
        try {
          const uSnap = await db.collection("users").doc(uid).get();
          const u = uSnap.data();
          if (u?.fcmTokens?.length) {
            allTokens.push(...u.fcmTokens);
            if (winnerFullData && winnerFullData.userId === uid) {
              winnerTokens.push(...u.fcmTokens);
              winnerEmail = u.email || winnerFullData.email || null;
            }
          }
        } catch (e) {
          console.warn(`Erro ao buscar usuário ${uid}:`, e);
        }
      }

      // 1. Enviar notificação push para o VENCEDOR
      if (winnerFullData && winnerTokens.length > 0) {
        try {
          const winnerMessage = {
            notification: { 
              title: "🏆 PARABÉNS! Você ganhou!", 
              body: `O número ${winningNumber} foi sorteado na rifa "${r.nome}"! Você é o vencedor!`,
            },
            data: {
              type: "winner",
              rifaId: rId,
              winningNumber: String(winningNumber),
            },
            tokens: winnerTokens.slice(0, 500),
          };
          const response = await messaging.sendEachForMulticast(winnerMessage);
          console.log(`[Sorteio] Push para vencedor: ${response.successCount} sucesso, ${response.failureCount} falhas`);
        } catch (e) {
          console.warn("Erro ao enviar push para vencedor:", e);
        }
      }

      // 2. Enviar notificação push para TODOS os participantes
      if (allTokens.length > 0) {
        try {
          const allMessage = {
            notification: { 
              title: "🎰 Sorteio Realizado!", 
              body: `A rifa "${r.nome}" foi sorteada! Número vencedor: ${winningNumber}`,
            },
            data: {
              type: "sorteio",
              rifaId: rId,
              winningNumber: String(winningNumber),
            },
            tokens: allTokens.slice(0, 500),
          };
          const response = await messaging.sendEachForMulticast(allMessage);
          console.log(`[Sorteio] Push para participantes: ${response.successCount} sucesso, ${response.failureCount} falhas`);
        } catch (e) {
          console.warn("Erro ao enviar push para participantes:", e);
        }
      }

      // 3. Enviar email para o VENCEDOR (via SendGrid)
      if (winnerFullData && winnerEmail && process.env.SENDGRID_API_KEY) {
        try {
          const sg = require('@sendgrid/mail');
          sg.setApiKey(process.env.SENDGRID_API_KEY);
          const msg = {
            to: winnerEmail,
            from: process.env.SENDGRID_FROM_EMAIL || 'no-reply@rifafood.com',
            subject: `🏆 Parabéns! Você ganhou a rifa "${r.nome}"!`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 10px; text-align: center; color: white;">
                  <h1 style="margin: 0; font-size: 28px;">🏆 VOCÊ GANHOU! 🏆</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 10px 10px;">
                  <h2 style="color: #1f2937;">Parabéns!</h2>
                  <p style="color: #4b5563; font-size: 16px;">
                    O número <strong style="color: #10b981; font-size: 24px;">${winningNumber}</strong> 
                    foi sorteado e você é o grande vencedor!
                  </p>
                  <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0; color: #1f2937;">${r.nome}</h3>
                    <p style="margin: 0; color: #6b7280;">Prêmio: <strong style="color: #10b981;">${r.premio || "Prêmio Especial"}</strong></p>
                  </div>
                  <p style="color: #4b5563;">Entre no app para ver como resgatar seu prêmio. Em breve entraremos em contato!</p>
                </div>
              </div>
            `,
            text: `Parabéns! O número ${winningNumber} foi sorteado e você é o vencedor da rifa "${r.nome}"! Prêmio: ${r.premio}. Entre no app para resgatar.`,
          };
          await sg.send(msg);
          console.log(`[Sorteio] Email enviado para vencedor: ${winnerEmail}`);
        } catch (e) {
          console.warn('Erro ao enviar email:', e);
        }
      }

      // 4. Criar nova rodada automaticamente
      try {
        const newRifa = {
          nome: r.nome,
          meta: r.meta || 100,
          valorPorNumero: r.valorPorNumero || r.valor || 10,
          premio: r.premio,
          categoria: r.categoria,
          imagem: r.imagem,
          descricao: r.descricao,
          productId: r.productId,
          vendidos: 0,
          locked: false,
          status: "ativa",
          autoGenerated: true,
          previousRifaId: rId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        const newRef = await db.collection("rifas").add(newRifa);
        console.log(`[Sorteio] Nova rodada criada: ${newRef.id}`);
      } catch (e) {
        console.warn("Erro ao criar nova rodada:", e);
      }

      results.push({ rifa: rId, winner: winnerFullData, winningNumber });
    }

    console.log(`[Sorteio] Ciclo finalizado. ${results.length} rifas processadas.`);
    return null;
  });
