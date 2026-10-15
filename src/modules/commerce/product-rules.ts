/**
 * Pure physical product / fulfillment rules (no Prisma, no network); unit tested in
 * product-rules.test.ts. Field limits follow Shopier's "Create a product" and
 * "Update an order" schemas (https://developer.shopier.com/reference/post-products).
 */
import { normalizeShopierId, shopierTitle } from "./license-rules";
import type { ShopierApiProduct } from "./shopier-types";

export const MAX_PRODUCT_IMAGES = 5;
export const MAX_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024;
export const PRODUCT_CURRENCIES = ["TRY", "USD", "EUR"] as const;
export const PRODUCT_VAT_PERCENTS = [0, 1, 10, 20] as const;
export const SHIPPING_PAYERS = ["buyerPays", "sellerPays"] as const;
export const SHIPPING_COMPANIES = ["yurtici", "mng", "ptt", "aras", "surat", "ups", "fedex", "dhl", "tnt", "pts", "aramex", "interGlobal", "hepsijet", "other"] as const;

export type ShippingCompany = (typeof SHIPPING_COMPANIES)[number];

export type ProductInput = {
  title: string;
  description: string | null;
  price: string;
  currency: (typeof PRODUCT_CURRENCIES)[number];
  vatPercent: number | null;
  shippingPayer: (typeof SHIPPING_PAYERS)[number];
  shippingPrice: string | null;
  stockQuantity: number | null;
  dispatchDuration: number;
};

export class ProductRuleError extends Error {}

/** "1.250,50", "1250.5", "1250" -> "1250.50"; null when empty; throws when invalid or out of range. */
export function parseMoneyInput(value: string, label: string, options: { allowZero?: boolean } = {}): string | null {
  const raw = value.trim().replace(/\s/g, "");
  if (!raw) return null;
  // Turkish input: dots are thousand separators when a comma is present.
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(normalized)) throw new ProductRuleError(`${label} geçerli bir tutar olmalıdır (ör. 1250,90).`);
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount > 9_999_999_999 || (amount === 0 && !options.allowZero)) throw new ProductRuleError(`${label} sıfırdan büyük olmalıdır.`);
  return amount.toFixed(2);
}

function parseOptionalInt(value: string, label: string, min: number, max: number): number | null {
  const raw = value.trim();
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) throw new ProductRuleError(`${label} tam sayı olmalıdır.`);
  const number = Number(raw);
  if (number < min || number > max) throw new ProductRuleError(`${label} ${min}–${max} arasında olmalıdır.`);
  return number;
}

function oneOf<T extends string | number>(value: string, allowed: readonly T[], message: string): T {
  const match = allowed.find((item) => String(item) === value.trim());
  if (match === undefined) throw new ProductRuleError(message);
  return match;
}

/** Validates raw form fields into a product; throws ProductRuleError with a Turkish message. */
export function parseProductInput(fields: Record<string, string>): ProductInput {
  const title = (fields.title ?? "").trim();
  if (title.length < 2 || title.length > 200) throw new ProductRuleError("Ürün adı 2–200 karakter olmalıdır.");
  const description = (fields.description ?? "").trim();
  if (description.length > 20_000) throw new ProductRuleError("Açıklama en fazla 20.000 karakter olabilir.");
  const price = parseMoneyInput(fields.price ?? "", "Fiyat");
  if (!price) throw new ProductRuleError("Fiyat girilmelidir.");
  const shippingPayer = oneOf(fields.shippingPayer ?? "", SHIPPING_PAYERS, "Kargo ücretini kimin ödeyeceğini seçin.");
  const vatRaw = (fields.vatPercent ?? "").trim();
  return {
    title,
    description: description || null,
    price,
    currency: oneOf(fields.currency || "TRY", PRODUCT_CURRENCIES, "Para birimi TRY, USD veya EUR olmalıdır."),
    vatPercent: vatRaw ? oneOf(vatRaw, PRODUCT_VAT_PERCENTS, "KDV oranı %0, %1, %10 veya %20 olmalıdır.") : null,
    shippingPayer,
    // Shopier only uses a shipping price when the buyer pays.
    shippingPrice: shippingPayer === "buyerPays" ? parseMoneyInput(fields.shippingPrice ?? "", "Kargo ücreti", { allowZero: true }) : null,
    stockQuantity: parseOptionalInt(fields.stockQuantity ?? "", "Stok", 0, 1_000_000),
    dispatchDuration: parseOptionalInt(fields.dispatchDuration ?? "", "Kargoya veriliş süresi", 1, 3) ?? 1,
  };
}

export type ShopierProductPayload = {
  title: string;
  description?: string;
  type: "physical";
  media: { type: "image"; url: string; placement: number }[];
  priceData: { currency: string; price: string; vatPercent?: number; shippingPrice?: string };
  shippingPayer: string;
  stockQuantity?: number;
  dispatchDuration: number;
};

/** Body for POST /products and PUT /products/{id}. Image URLs must be absolute https. */
type Amount = { toString(): string };
export type PublishableProduct = {
  title: string;
  description: string | null;
  price: Amount;
  currency: string;
  vatPercent: number | null;
  shippingPayer: string;
  shippingPrice: Amount | null;
  stockQuantity: number | null;
  dispatchDuration: number;
};

