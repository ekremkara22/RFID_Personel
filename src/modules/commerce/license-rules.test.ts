import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateLineItems,
  computeEntitlementExpiry,
  computeRefundStatus,
  formatShopierDate,
  isFullyRefunded,
  isOrderPayload,
  isStaleRefundUpdate,
  mergeRefundStatus,
  normalizeEmail,
  normalizeMoney,
  normalizeShopierOrder,
  parseDurationDays,
  refundPayloadOrderId,
} from "./license-rules";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-14T09:00:00.000Z");

test("timed purchase without an entitlement starts from now", () => {
  const result = computeEntitlementExpiry({ durationDays: 30, quantity: 1, current: null, now });
  assert.equal(result?.getTime(), now.getTime() + 30 * DAY);
});

test("timed purchase extends an active entitlement from its expiry", () => {
  const expiresAt = new Date(now.getTime() + 10 * DAY);
  const result = computeEntitlementExpiry({ durationDays: 30, quantity: 1, current: { expiresAt }, now });
  assert.equal(result?.getTime(), expiresAt.getTime() + 30 * DAY);
});

test("timed purchase on an expired entitlement starts from now", () => {
  const expiresAt = new Date(now.getTime() - 5 * DAY);
  const result = computeEntitlementExpiry({ durationDays: 30, quantity: 1, current: { expiresAt }, now });
  assert.equal(result?.getTime(), now.getTime() + 30 * DAY);
});

test("quantity multiplies the duration", () => {
  const result = computeEntitlementExpiry({ durationDays: 30, quantity: 3, current: null, now });
  assert.equal(result?.getTime(), now.getTime() + 90 * DAY);
});

test("perpetual product grants a perpetual license", () => {
  assert.equal(computeEntitlementExpiry({ durationDays: null, quantity: 1, current: { expiresAt: new Date(now.getTime() + DAY) }, now }), null);
  assert.equal(computeEntitlementExpiry({ durationDays: null, quantity: 1, current: null, now }), null);
});

test("timed purchase never shortens an existing perpetual license", () => {
  assert.equal(computeEntitlementExpiry({ durationDays: 30, quantity: 1, current: { expiresAt: null }, now }), null);
});

test("invalid durations are rejected", () => {
  assert.throws(() => computeEntitlementExpiry({ durationDays: 0, quantity: 1, current: null, now }));
  assert.throws(() => computeEntitlementExpiry({ durationDays: 1.5, quantity: 1, current: null, now }));
});

test("email normalization trims, lower-cases and rejects invalid values", () => {
  assert.equal(normalizeEmail("  Ali.Veli@Example.COM "), "ali.veli@example.com");
  assert.equal(normalizeEmail(""), null);
  assert.equal(normalizeEmail("not-an-email"), null);
  assert.equal(normalizeEmail(null), null);
  assert.equal(normalizeEmail(42), null);
});

test("buyer email prefers shipping info and falls back to billing info", () => {
  const base = { id: "1001", paymentStatus: "paid", lineItems: [] };
  assert.equal(normalizeShopierOrder({ ...base, shippingInfo: { email: "Ship@X.com" }, billingInfo: { email: "bill@x.com" } }, now).buyerEmail, "ship@x.com");
  assert.equal(normalizeShopierOrder({ ...base, shippingInfo: { email: "" }, billingInfo: { email: " Bill@X.com" } }, now).buyerEmail, "bill@x.com");
  assert.equal(normalizeShopierOrder({ ...base, shippingInfo: null, billingInfo: null }, now).buyerEmail, null);
});

