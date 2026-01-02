import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firestoreAdmin";
import { calcularNumerosPorCompra } from "@/utils/rifa";
import { checkRateLimit, getKeyFromReq } from "@/lib/rateLimiter";
import { logInfo, logWarn } from "@/lib/logger";

// NOTE: Requires STRIPE_SECRET_KEY env var and `stripe` package installed
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rifaId, userId, items, email, phone, paymentMethod: clientPaymentMethod } = body;

    // Support both single-item and multi-item requests
    let itemsToProcess: any[] = [];

    if (rifaId && userId) {
      // Single item (legacy)
      itemsToProcess = [{ rifaId, quantidade: 1 }];
    } else if (items && userId) {
      // Multiple items
      itemsToProcess = items;
    } else {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!Array.isArray(itemsToProcess) || itemsToProcess.length === 0) {
      return NextResponse.json({ error: "Invalid items array" }, { status: 400 });
    }

    if (typeof userId !== 'string' || userId.length < 3) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
    }

    // rate limit per ip
    const rlKey = getKeyFromReq(req, `comprar`);
    const rl = await checkRateLimit(rlKey, 20, 60_000);
    if (rl?.limited) {
      logWarn('Rate limited comprar', rlKey);
      return NextResponse.json({ error: `Too many requests. Retry after ${rl.retryAfter}s` }, { status: 429 });
    }

    // Fetch all rifas and validate
    const purchases: any[] = [];
    let totalValue = 0;
    const lineItems: any[] = [];

    for (const item of itemsToProcess) {
      if (!item.rifaId || typeof item.rifaId !== 'string') {
        return NextResponse.json({ error: 'Invalid rifaId in items' }, { status: 400 });
      }

      const rifaRef = adminDb.collection("rifas").doc(item.rifaId);
      const rifaSnap = await rifaRef.get();
      
      if (!rifaSnap.exists) {
        return NextResponse.json({ error: `Rifa ${item.rifaId} not found` }, { status: 404 });
      }

      const rifa = rifaSnap.data();
      // Permitir compras se:
      // 1. Rifa não está locked, OU
      // 2. Rifa está locked MAS está em status "contagem" (período 2X para extras)
      if (rifa?.locked && rifa?.status !== "contagem") {
        return NextResponse.json({ error: `Rifa ${rifa.nome} is locked` }, { status: 423 });
      }

      const meta = rifa?.meta || 100;
      const vendidos = rifa?.vendidos || 0;
      const disponivel = Math.max(0, meta - vendidos);
      
      // Validar se ainda há números disponíveis
      // Durante período 2X (extras), permitir compras além da meta
      // O frontend controla o período 2X, então aqui apenas permitimos
      if (disponivel <= 0 && vendidos >= meta) {
        // Rifa está cheia, mas pode ter extras (números > meta)
        // Permitir compra - o webhookProcessor vai distribuir números extras
        console.log(`Compra de extras permitida para rifa ${item.rifaId} (vendidos: ${vendidos}, meta: ${meta})`);
      }
      
      const progresso = Math.round((vendidos / meta) * 100);
      let numerosPorCompra = item.quantidade || calcularNumerosPorCompra(progresso);
      
      // Não limitar a quantidade ao disponível para extras
      // Se disponível <= 0, permitir compra de extras (números > meta)
      if (disponivel > 0 && numerosPorCompra > disponivel) {
        numerosPorCompra = disponivel;
      }
      
      const valorUnitario = rifa?.valorPorNumero || rifa?.valor || 10;
      const valorTotal = valorUnitario * numerosPorCompra;

      // Create purchase doc
      const purchaseRef = adminDb.collection("compras").doc();
      const paymentMethod = clientPaymentMethod || (process.env.PAYMENT_PROVIDER || 'pix');

      const purchase = {
        id: purchaseRef.id,
        rifaId: item.rifaId,
        userId,
        quantidade: numerosPorCompra,
        numeros: [],
        valorPago: valorTotal,
        pagamentoStatus: "pending",
        paymentMethod,
        email: email || '',
        phone: phone || '',
        createdAt: new Date().toISOString(),
      };

      purchases.push({ ref: purchaseRef, purchase, rifa });
      totalValue += valorTotal;

      // For Stripe
      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: { name: `${rifa.nome} - ${numerosPorCompra} número(s)` },
          unit_amount: Math.round(valorUnitario * 100),
        },
        quantity: numerosPorCompra,
      });
    }

    // Save all purchases
    for (const { ref, purchase } of purchases) {
      await ref.set(purchase);
      try {
        const { writeAudit } = await import('@/lib/audit');
        await writeAudit('purchase_created', { purchaseId: ref.id, rifaId: purchase.rifaId, userId, value: purchase.valorPago });
      } catch(e) {
        console.warn('audit fail', e);
      }
    }

    // Payment handling
    const paymentProvider = process.env.PAYMENT_PROVIDER || 'pix';
    let sessionUrl = null;

    if (paymentProvider === 'stripe' && process.env.STRIPE_SECRET_KEY) {
      try {
        const StripeMod = await import("stripe");
        const Stripe = (StripeMod.default as any);
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
        
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          line_items: lineItems,
          customer_email: email,
          metadata: { 
            purchaseIds: purchases.map(p => p.purchase.id).join(','),
            userId
          },
          success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/historico`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/checkout`,
        });

        sessionUrl = session.url;
        // Save session id to all purchases
        for (const { ref } of purchases) {
          await ref.update({ stripeSessionId: session.id });
        }
        return NextResponse.json({ purchaseIds: purchases.map(p => p.purchase.id), sessionUrl });
      } catch (err: any) {
        console.warn("Stripe not configured or error creating session:", err?.message || err);
      }
    }

    // Default PIX flow: process all purchases immediately
    try {
      const { processPurchaseById } = await import('@/lib/webhookProcessor');
      for (const { ref } of purchases) {
        await processPurchaseById(ref.id);
      }
      
      // Após processar compras, verificar se alguma rifa atingiu a meta
      // Isso dispara a movimentação para "contagem" e criação de nova rifa
      try {
        const { checkGoalReachedRifas, isAutoRifaEnabled } = await import('@/lib/autoRifaEngine');
        const enabled = await isAutoRifaEnabled();
        if (enabled) {
          const result = await checkGoalReachedRifas();
          if (result.rifasMovidas > 0) {
            console.log(`[Comprar] ${result.rifasMovidas} rifas movidas para contagem, ${result.rifasCriadas} novas criadas`);
          }
        }
      } catch (e) {
        console.warn('[Comprar] Erro ao verificar metas:', e);
      }
    } catch (e) {
      console.error('payment processing failed', e);
    }

    return NextResponse.json({ 
      purchaseIds: purchases.map(p => p.purchase.id),
      sessionUrl,
      total: totalValue
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
