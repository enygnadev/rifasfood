import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firestoreAdmin";
import { calcularNumerosPorCompra } from "@/utils/rifa";
import { checkRateLimit, getKeyFromReq } from "@/lib/rateLimiter";
import { logInfo, logWarn } from "@/lib/logger";

// NOTE: Requires STRIPE_SECRET_KEY env var and `stripe` package installed
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rifaId, userId } = body;
    if (!rifaId || !userId) return NextResponse.json({ error: "Missing rifaId or userId" }, { status: 400 });

    // basic validation
    if (typeof rifaId !== 'string' || rifaId.length < 3) return NextResponse.json({ error: 'Invalid rifaId' }, { status: 400 });
    if (typeof userId !== 'string' || userId.length < 3) return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });

    // rate limit per ip+rifa
    const rlKey = getKeyFromReq(req, `comprar-${rifaId}`);
    const rl = await checkRateLimit(rlKey, 10, 60_000);
    if (rl?.limited) {
      logWarn('Rate limited comprar', rlKey);
      return NextResponse.json({ error: `Too many requests. Retry after ${rl.retryAfter}s` }, { status: 429 });
    }

    const rifaRef = adminDb.collection("rifas").doc(rifaId);
    const rifaSnap = await rifaRef.get();
    if (!rifaSnap.exists) return NextResponse.json({ error: "Rifa not found" }, { status: 404 });

    const rifa = rifaSnap.data();
    const meta = rifa?.meta || 100;
    const vendidos = rifa?.vendidos || 0;
    const progresso = Math.round((vendidos / meta) * 100);
    const numerosPorCompra = calcularNumerosPorCompra(progresso);

    if (rifa?.locked) return NextResponse.json({ error: "Rifa is locked" }, { status: 423 });

    // Create purchase doc (status pending)
    const purchaseRef = adminDb.collection("compras").doc();
    const paymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod : (process.env.PAYMENT_PROVIDER || 'simulated');

    const purchase = {
      id: purchaseRef.id,
      rifaId,
      userId,
      quantidade: numerosPorCompra,
      numeros: [],
      valorPago: (rifa?.valorPorNumero || rifa?.valor || 10) * numerosPorCompra,
      pagamentoStatus: "pending",
      paymentMethod,
      createdAt: new Date().toISOString(),
    };

    await purchaseRef.set(purchase);
    // audit log
    try { const { writeAudit } = await import('@/lib/audit'); await writeAudit('purchase_created', { purchaseId: purchaseRef.id, rifaId, userId, value: purchase.valorPago }); } catch(e) { console.warn('audit fail', e); }

    // Payment handling: if STRIPE is configured and you want to use it, set PAYMENT_PROVIDER=stripe
    // Default: simulate payment and process purchase immediately (no external gateway)
    const paymentProvider = process.env.PAYMENT_PROVIDER || 'simulated';
    let sessionUrl = null;

    if (paymentProvider === 'stripe' && process.env.STRIPE_SECRET_KEY) {
      try {
        const StripeMod = await import("stripe");
        const Stripe = (StripeMod.default as any);
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "brl",
                product_data: { name: `${rifa?.nome} - ${numerosPorCompra} número(s)` },
                unit_amount: Math.round(((rifa?.valorPorNumero || rifa?.valor || 10) * 100)),
              },
              quantity: numerosPorCompra,
            },
          ],
          metadata: { purchaseId: purchaseRef.id, rifaId },
          success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/sorteio?rifa=${rifaId}`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/rifa?rifa=${rifaId}`,
        });

        sessionUrl = session.url;
        // Save session id to purchase for webhook matching
        await purchaseRef.update({ stripeSessionId: session.id });
        return NextResponse.json({ purchaseId: purchaseRef.id, sessionUrl });
      } catch (err: any) {
        console.warn("Stripe not configured or error creating session:", err?.message || err);
      }
    }

    // Default simulated flow: mark purchase as paid and process assignment immediately
    try {
      const { processPurchaseById } = await import('@/lib/webhookProcessor');
      await processPurchaseById(purchaseRef.id);
    } catch (e) {
      console.error('simulated payment processing failed', e);
    }

    return NextResponse.json({ purchaseId: purchaseRef.id, sessionUrl });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