test("order normalization maps Shopier fields", () => {
  const order = normalizeShopierOrder({
    id: 555,
    status: "Unfulfilled",
    paymentStatus: "PAID",
    dateCreated: "2026-10-01T10:00:00Z",
    currency: "try",
    totals: { total: "1499.9" },
    shippingInfo: { firstName: "Ayşe", lastName: "Kaya", email: "ayse@example.com", phone: "+90 555 000 00 00" },
    lineItems: [
      { productId: "P1", title: "Lisans", type: "digital", quantity: 1 },
      { productId: "P1", title: "Lisans", type: "digital", quantity: "2" },
      { productId: null, title: "Geçersiz" },
    ],
    refunds: [],
  }, now);
  assert.equal(order.shopierOrderId, "555");
  assert.equal(order.status, "unfulfilled");
  assert.equal(order.paymentStatus, "paid");
  assert.equal(order.currency, "TRY");
  assert.equal(order.total, "1499.90");
  assert.equal(order.buyerName, "Ayşe Kaya");
  assert.equal(order.orderedAt.toISOString(), "2026-10-01T10:00:00.000Z");
  assert.deepEqual(order.lineItems, [{ productId: "P1", title: "Lisans", type: "digital", quantity: 3 }]);
  assert.equal(order.refundStatus, null);
});

test("non-order payloads are rejected and refund payloads expose orderId", () => {
  assert.throws(() => normalizeShopierOrder({ foo: 1 }));
  assert.equal(isOrderPayload({ id: "r1", orderId: "1001", type: "full", status: "succeeded" }), false);
  assert.equal(refundPayloadOrderId({ id: "r1", orderId: "1001", type: "full", status: "succeeded" }), "1001");
  assert.equal(refundPayloadOrderId(null), null);
});

test("refund status: only a succeeded full refund counts as fully refunded", () => {
  assert.equal(computeRefundStatus([{ type: "full", status: "succeeded" }]), "full");
  assert.equal(computeRefundStatus([{ type: "partial", status: "succeeded" }, { type: "full", status: "succeeded" }]), "full");
  assert.equal(computeRefundStatus([{ type: "partial", status: "succeeded" }]), "partial");
  assert.equal(computeRefundStatus([{ type: "full", status: "pending" }]), "pending");
  assert.equal(computeRefundStatus([{ type: "full", status: "failed" }]), "failed");
  assert.equal(computeRefundStatus([]), null);
  assert.equal(computeRefundStatus(undefined), null);
  assert.equal(isFullyRefunded("full"), true);
  assert.equal(isFullyRefunded("partial"), false);
  assert.equal(isFullyRefunded("pending"), false);
  assert.equal(isFullyRefunded(null), false);
});

test("duration form parsing", () => {
  assert.equal(parseDurationDays(""), null);
  assert.equal(parseDurationDays(" 365 "), 365);
  assert.equal(parseDurationDays("0"), undefined);
  assert.equal(parseDurationDays("3651"), undefined);
  assert.equal(parseDurationDays("1.5"), undefined);
  assert.equal(parseDurationDays("abc"), undefined);
});

test("money and date helpers", () => {
  assert.equal(normalizeMoney("12"), "12.00");
  assert.equal(normalizeMoney("abc"), "0");
  assert.equal(formatShopierDate(new Date("2026-10-14T09:05:07.123Z")), "2026-10-14T09:05:07Z");
  assert.deepEqual(aggregateLineItems([]), []);
});

test("out-of-order deliveries never roll back a completed refund", () => {
  assert.equal(mergeRefundStatus("full", null), "full");
  assert.equal(mergeRefundStatus("full", "pending"), "full");
  assert.equal(mergeRefundStatus("partial", null), "partial");
  assert.equal(mergeRefundStatus("partial", "full"), "full");
  assert.equal(mergeRefundStatus(null, "full"), "full");
  assert.equal(mergeRefundStatus("pending", "failed"), "failed");
  assert.equal(mergeRefundStatus(null, null), null);
  assert.equal(isStaleRefundUpdate("full", null), true);
  assert.equal(isStaleRefundUpdate("full", "full"), false);
  assert.equal(isStaleRefundUpdate("partial", "pending"), true);
  assert.equal(isStaleRefundUpdate(null, "partial"), false);
});
