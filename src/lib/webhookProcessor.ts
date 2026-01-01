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
    const quantidade = p.quantidade || 1;

    const start = vendidos + 1;
    const end = vendidos + quantidade;
    const numeros = Array.from({ length: quantidade }, (_, i) => start + i);

    const updateData: any = { pagamentoStatus: "paid", numeros };
    if (opts?.sessionId) updateData.stripeSessionId = opts.sessionId;
    tx.update(purchaseRef, updateData);

    // Increment sold count
    tx.update(rifaRef, { vendidos: end });

    const meta = rifa?.meta || 100;
    const now = new Date();
    if (end >= meta && !rifa?.locked) {
      // lock and set timerExpiresAt = now + 10min
      const timer = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
      tx.update(rifaRef, { locked: true, timerExpiresAt: timer, status: "contagem" });
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
