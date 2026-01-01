import { NextResponse } from "next/server";
import { runSorteioForRifa } from "@/lib/sorteio";

export async function POST(req: Request) {
  const adminSecret = req.headers.get("x-admin-secret");
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    return NextResponse.json({ error: 'Admin SDK not configured' }, { status: 503 });
  }

  // rate limit
  const { checkRateLimit, getKeyFromReq } = await import("@/lib/rateLimiter");
  const rlKey = getKeyFromReq(req, 'force-run');
  const rl = await checkRateLimit(rlKey, 20, 60_000);
  if (rl.limited) return NextResponse.json({ error: `Too many requests. Retry after ${rl.retryAfter}s` }, { status: 429 });

  try {
    const body = await req.json();
    const { rifaId } = body;
    if (!rifaId) return NextResponse.json({ error: 'Missing rifaId' }, { status: 400 });
    if (typeof rifaId !== 'string' || rifaId.length < 3) return NextResponse.json({ error: 'Invalid rifaId' }, { status: 400 });

    const res = await runSorteioForRifa(rifaId);
    return NextResponse.json({ result: res });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
