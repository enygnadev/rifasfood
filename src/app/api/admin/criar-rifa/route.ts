import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firestoreAdmin";
import { checkRateLimit, getKeyFromReq } from "@/lib/rateLimiter";
import { logInfo, logWarn } from "@/lib/logger";

export async function POST(req: Request) {
  const adminSecret = req.headers.get("x-admin-secret");
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    return NextResponse.json({ error: 'Admin SDK not configured' }, { status: 503 });
  }

  // rate limit by IP
  const key = getKeyFromReq(req, 'create-rifa');
  const rl = await checkRateLimit(key, 20, 60_000);
  if (rl.limited) {
    logWarn('Rate limited', key);
    return NextResponse.json({ error: `Too many requests. Retry after ${rl.retryAfter}s` }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { nome, meta, valor } = body;
    if (!nome || !meta || !valor) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    // basic validation
    if (typeof nome !== 'string' || nome.length < 3 || nome.length > 200) return NextResponse.json({ error: 'Invalid nome' }, { status: 400 });
    const metaNum = Number(meta);
    const valorNum = Number(valor);
    if (!Number.isFinite(metaNum) || metaNum <= 0 || metaNum > 100000) return NextResponse.json({ error: 'Invalid meta' }, { status: 400 });
    if (!Number.isFinite(valorNum) || valorNum <= 0 || valorNum > 10000) return NextResponse.json({ error: 'Invalid valor' }, { status: 400 });

    const now = new Date().toISOString();
    const docRef = await adminDb.collection("rifas").add({
      nome,
      meta: metaNum,
      valorPorNumero: valorNum,
      vendidos: 0,
      locked: false,
      status: "ativa",
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ id: docRef.id });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
