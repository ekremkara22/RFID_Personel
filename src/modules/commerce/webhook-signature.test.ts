import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { verifyShopierSignature } from "./webhook-signature";

// Dummy value for tests only; real webhook tokens live encrypted in IntegrationCredential.
const TOKEN = "unit-test-webhook-token";
const BODY = JSON.stringify({ id: "1001", paymentStatus: "paid", lineItems: [] });
const digest = () => createHmac("sha256", TOKEN).update(BODY).digest();

test("accepts a hex encoded signature", () => {
  assert.equal(verifyShopierSignature(BODY, digest().toString("hex"), TOKEN), true);
  assert.equal(verifyShopierSignature(BODY, digest().toString("hex").toUpperCase(), TOKEN), true);
  assert.equal(verifyShopierSignature(BODY, `sha256=${digest().toString("hex")}`, TOKEN), true);
});

test("accepts a base64 / base64url encoded signature", () => {
  assert.equal(verifyShopierSignature(BODY, digest().toString("base64"), TOKEN), true);
  assert.equal(verifyShopierSignature(BODY, digest().toString("base64url"), TOKEN), true);
  assert.equal(verifyShopierSignature(Buffer.from(BODY), digest().toString("base64"), TOKEN), true);
});

test("rejects a wrong signature, tampered body or other token", () => {
  assert.equal(verifyShopierSignature(BODY, "0".repeat(64), TOKEN), false);
  assert.equal(verifyShopierSignature(`${BODY} `, digest().toString("hex"), TOKEN), false);
  assert.equal(verifyShopierSignature(BODY, digest().toString("hex"), "another-token"), false);
  assert.equal(verifyShopierSignature(BODY, "not a signature!", TOKEN), false);
  assert.equal(verifyShopierSignature(BODY, digest().subarray(0, 16).toString("hex"), TOKEN), false);
});

test("rejects empty token or missing signature", () => {
  assert.equal(verifyShopierSignature(BODY, digest().toString("hex"), ""), false);
  assert.equal(verifyShopierSignature(BODY, digest().toString("hex"), null), false);
  assert.equal(verifyShopierSignature(BODY, null, TOKEN), false);
  assert.equal(verifyShopierSignature(BODY, "", TOKEN), false);
});

test("verifies over the raw bytes, including non-ASCII payloads", () => {
  const bytes = Buffer.from(JSON.stringify({ id: "1002", shippingInfo: { firstName: "Şükrü", lastName: "Öztürk" } }), "utf8");
  const signature = createHmac("sha256", TOKEN).update(bytes).digest("hex");
  assert.equal(verifyShopierSignature(bytes, signature, TOKEN), true);
  assert.equal(verifyShopierSignature(bytes.toString("utf8"), signature, TOKEN), true);
  assert.equal(verifyShopierSignature(Buffer.from(bytes.toString("latin1"), "utf8"), signature, TOKEN), false);
});
