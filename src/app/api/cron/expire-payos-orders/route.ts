import { NextResponse } from "next/server";

import { expireUnpaidPayosOrders } from "@/lib/server/payos-payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cancels PayOS orders whose payment link expired without payment and restores
 * their stock. Triggered by Vercel Cron (see vercel.json). Protected by
 * CRON_SECRET; Vercel Cron sends it as `Authorization: Bearer <secret>`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const canceled = await expireUnpaidPayosOrders();
    return NextResponse.json({ canceled: canceled.length, orderCodes: canceled });
  } catch (error) {
    console.error("[cron/expire-payos-orders] failed", error);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
