import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firestoreAdmin";
import { runSorteioForRifa } from "@/lib/sorteio";
import { checkRateLimit, getKeyFromReq } from "@/lib/rateLimiter";
import { logWarn } from "@/lib/logger";

export async function POST(req: Request) {
  const adminSecret = req.headers.get("x-admin-secret");
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    return NextResponse.json({ error: 'Admin SDK not configured' }, { status: 503 });
  }

  try {
    // rate limit
    const rlKey = getKeyFromReq(req, 'run-sorteio');
    const rl = await checkRateLimit(rlKey, 10, 60_000);
    if (rl.limited) {
      logWarn('Rate limited run-sorteio', rlKey);
      return NextResponse.json({ error: `Too many requests. Retry after ${rl.retryAfter}s` }, { status: 429 });
    }

    // run for all eligible rifas (those in contagem and with timerExpiresAt <= now)
    const now = new Date().toISOString();
    const rifasQuery = await adminDb.collection("rifas").where("status", "==", "contagem").where("timerExpiresAt", "<=", now).get();
    const results: any[] = [];

    for (const doc of rifasQuery.docs) {
      const rId = doc.id;
      const res = await runSorteioForRifa(rId);
      results.push(res);
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
