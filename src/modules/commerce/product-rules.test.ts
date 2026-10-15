import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFulfillmentPayload,
  buildShopierProductPayload,
  detectImageType,
  normalizeImportedProduct,
  parseFulfillmentInput,
  parseMoneyInput,
  parseProductInput,
  ProductRuleError,
} from "./product-rules";

const baseFields = { title: "LED oyun logosu", description: "", price: "1.250,90", currency: "TRY", vatPercent: "20", shippingPayer: "buyerPays", shippingPrice: "75", stockQuantity: "12", dispatchDuration: "2" };

test("parses Turkish and plain money inputs", () => {
  assert.equal(parseMoneyInput("1.250,90", "Fiyat"), "1250.90");
  assert.equal(parseMoneyInput("1250.5", "Fiyat"), "1250.50");
  assert.equal(parseMoneyInput(" 99 ", "Fiyat"), "99.00");
  assert.equal(parseMoneyInput("", "Fiyat"), null);
  assert.equal(parseMoneyInput("0", "Kargo", { allowZero: true }), "0.00");
  assert.throws(() => parseMoneyInput("0", "Fiyat"), ProductRuleError);
  assert.throws(() => parseMoneyInput("12,345", "Fiyat"), ProductRuleError);
  assert.throws(() => parseMoneyInput("-5", "Fiyat"), ProductRuleError);
  assert.throws(() => parseMoneyInput("abc", "Fiyat"), ProductRuleError);
});

test("parses a product form", () => {
  const input = parseProductInput(baseFields);
  assert.deepEqual(input, { title: "LED oyun logosu", description: null, price: "1250.90", currency: "TRY", vatPercent: 20, shippingPayer: "buyerPays", shippingPrice: "75.00", stockQuantity: 12, dispatchDuration: 2 });
});

test("drops the shipping price when the seller pays and defaults optional fields", () => {
  const input = parseProductInput({ ...baseFields, shippingPayer: "sellerPays", vatPercent: "", stockQuantity: "", dispatchDuration: "" });
  assert.equal(input.shippingPrice, null);
  assert.equal(input.vatPercent, null);
  assert.equal(input.stockQuantity, null);
  assert.equal(input.dispatchDuration, 1);
});

test("rejects invalid product fields", () => {
  assert.throws(() => parseProductInput({ ...baseFields, title: "a" }), ProductRuleError);
  assert.throws(() => parseProductInput({ ...baseFields, price: "" }), ProductRuleError);
  assert.throws(() => parseProductInput({ ...baseFields, currency: "GBP" }), ProductRuleError);
  assert.throws(() => parseProductInput({ ...baseFields, vatPercent: "18" }), ProductRuleError);
  assert.throws(() => parseProductInput({ ...baseFields, shippingPayer: "nobody" }), ProductRuleError);
  assert.throws(() => parseProductInput({ ...baseFields, dispatchDuration: "4" }), ProductRuleError);
  assert.throws(() => parseProductInput({ ...baseFields, stockQuantity: "1.5" }), ProductRuleError);
});

test("builds the Shopier create/update body", () => {
  const product = parseProductInput(baseFields);
  const payload = buildShopierProductPayload(product, ["https://test.flodeska.com/a.jpg", "https://test.flodeska.com/b.png"]);
  assert.deepEqual(payload, {
    title: "LED oyun logosu",
    type: "physical",
    media: [
      { type: "image", url: "https://test.flodeska.com/a.jpg", placement: 1 },
      { type: "image", url: "https://test.flodeska.com/b.png", placement: 2 },
    ],
    priceData: { currency: "TRY", price: "1250.90", vatPercent: 20, shippingPrice: "75.00" },
    shippingPayer: "buyerPays",
    stockQuantity: 12,
    dispatchDuration: 2,
  });
});

test("requires 1-5 https images to publish", () => {
  const product = parseProductInput(baseFields);
  assert.throws(() => buildShopierProductPayload(product, []), ProductRuleError);
  assert.throws(() => buildShopierProductPayload(product, ["http://localhost:3000/a.jpg"]), ProductRuleError);
  assert.throws(() => buildShopierProductPayload(product, Array.from({ length: 6 }, (_, i) => `https://x.com/${i}.jpg`)), ProductRuleError);
});

test("imports physical Shopier products only", () => {
  const imported = normalizeImportedProduct({
    id: "abc123",
    title: " Logo ",
    type: "physical",
    url: "https://www.shopier.com/abc123",
    media: [{ url: "https://cdn.shopier.com/2.jpg", placement: 2 }, { url: "https://cdn.shopier.com/1.jpg", placement: 1 }],
    priceData: { price: "450.00", currency: "TRY", vatPercent: "20", shippingPrice: "0" },
    shippingPayer: "sellerPays",
    stockQuantity: 3,
    dispatchDuration: 2,
  });
  assert.equal(imported?.shopierProductId, "abc123");
  assert.equal(imported?.title, "Logo");
  assert.equal(imported?.price, "450.00");
  assert.equal(imported?.vatPercent, 20);
  assert.equal(imported?.shippingPayer, "sellerPays");
  assert.deepEqual(imported?.imageUrls, ["https://cdn.shopier.com/1.jpg", "https://cdn.shopier.com/2.jpg"]);
  assert.equal(normalizeImportedProduct({ id: "d1", type: "digital", priceData: { price: "10" } }), null);
  assert.equal(normalizeImportedProduct({ id: "p1", type: "physical", priceData: { price: "0" } }), null);
});

test("validates fulfillment input and builds the order update body", () => {
  const input = parseFulfillmentInput({ shippingCompany: "yurtici", trackingNumber: " 123456789 " });
  assert.deepEqual(buildFulfillmentPayload(input), { fulfillments: { productType: "physical", shippingCompany: "yurtici", trackingNumber: "123456789" } });
  assert.throws(() => parseFulfillmentInput({ shippingCompany: "kargo", trackingNumber: "123456" }), ProductRuleError);
  assert.throws(() => parseFulfillmentInput({ shippingCompany: "aras", trackingNumber: "12" }), ProductRuleError);
  assert.throws(() => parseFulfillmentInput({ shippingCompany: "aras", trackingNumber: "12 34 56" }), ProductRuleError);
});

test("detects image types by magic bytes", () => {
  assert.equal(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "jpg");
  assert.equal(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "png");
  assert.equal(detectImageType(new Uint8Array([0x47, 0x49, 0x46, 0x38])), null);
});
