import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  try {
    const body = await req.json();
    const { purchaseId, sessionId } = body;
    if (!purchaseId) return NextResponse.json({ error: 'Missing purchaseId' }, { status: 400 });

    // Create a fake event (same structure as stripe.checkout.session)
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: sessionId || `sess_${Date.now()}`,
          metadata: { purchaseId: String(purchaseId) }
        }
      }
    };

    // Call the internal processor directly (dev-mode)
    const { processPurchaseById } = await import('@/lib/webhookProcessor');
    await processPurchaseById(String(purchaseId));

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
