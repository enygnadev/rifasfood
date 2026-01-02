import { NextResponse } from "next/server";
import { runAutoRifaCycle } from "@/lib/autoRifaEngine";

export async function GET() {
  try {
    const result = await runAutoRifaCycle();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[AutoRifa Cron] Error:", error);
    return NextResponse.json({ success: false, error: "Failed to run auto-rifa cycle" }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