export function buildShopierProductPayload(product: PublishableProduct, imageUrls: readonly string[]): ShopierProductPayload {
  if (imageUrls.length === 0) throw new ProductRuleError("Shopier'de yayınlamak için en az bir ürün görseli gerekir.");
  if (imageUrls.length > MAX_PRODUCT_IMAGES) throw new ProductRuleError(`Shopier en fazla ${MAX_PRODUCT_IMAGES} görsel kabul eder.`);
  for (const url of imageUrls) {
    if (!/^https:\/\//i.test(url)) throw new ProductRuleError("Görsel adresleri https:// ile başlamalıdır. Uygulama adresini (APP_URL) kontrol edin.");
  }
  const priceData: ShopierProductPayload["priceData"] = { currency: product.currency, price: Number(product.price.toString()).toFixed(2) };
  if (product.vatPercent !== null) priceData.vatPercent = product.vatPercent;
  if (product.shippingPayer === "buyerPays" && product.shippingPrice !== null) priceData.shippingPrice = Number(product.shippingPrice.toString()).toFixed(2);
  return {
    title: product.title,
    ...(product.description ? { description: product.description } : {}),
    type: "physical",
    media: imageUrls.map((url, index) => ({ type: "image", url, placement: index + 1 })),
    priceData,
    shippingPayer: product.shippingPayer,
    ...(product.stockQuantity !== null ? { stockQuantity: product.stockQuantity } : {}),
    dispatchDuration: product.dispatchDuration,
  };
}

export type ImportedProduct = {
  shopierProductId: string;
  title: string;
  description: string | null;
  price: string;
  currency: string;
  vatPercent: number | null;
  shippingPayer: string;
  shippingPrice: string | null;
  stockQuantity: number | null;
  dispatchDuration: number;
  shopierUrl: string | null;
  imageUrls: string[];
};

function numberOrNull(value: unknown): number | null {
  const number = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : null;
}

/** Shopier product -> local catalog row. Digital products and malformed rows return null. */
export function normalizeImportedProduct(raw: ShopierApiProduct): ImportedProduct | null {
  const shopierProductId = normalizeShopierId(raw.id);
  if (!shopierProductId || (raw.type ?? "").toLowerCase() !== "physical") return null;
  const price = numberOrNull(raw.priceData?.price);
  if (price === null || price <= 0) return null;
  const currency = String(raw.priceData?.currency ?? "TRY").toUpperCase();
  const vat = numberOrNull(raw.priceData?.vatPercent);
  const shippingPrice = numberOrNull(raw.priceData?.shippingPrice);
  const stock = numberOrNull(raw.stockQuantity);
  const dispatch = numberOrNull(raw.dispatchDuration);
  const media = Array.isArray(raw.media) ? [...raw.media] : [];
  media.sort((a, b) => (numberOrNull(a?.placement) ?? 99) - (numberOrNull(b?.placement) ?? 99));
  return {
    shopierProductId,
    title: shopierTitle(raw.title, 200) || `Shopier ürünü ${shopierProductId}`,
    description: shopierTitle(raw.description, 20_000) || null,
    price: price.toFixed(2),
    currency: (PRODUCT_CURRENCIES as readonly string[]).includes(currency) ? currency : "TRY",
    vatPercent: vat !== null && (PRODUCT_VAT_PERCENTS as readonly number[]).includes(vat) ? vat : null,
    shippingPayer: raw.shippingPayer === "sellerPays" ? "sellerPays" : "buyerPays",
    shippingPrice: shippingPrice !== null && shippingPrice >= 0 ? shippingPrice.toFixed(2) : null,
    stockQuantity: stock !== null && Number.isSafeInteger(stock) && stock >= 0 ? stock : null,
    dispatchDuration: dispatch !== null && dispatch >= 1 && dispatch <= 3 ? Math.round(dispatch) : 1,
    shopierUrl: typeof raw.url === "string" && /^https:\/\//i.test(raw.url) ? raw.url.slice(0, 500) : null,
    imageUrls: media
      .map((item) => (typeof item?.url === "string" ? item.url.trim() : ""))
      .filter((url) => /^https:\/\//i.test(url) && url.length <= 500)
      .slice(0, MAX_PRODUCT_IMAGES),
  };
}

export type FulfillmentInput = { shippingCompany: ShippingCompany; trackingNumber: string };

export function parseFulfillmentInput(fields: { shippingCompany?: string; trackingNumber?: string }): FulfillmentInput {
  const shippingCompany = oneOf(fields.shippingCompany ?? "", SHIPPING_COMPANIES, "Kargo firmasını seçin.");
  const trackingNumber = (fields.trackingNumber ?? "").trim();
  if (!/^[A-Za-z0-9-]{4,64}$/.test(trackingNumber)) throw new ProductRuleError("Takip numarası 4–64 karakter olmalı; yalnız harf, rakam ve tire içerebilir.");
  return { shippingCompany, trackingNumber };
}

/** Shopier PUT /orders/{id} body that closes the physical part of an order. */
export function buildFulfillmentPayload(input: FulfillmentInput) {
  return { fulfillments: { productType: "physical" as const, shippingCompany: input.shippingCompany, trackingNumber: input.trackingNumber } };
}

/** Image file check by magic bytes; Shopier accepts jpg, jpeg, png and bmp, we take jpeg/png only. */
export function detectImageType(bytes: Uint8Array): "jpg" | "png" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "png";
  return null;
}
