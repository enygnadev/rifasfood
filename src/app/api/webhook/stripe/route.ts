import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firestoreAdmin";
import { logInfo, logWarn, logError } from "@/lib/logger";

export async function POST(req: Request) {
  // Read raw body
  const buf = await req.arrayBuffer();
  const body = Buffer.from(buf);
  const sig = req.headers.get("stripe-signature") || "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

  try {
      const StripeMod = await import("stripe");
      const Stripe = (StripeMod.default as any);
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
      let event: any;
    if (!webhookSecret) {
      // DEV MODE: parse raw body as JSON event if no webhook secret is set (local testing)
      try {
        event = JSON.parse(new TextDecoder().decode(body));
      } catch (e) {
        throw new Error('Invalid JSON body for webhook and no webhook secret configured');
      }
    } else {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data?.object || event.data_object || event; // support dev-parsed events
      if (session) {
        logInfo('Processing checkout.session.completed for', session.id || session.metadata?.purchaseId);
        const { processCheckoutSessionCompleted } = await import("@/lib/webhookProcessor");
        try {
          await processCheckoutSessionCompleted(session);
          
          // Após processar pagamento, verificar se alguma rifa atingiu a meta
          try {
            const { checkGoalReachedRifas, isAutoRifaEnabled } = await import('@/lib/autoRifaEngine');
            const enabled = await isAutoRifaEnabled();
            if (enabled) {
              const result = await checkGoalReachedRifas();
              if (result.rifasMovidas > 0) {
                console.log(`[Webhook] ${result.rifasMovidas} rifas movidas para contagem, ${result.rifasCriadas} novas criadas`);
              }
            }
          } catch (e) {
            console.warn('[Webhook] Erro ao verificar metas:', e);
          }
        } catch (e: any) {
          logError('Processor error', e?.message || e);
          throw e;
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
