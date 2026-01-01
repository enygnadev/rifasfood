import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firestoreAdmin";

export async function GET(req: Request) {
  const adminSecret = req.headers.get("x-admin-secret");
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snap = await adminDb.collection('logs_audit').orderBy('timestamp','desc').limit(200).get();
  const logs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ logs });
}
