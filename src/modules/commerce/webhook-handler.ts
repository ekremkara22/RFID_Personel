import "server-only";

import { getCredential, SHOPIER_API_TOKEN_KEY, SHOPIER_PROVIDER, shopierWebhookKey } from "./credentials";
import { ingestOrder } from "./license-activation";
import { isOrderPayload, refundPayloadOrderId } from "./license-rules";
import { createShopierClient } from "./shopier-client";
import { verifyShopierSignature } from "./webhook-signature";

const ORDER_EVENTS = new Set(["order.created", "order.fulfilled", "order.addressUpdated"]);
const REFUND_EVENTS = new Set(["refund.requested", "refund.updated"]);
const EVENT_PATTERN = /^[a-z]+\.[a-zA-Z]+$/;
// Shopier waits 5 s for a 200; leave room for the database writes after the API call.
const REFUND_ORDER_FETCH_TIMEOUT_MS = 3_000;

type WebhookInput = { rawBody: Buffer; event: string | null; signature: string | null; webhookId: string | null };
type WebhookOutcome = { status: 200 | 400 | 401 | 500 };

function errorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code) : null;
}

/** Logs only the event name, delivery id and an error class: never the body, token or signature. */
function logFailure(stage: string, input: WebhookInput, error?: unknown) {
  console.error("[shopier-webhook]", {
    stage,
    event: input.event && EVENT_PATTERN.test(input.event) ? input.event : "unknown",
    webhookId: input.webhookId?.slice(0, 64) ?? null,
    error: error instanceof Error ? error.name : null,
    code: errorCode(error),
  });
}

/**
 * Verifies the signature with the subscription token stored for the event, then ingests the
 * order. Invalid signatures return 401 before any write. Processing failures return 500 so that
 * Shopier retries; ingestion is idempotent, so retries never double a license.
 */
export async function handleShopierWebhook(input: WebhookInput): Promise<WebhookOutcome> {
  const event = input.event?.trim() ?? "";
  if (!EVENT_PATTERN.test(event)) return { status: 401 };

  let token: string | null;
  try {
    const stored = await getCredential(SHOPIER_PROVIDER, shopierWebhookKey(event));
    const parsed = stored ? (JSON.parse(stored) as { token?: unknown }) : null;
    token = typeof parsed?.token === "string" ? parsed.token : null;
  } catch (error) {
    logFailure("token", input, error);
    return { status: 500 };
  }
  if (!verifyShopierSignature(input.rawBody, input.signature, token)) {
    logFailure("signature", input);
    return { status: 401 };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder("utf-8").decode(input.rawBody));
  } catch {
    logFailure("parse", input);
    return { status: 400 };
  }

  try {
    if (ORDER_EVENTS.has(event)) {
      if (!isOrderPayload(payload)) {
        logFailure("order-shape", input);
        return { status: 400 };
      }
      await ingestOrder(payload, "WEBHOOK");
      return { status: 200 };
    }
    if (REFUND_EVENTS.has(event)) {
      // Refund payloads (Refund model) only reference the order, so the current order is fetched.
      const order = isOrderPayload(payload) ? payload : null;
      if (order) {
        await ingestOrder(order, "WEBHOOK");
        return { status: 200 };
      }
      const orderId = refundPayloadOrderId(payload);
      if (!orderId) {
        logFailure("refund-shape", input);
        return { status: 400 };
      }
      // Without a usable API token the order cannot be fetched; retrying would never succeed,
      // so acknowledge and leave it to the next manual sync.
      const apiToken = await getCredential(SHOPIER_PROVIDER, SHOPIER_API_TOKEN_KEY).catch(() => null);
      if (!apiToken) {
        console.error("[shopier-webhook]", { event, reason: "api token missing" });
        return { status: 200 };
      }
      const client = createShopierClient(apiToken);
      await ingestOrder(await client.getOrder(orderId, REFUND_ORDER_FETCH_TIMEOUT_MS), "WEBHOOK");
      return { status: 200 };
    }
    // Verified but irrelevant event (e.g. product.updated): acknowledge so Shopier stops retrying.
    return { status: 200 };
  } catch (error) {
    logFailure("ingest", input, error);
    return { status: 500 };
  }
}
