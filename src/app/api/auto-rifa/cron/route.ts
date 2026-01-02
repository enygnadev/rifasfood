import { NextResponse } from "next/server";
import { runAutoRifaCycle } from "@/lib/autoRifaEngine";

export async function GET() {
  console.log("[AutoRifa Cron] Starting cycle...");
  try {
    const result = await runAutoRifaCycle();
    console.log("[AutoRifa Cron] Cycle result:", result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[AutoRifa Cron] Error:", error);
    return NextResponse.json({ success: false, error: "Failed to run auto-rifa cycle" }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
