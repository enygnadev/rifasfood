import { adminDb } from "@/lib/firestoreAdmin";

export async function processPurchaseById(purchaseId: string, opts?: { sessionId?: string }) {
  if (!purchaseId) throw new Error("Missing purchaseId");

  const purchaseRef = adminDb.collection("compras").doc(purchaseId.toString());
  await adminDb.runTransaction(async (tx: any) => {
    const pSnap = await tx.get(purchaseRef);
    if (!pSnap.exists) return;
    const p = pSnap.data();
    if (!p) return;
    if (p.pagamentoStatus === "paid") return; // already processed

    // Assign number range based on current sold count
    const rifaRef = adminDb.collection("rifas").doc(p.rifaId);
    const rSnap = await tx.get(rifaRef);
    if (!rSnap.exists) throw new Error("Rifa not found");
    const rifa = rSnap.data();
    const vendidos = rifa?.vendidos || 0;
    const meta = rifa?.meta || 100;
    
    let numeros: number[] = [];
    let quantidade = p.quantidade || 1;
    
    // Se rifa atingiu a meta, distribuir extras (números > meta)
    if (vendidos >= meta) {
      // Durante período 2X, permitir até 20 extras
      // Extras são números meta+1, meta+2, ..., meta+20
      const totalExtras = await adminDb.collection("compras").where("rifaId", "==", p.rifaId).where("pagamentoStatus", "==", "paid").get();
      let extrasCount = 0;
      totalExtras.forEach((doc: any) => {
        const nums = doc.data().numeros || [];
        const extrasNeste = nums.filter((n: number) => n > meta).length;
        extrasCount += extrasNeste;
      });
      
      if (extrasCount + quantidade > 20) {
        quantidade = Math.max(0, 20 - extrasCount);
      }
      
      if (quantidade > 0) {
        const start = meta + extrasCount + 1;
        const end = meta + extrasCount + quantidade;
        numeros = Array.from({ length: quantidade }, (_, i) => start + i);
        console.log(`[WebhookProcessor] Extras para rifa ${p.rifaId}: números ${start}-${end}`);
      } else {
        console.log(`[WebhookProcessor] Rifa ${p.rifaId} com 20 extras já vendidos, cancelando compra ${purchaseId}`);
        tx.update(purchaseRef, { pagamentoStatus: "cancelled", error: "Extras esgotados" });
        return;
      }
    } else {
      // Distribuir números normais (1 até meta)
      const disponivel = Math.max(0, meta - vendidos);
      quantidade = Math.min(quantidade, disponivel);
      
      console.log(`[WebhookProcessor] Rifa ${p.rifaId}: vendidos=${vendidos}, meta=${meta}, disponivel=${disponivel}, solicitado=${p.quantidade}, limitado=${quantidade}`);
      
      // Se não há mais disponível, cancelar compra
      if (quantidade <= 0) {
        console.log(`[WebhookProcessor] Rifa ${p.rifaId} esgotada, cancelando compra ${purchaseId}`);
        tx.update(purchaseRef, { pagamentoStatus: "cancelled", error: "Rifa esgotada" });
        return;
      }

      const start = vendidos + 1;
      const end = vendidos + quantidade;
      
      // Validação final: end nunca pode ser maior que meta
      if (end > meta) {
        console.error(`[WebhookProcessor] ERRO: end (${end}) > meta (${meta})! Abortando.`);
        tx.update(purchaseRef, { pagamentoStatus: "cancelled", error: "Limite excedido" });
        return;
      }
      
      numeros = Array.from({ length: quantidade }, (_, i) => start + i);
    }

    const updateData: any = { pagamentoStatus: "paid", numeros, quantidade };
    if (opts?.sessionId) updateData.stripeSessionId = opts.sessionId;
    tx.update(purchaseRef, updateData);

    // Increment sold count apenas se números normais
    if (numeros.length > 0 && numeros[0] <= meta) {
      const end = numeros[numeros.length - 1];
      tx.update(rifaRef, { vendidos: end });

      const now = new Date();
      if (end >= meta && !rifa?.locked) {
        // lock and set timerExpiresAt = now + 10min
        const timer = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
        tx.update(rifaRef, { locked: true, timerExpiresAt: timer, status: "contagem" });
        console.log(`[WebhookProcessor] Rifa ${p.rifaId} atingiu meta! Movida para contagem.`);
      }
    } else {
      // Extras não alteram vendidos
      console.log(`[WebhookProcessor] Extras adicionados, vendidos permanece ${vendidos}`);
    }
  });

  // audit
  try { const { writeAudit } = await import('@/lib/audit'); await writeAudit('purchase_processed', { purchaseId, sessionId: opts?.sessionId || null }); } catch(e) { console.warn('audit fail', e); }
}

export async function processCheckoutSessionCompleted(session: any) {
  const purchaseId = session.metadata?.purchaseId;
  if (!purchaseId) throw new Error("Missing purchaseId in session metadata");
  await processPurchaseById(purchaseId, { sessionId: session.id });
}
