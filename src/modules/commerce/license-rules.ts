/**
 * Pure Shopier -> license rules. No Prisma, no network: everything here is unit tested
 * (license-rules.test.ts) so idempotency and duration behaviour stay fixed.
 */
import type { ShopierApiOrder, ShopierLineItem, ShopierPersonInfo, ShopierRefund } from "./shopier-types";

const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_LICENSE_DURATION_DAYS = 3650;

export type NormalizedLineItem = {
  productId: string;
  title: string;
  type: string | null;
  quantity: number;
};

export type NormalizedShopierOrder = {
  shopierOrderId: string;
  status: string;
  paymentStatus: string;
  currency: string;
  total: string;
  buyerEmail: string | null;
  buyerName: string | null;
  buyerPhone: string | null;
  orderedAt: Date;
  refundStatus: RefundStatus | null;
  lineItems: NormalizedLineItem[];
};

export type RefundStatus = "full" | "partial" | "pending" | "failed";

function text(value: unknown, max: number): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value).slice(0, max);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Lower-case and trim; anything that is not a plausible address becomes null. */
export function normalizeEmail(value: unknown): string | null {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!email || email.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

/** Shopier ids are strings in the API but numbers are accepted defensively. */
export function normalizeShopierId(value: unknown): string | null {
  const id = text(value, 64);
  return id ? id : null;
}

/** Decimal string safe for Prisma Decimal(12,2); unparsable totals become "0". */
export function normalizeMoney(value: unknown): string {
  const raw = text(value, 32).replace(/\s/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return "0";
  const amount = Number(raw);
  return Number.isFinite(amount) ? amount.toFixed(2) : "0";
}

function normalizeQuantity(value: unknown): number {
  const quantity = typeof value === "string" ? Number(value) : value;
  return typeof quantity === "number" && Number.isSafeInteger(quantity) && quantity > 0 ? Math.min(quantity, 1000) : 1;
}

function parseShopierDate(value: unknown, fallback: Date): Date {
  const raw = text(value, 40);
  if (!raw) return fallback;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

/** Order-like payloads carry an id plus order-only fields; Refund payloads carry orderId instead. */
export function isOrderPayload(value: unknown): value is ShopierApiOrder {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return normalizeShopierId(record.id) !== null && ("paymentStatus" in record || Array.isArray(record.lineItems));
}

/** Refund webhook payloads reference the order with `orderId` (Refund model). */
export function refundPayloadOrderId(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return normalizeShopierId((value as ShopierRefund).orderId);
}

/**
 * Most decisive refund state wins: a succeeded full refund outranks partial, pending and failed ones.
 */
export function computeRefundStatus(refunds: readonly ShopierRefund[] | null | undefined): RefundStatus | null {
  if (!Array.isArray(refunds) || refunds.length === 0) return null;
  const items = refunds.map((refund) => ({
    type: text(refund?.type, 16).toLowerCase(),
    status: text(refund?.status, 16).toLowerCase(),
  }));
  if (items.some((item) => item.type === "full" && item.status === "succeeded")) return "full";
  if (items.some((item) => item.status === "succeeded")) return "partial";
  if (items.some((item) => item.status === "pending")) return "pending";
  if (items.some((item) => item.status === "failed")) return "failed";
  return null;
}

/** Only a completed full refund flags the order's licenses as REFUNDED. */
export function isFullyRefunded(refundStatus: RefundStatus | null): boolean {
  return refundStatus === "full";
}

/**
 * Webhooks can arrive out of order. A completed refund cannot be undone, so a stale body
 * (e.g. an older order.created without refunds) never moves the stored state backwards:
 * "full" is sticky; "partial" survives an incoming null/pending/failed.
 */
export function mergeRefundStatus(stored: RefundStatus | string | null | undefined, incoming: RefundStatus | null): RefundStatus | null {
  if (stored === "full") return "full";
  if (stored === "partial" && incoming !== "full") return "partial";
  return incoming;
}

/** True when the incoming body is older than what is stored (would roll back a succeeded refund). */
export function isStaleRefundUpdate(stored: RefundStatus | string | null | undefined, incoming: RefundStatus | null): boolean {
  return mergeRefundStatus(stored, incoming) !== incoming;
}

function normalizeLineItems(items: readonly ShopierLineItem[] | null | undefined): NormalizedLineItem[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    const productId = normalizeShopierId(item?.productId);
    if (!productId) return [];
    return [{ productId, title: text(item.title, 200), type: text(item.type, 16).toLowerCase() || null, quantity: normalizeQuantity(item.quantity) }];
  });
}

/** Same product on several lines (e.g. variations) counts as one license with summed quantity. */
export function aggregateLineItems(items: readonly NormalizedLineItem[]): NormalizedLineItem[] {
  const byProduct = new Map<string, NormalizedLineItem>();
  for (const item of items) {
    const existing = byProduct.get(item.productId);
    if (existing) existing.quantity = Math.min(existing.quantity + item.quantity, 1000);
    else byProduct.set(item.productId, { ...item });
  }
  return [...byProduct.values()];
}

export function normalizeShopierOrder(raw: unknown, now = new Date()): NormalizedShopierOrder {
  if (!isOrderPayload(raw)) throw new Error("Shopier sipariş verisi beklenen biçimde değil.");
  const shipping: ShopierPersonInfo = raw.shippingInfo ?? {};
  const billing: ShopierPersonInfo = raw.billingInfo ?? {};
  const buyerName = [text(shipping.firstName ?? billing.firstName, 100), text(shipping.lastName ?? billing.lastName, 100)].filter(Boolean).join(" ");
  const currency = text(raw.currency, 3).toUpperCase();
  return {
    shopierOrderId: normalizeShopierId(raw.id)!,
    status: text(raw.status, 16).toLowerCase() || "unknown",
    paymentStatus: text(raw.paymentStatus, 16).toLowerCase() || "unknown",
    currency: /^[A-Z]{3}$/.test(currency) ? currency : "TRY",
    total: normalizeMoney(raw.totals?.total),
    buyerEmail: normalizeEmail(shipping.email) ?? normalizeEmail(billing.email),
    buyerName: buyerName || null,
    buyerPhone: text(shipping.phone ?? billing.phone, 32) || null,
    orderedAt: parseShopierDate(raw.dateCreated, now),
    refundStatus: computeRefundStatus(raw.refunds),
    lineItems: aggregateLineItems(normalizeLineItems(raw.lineItems)),
  };
}

export function isPaidOrder(order: Pick<NormalizedShopierOrder, "paymentStatus">): boolean {
  return order.paymentStatus === "paid";
}

/**
 * New entitlement expiry after a purchase.
 * - durationDays null: perpetual license (null).
 * - existing perpetual entitlement stays perpetual (a timed purchase never shortens it).
 * - existing still-active expiry: extend from that expiry; otherwise extend from now.
 * Extension is durationDays * quantity days.
 */
export function computeEntitlementExpiry(input: {
  durationDays: number | null;
  quantity: number;
  current: { expiresAt: Date | null } | null;
  now?: Date;
}): Date | null {
  const now = input.now ?? new Date();
  if (input.durationDays === null) return null;
  if (input.current && input.current.expiresAt === null) return null;
  if (!Number.isSafeInteger(input.durationDays) || input.durationDays <= 0) throw new Error("Lisans süresi pozitif tam sayı olmalıdır.");
  const quantity = Number.isSafeInteger(input.quantity) && input.quantity > 0 ? input.quantity : 1;
  const currentExpiry = input.current?.expiresAt ?? null;
  const base = currentExpiry && currentExpiry.getTime() > now.getTime() ? currentExpiry : now;
  return new Date(base.getTime() + input.durationDays * quantity * DAY_MS);
}

/** Form value -> durationDays. Empty means perpetual; undefined means invalid input. */
export function parseDurationDays(value: string): number | null | undefined {
  const raw = value.trim();
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return undefined;
  const days = Number(raw);
  return days >= 1 && days <= MAX_LICENSE_DURATION_DAYS ? days : undefined;
}

/** Shopier list endpoints expect `yyyy-MM-ddTHH:mm:ssZ` (UTC, no milliseconds). */
export function formatShopierDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}
