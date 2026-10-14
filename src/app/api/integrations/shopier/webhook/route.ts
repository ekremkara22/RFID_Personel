import { NextResponse } from "next/server";

import { handleShopierWebhook } from "@/modules/commerce/webhook-handler";

// Unauthenticated endpoint: trust comes only from the Shopier-Signature HMAC (see MODULE.md).
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // The signature covers the exact bytes Shopier sent, so verify before any text decoding.
  const rawBody = Buffer.from(await request.arrayBuffer());
  const result = await handleShopierWebhook({
    rawBody,
    event: request.headers.get("shopier-event"),
    signature: request.headers.get("shopier-signature"),
    webhookId: request.headers.get("shopier-webhook-id"),
  });
  return NextResponse.json({ ok: result.status === 200 }, { status: result.status });
}
