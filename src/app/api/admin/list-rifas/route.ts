import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firestoreAdmin";
import { checkRateLimit, getKeyFromReq } from "@/lib/rateLimiter";
import { logWarn } from "@/lib/logger";

export async function GET(req: Request) {
  const adminSecret = req.headers.get("x-admin-secret");
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    return NextResponse.json({ error: 'Admin SDK not configured' }, { status: 503 });
  }

  // rate limit
  const rlKey = getKeyFromReq(req, 'list-rifas');
  const rl = await checkRateLimit(rlKey, 60, 60_000);
  if (rl.limited) {
    logWarn('Rate limited list-rifas', rlKey);
    return NextResponse.json({ error: `Too many requests. Retry after ${rl.retryAfter}s` }, { status: 429 });
  }

  const snap = await adminDb.collection('rifas').orderBy('createdAt', 'desc').limit(200).get();
  const rifas = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ rifas });
}
