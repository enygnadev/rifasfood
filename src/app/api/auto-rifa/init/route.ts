import { NextResponse } from "next/server";
import { ensureAllProductsHaveActiveRifas, isAutoRifaEnabled } from "@/lib/autoRifaEngine";

export async function POST() {
  try {
    const enabled = await isAutoRifaEnabled();
    
    if (!enabled) {
      return NextResponse.json({ success: false, message: "Auto-rifa is not enabled" });
    }

    await ensureAllProductsHaveActiveRifas();

    return NextResponse.json({ success: true, message: "Auto-rifa initialized successfully" });
  } catch (error) {
    console.error("[AutoRifa Init] Error:", error);
    return NextResponse.json({ success: false, error: "Failed to initialize auto-rifa" }, { status: 500 });
  }
}
