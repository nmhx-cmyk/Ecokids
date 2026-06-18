import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getPayos, isPayosConfigured } from "@/lib/payos";
import { markPayosOrderPaid } from "@/lib/server/payos-payment";

// Webhook signature verification relies on Node crypto, not the Edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isPayosConfigured) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  let data;
  try {
    // Throws InvalidSignatureError if the HMAC doesn't match our checksum key.
    data = await getPayos().webhooks.verify(
      body as Parameters<ReturnType<typeof getPayos>["webhooks"]["verify"]>[0],
    );
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  // PayOS sends a confirmation ping (often orderCode 123) when registering the
  // webhook. Acknowledge anything that isn't a successful, known payment.
  if (data.code !== "00") {
    return NextResponse.json({ success: true });
  }

  try {
    const orderCode = await markPayosOrderPaid(
      BigInt(data.orderCode),
      data.amount,
      data.reference ?? null,
    );
    if (orderCode) {
      revalidatePath(`/account/orders/${orderCode}`);
      revalidatePath(`/order-confirmation/${orderCode}`);
      revalidatePath("/admin/orders");
    }
  } catch (error) {
    console.error("[payos/webhook] processing failed", error);
    // Still 200 so PayOS doesn't hammer retries; reconciliation cron catches it.
  }

  return NextResponse.json({ success: true });
}
