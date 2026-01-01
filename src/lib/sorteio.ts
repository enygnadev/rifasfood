import { adminDb } from "@/lib/firestoreAdmin";
import { chooseWinningNumber } from "@/lib/rnd";

export async function runSorteioForRifa(rifaId: string) {
  const rRef = adminDb.collection('rifas').doc(rifaId);
  const rSnap = await rRef.get();
  if (!rSnap.exists) throw new Error('Rifa not found');
  const r = rSnap.data() as any;

  const purchasesSnap = await adminDb.collection('compras').where('rifaId', '==', rifaId).where('pagamentoStatus', '==', 'paid').get();
  const ownerMap = new Map<number, any>();
  let totalNumbers = 0;
  purchasesSnap.forEach((p: any) => {
    const pData: any = p.data();
    (pData.numeros || []).forEach((n: number) => ownerMap.set(n, { userId: pData.userId, purchaseId: pData.id }));
    totalNumbers = Math.max(totalNumbers, ...(pData.numeros || []));
  });

  if (totalNumbers === 0) {
    await rRef.update({ status: 'encerrada', updatedAt: new Date().toISOString() });
    return { rifa: rifaId, winner: null, reason: 'no participants' };
  }

  const seed = `${rifaId}-${r.timerExpiresAt || ''}-${new Date().toISOString()}`;
  const winningNumber = chooseWinningNumber(seed, totalNumbers);
  const winner = ownerMap.get(winningNumber) || null;

  await rRef.update({ status: 'encerrada', vencedor: { winner, winningNumber, seed, drawnAt: new Date().toISOString() }, updatedAt: new Date().toISOString() });
  await adminDb.collection('historico').add({ rifaId, winner, winningNumber, seed, timestamp: new Date().toISOString() });

  // audit
  try { const { writeAudit } = await import('@/lib/audit'); await writeAudit('sorteio_run', { rifaId, winningNumber, winner }); } catch(e) { console.warn('audit fail', e); }

  // Calculate collected and estimated profit
  let totalCollected = 0;
  purchasesSnap.forEach((p: any) => {
    const pData: any = p.data();
    totalCollected += pData.valorPago || 0;
  });
  const prizeCost = r.prizeCost || 0;
  const estimatedProfit = totalCollected - prizeCost; // fees not calculated here

  return { rifa: rifaId, winner, winningNumber, totalCollected, prizeCost, estimatedProfit };
}
