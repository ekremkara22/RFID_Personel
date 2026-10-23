"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";

import { ActionError, actionErrorMessage, type ActionResult } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { ALL_MODULE_KEYS } from "@/modules/registry";
import { assertSuperadminUser, getId, getOptionalId, getString } from "@/modules/shared/action-helpers";
import {
  deleteCredential,
  getCredential,
  setCredential,
  SHOPIER_PROVIDER,
  SHOPIER_API_TOKEN_KEY,
  shopierWebhookKey,
} from "./credentials";
import { activatePending, ignorePending, ingestOrder } from "./license-activation";
import { webhookEventLabel } from "./labels";
import { normalizeEmail, normalizeShopierId, parseDurationDays } from "./license-rules";
import {
  createProduct,
  deleteProduct,
  fulfillOrder,
  importShopierProducts,
  makePrimaryImage,
  publishProduct,
  removeProductImage,
  setDeviceOffer,
  unpublishProduct,
  updateProduct,
} from "./product-catalog";
import { parseFulfillmentInput, parseProductInput, ProductRuleError } from "./product-rules";
import { SHOPIER_WEBHOOK_PATH } from "./repository";
import { createShopierClient, getShopierClient } from "./shopier-client";
import { SHOPIER_LICENSE_WEBHOOK_EVENTS } from "./shopier-types";

/** Like runFormAction, but the success message can carry a result summary. */
async function runCommerceAction(operation: () => Promise<string | void>): Promise<ActionResult> {
  try {
    const message = await operation();
    return { ok: true, message: message || "Değişiklikler kaydedildi." };
  } catch (error) {
    unstable_rethrow(error);
    const message = actionErrorMessage(error);
    if (message) return { ok: false, message };
    const reference = randomUUID();
    console.error(`[commerce-action:${reference}]`, error instanceof Error ? error.name : "unknown", error && typeof error === "object" && "code" in error ? error.code : null);
    return { ok: false, message: `İşlem sunucu hatası nedeniyle tamamlanamadı. Hata kodu: ${reference}` };
  }
}

function prismaCode(error: unknown) {
  return error && typeof error === "object" && "code" in error ? (error as { code?: unknown }).code : null;
}

function revalidateSales() {
  revalidatePath("/dashboard/sales", "layout");
}

// ---------------------------------------------------------------------------
// Integration settings
// ---------------------------------------------------------------------------

export async function saveShopierTokenAction(formData: FormData) {
  return runCommerceAction(async () => {
    const user = await assertSuperadminUser();
    const token = getString(formData, "token");
    if (token.length < 20 || token.length > 4000 || /\s/.test(token)) throw new ActionError("Geçerli bir Shopier API anahtarı (Personal Access Token) girin.");
    // Test before storing so a mistyped token never replaces a working one.
    await createShopierClient(token).testConnection();
    await setCredential(SHOPIER_PROVIDER, SHOPIER_API_TOKEN_KEY, token, user.id);
    revalidateSales();
    return "API anahtarı doğrulandı ve şifreli olarak kaydedildi.";
  });
}

export async function testShopierConnectionAction() {
  return runCommerceAction(async () => {
    await assertSuperadminUser();
    const client = await getShopierClient();
    await client.testConnection();
    return "Shopier bağlantısı başarılı.";
  });
}

function webhookTargetUrl(rawAppUrl: string) {
  let base: URL;
  try {
    base = new URL(rawAppUrl);
  } catch {
    throw new ActionError("Uygulama adresi geçerli bir adres olmalıdır (ör. https://flodeska.com).");
  }
  if (base.protocol !== "https:") throw new ActionError("Shopier webhook adresi https:// ile başlamalıdır.");
  return new URL(SHOPIER_WEBHOOK_PATH, base.origin).toString();
}

async function storedWebhookId(event: string) {
  const stored = await getCredential(SHOPIER_PROVIDER, shopierWebhookKey(event)).catch(() => null);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as { id?: unknown };
    return normalizeShopierId(parsed.id);
  } catch {
    return null;
  }
}

/**
 * (Re)creates the license webhooks for this environment. Old subscriptions created by this
 * environment (stored id) or pointing at the same URL are deleted first; subscriptions of other
 * environments (e.g. staging vs production URL) are left alone.
 */
export async function setupShopierWebhooksAction(formData: FormData) {
  return runCommerceAction(async () => {
    const user = await assertSuperadminUser();
    const url = webhookTargetUrl(getString(formData, "appUrl"));
    // Opt-in: also remove subscriptions of the same events that point at other addresses (e.g. staging),
    // for when Shopier refuses a second subscription for an event.
    const replaceOthers = formData.get("replaceOthers") === "on";
    const events = new Set<string>(SHOPIER_LICENSE_WEBHOOK_EVENTS);
    const client = await getShopierClient();
    const existing = await client.listWebhooks();
    const storedIds = new Set((await Promise.all(SHOPIER_LICENSE_WEBHOOK_EVENTS.map(storedWebhookId))).filter((id): id is string => !!id));
    const toDelete = existing
      .filter((webhook) => {
        const id = normalizeShopierId(webhook.id);
        return id && (storedIds.has(id) || webhook.url === url || (replaceOthers && events.has(webhook.event ?? "")));
      })
      .map((webhook) => normalizeShopierId(webhook.id)!);
    let deleted = 0;
    let deleteFailed = 0;
    for (const id of toDelete) {
      try {
        await client.deleteWebhook(id);
        deleted += 1;
      } catch {
        deleteFailed += 1;
      }
    }

    const failedEvents: string[] = [];
    const reasons = new Set<string>();
    for (const event of SHOPIER_LICENSE_WEBHOOK_EVENTS) {
      try {
        const created = await client.createWebhook(event, url);
        const id = normalizeShopierId(created?.id);
        const token = typeof created?.token === "string" ? created.token : "";
        if (!id || !token) throw new ActionError("imza anahtarı dönmedi");
        // The token is only returned here; it is stored encrypted and never shown.
        await setCredential(SHOPIER_PROVIDER, shopierWebhookKey(event), JSON.stringify({ id, token }), user.id, { maskable: false });
      } catch (error) {
        // The old subscription may already be deleted: a stale token must not look "installed".
        await deleteCredential(SHOPIER_PROVIDER, shopierWebhookKey(event));
        failedEvents.push(webhookEventLabel(event));
        reasons.add(error instanceof ActionError ? error.message : "bilinmeyen hata");
      }
    }
    revalidateSales();
    const cleanup = `${deleted ? ` ${deleted} eski abonelik silindi.` : ""}${deleteFailed ? ` ${deleteFailed} eski abonelik silinemedi; Shopier panelinden kontrol edin.` : ""}`;
    if (failedEvents.length) {
      const installed = SHOPIER_LICENSE_WEBHOOK_EVENTS.length - failedEvents.length;
      const others = existing.filter((webhook) => events.has(webhook.event ?? "") && webhook.url !== url && !toDelete.includes(normalizeShopierId(webhook.id) ?? "")).length;
      const hint = others && !replaceOthers ? ` Shopier'de bu olaylar için başka adrese kurulu ${others} abonelik var; "diğer adreslerdeki abonelikleri kaldır" seçeneğiyle tekrar deneyin.` : "";
      throw new ActionError(`${installed} webhook kuruldu; kurulamayan olaylar: ${failedEvents.join(", ")}. Shopier yanıtı: ${[...reasons].join(" / ")}${cleanup}${hint}`);
    }
    return `${SHOPIER_LICENSE_WEBHOOK_EVENTS.length} webhook aboneliği kuruldu.${cleanup}`;
  });
}

// ---------------------------------------------------------------------------
// Product -> module mappings
// ---------------------------------------------------------------------------

export async function saveLicenseProductAction(formData: FormData) {
  return runCommerceAction(async () => {
    await assertSuperadminUser();
    const id = getOptionalId(formData, "id");
    const shopierProductId = normalizeShopierId(getString(formData, "shopierProductId"));
    const title = getString(formData, "title");
    const moduleKey = getString(formData, "moduleKey");
    const durationDays = parseDurationDays(getString(formData, "durationDays"));
    const isActive = formData.get("isActive") === "on";

    if (!shopierProductId || !/^[A-Za-z0-9_-]{1,64}$/.test(shopierProductId)) throw new ActionError("Shopier ürün numarası geçersiz.");
    if (title.length < 2 || title.length > 200) throw new ActionError("Ürün adı 2–200 karakter olmalıdır.");
    if (!ALL_MODULE_KEYS.includes(moduleKey as never)) throw new ActionError("Geçerli bir modül seçin.");
    if (durationDays === undefined) throw new ActionError("Süre 1–3650 gün arasında tam sayı olmalı veya süresiz lisans için boş bırakılmalıdır.");

    const data = { shopierProductId, title, moduleKey, durationDays, isActive };
    try {
      if (id) await prisma.shopierLicenseProduct.update({ where: { id }, data });
      else await prisma.shopierLicenseProduct.create({ data });
    } catch (error) {
      if (prismaCode(error) === "P2002") throw new ActionError("Bu Shopier ürünü zaten eşlenmiş. Mevcut eşlemeyi düzenleyin.");
      if (prismaCode(error) === "P2025") throw new ActionError("Eşleme kaydı bulunamadı; sayfayı yenileyin.");
      throw error;
    }
    if (!id) {
      revalidateSales();
      redirect("/dashboard/sales/license-products");
    }
    revalidateSales();
    return "Eşleme güncellendi.";
  });
}

export async function deleteLicenseProductAction(formData: FormData) {
  return runCommerceAction(async () => {
    await assertSuperadminUser();
    const id = getId(formData, "id");
    // Activated licenses keep their own copy of moduleKey/duration, so history is preserved.
    try {
      await prisma.shopierLicenseProduct.delete({ where: { id } });
    } catch (error) {
      if (prismaCode(error) === "P2025") throw new ActionError("Eşleme kaydı bulunamadı; sayfayı yenileyin.");
      throw error;
    }
    revalidateSales();
    redirect("/dashboard/sales/license-products");
  });
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

/** Pulls the last 60 days (Shopier default range) and ingests every order idempotently. */
export async function syncShopierOrdersAction() {
  return runCommerceAction(async () => {
    await assertSuperadminUser();
    const client = await getShopierClient();
    const orders = await client.listOrders();
    const totals = { orders: 0, newOrders: 0, activated: 0, pending: 0, refunded: 0, failed: 0 };
    for (const order of orders) {
      try {
        const result = await ingestOrder(order, "SYNC");
        totals.orders += 1;
        if (result.created) totals.newOrders += 1;
        totals.activated += result.activated;
        totals.pending += result.pending;
        totals.refunded += result.refunded;
      } catch (error) {
        totals.failed += 1;
        console.error("[commerce-sync] order ingest failed", error instanceof Error ? error.name : "unknown", error && typeof error === "object" && "code" in error ? error.code : null);
      }
    }
    revalidateSales();
    return `Eşitleme tamamlandı: ${totals.orders} sipariş işlendi (${totals.newOrders} yeni), ${totals.activated} lisans açıldı, ${totals.pending} lisans eşleşme bekliyor, ${totals.refunded} lisans iade olarak işaretlendi${totals.failed ? `, ${totals.failed} sipariş işlenemedi` : ""}.`;
  });
}

// ---------------------------------------------------------------------------
// Pending / refunded queue
// ---------------------------------------------------------------------------

export async function activatePendingLicenseAction(formData: FormData) {
  return runCommerceAction(async () => {
    const admin = await assertSuperadminUser();
    const licenseId = getId(formData, "licenseId");
    const email = normalizeEmail(getString(formData, "email"));
    if (!email) throw new ActionError("Geçerli bir kullanıcı e-postası girin.");
    const user = await prisma.user.findFirst({ where: { email }, select: { id: true } });
    if (!user) throw new ActionError("Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.");
    await activatePending(licenseId, user.id, admin.id);
    revalidateSales();
    revalidatePath("/dashboard", "layout");
    return "Lisans kullanıcıya aktive edildi.";
  });
}

// ---------------------------------------------------------------------------
// Physical products (Faz 2)
// ---------------------------------------------------------------------------

const PRODUCT_FIELDS = ["title", "description", "price", "currency", "vatPercent", "shippingPayer", "shippingPrice", "stockQuantity", "dispatchDuration"] as const;

function productInputFromForm(formData: FormData) {
  const fields = Object.fromEntries(PRODUCT_FIELDS.map((name) => [name, getString(formData, name)]));
  try {
    return parseProductInput(fields);
  } catch (error) {
    if (error instanceof ProductRuleError) throw new ActionError(error.message);
    throw error;
  }
}

function uploadedImages(formData: FormData) {
  return formData.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
}

/** Absolute origin Shopier can download product images from: APP_URL, else this request's host. */
async function publicBaseUrl() {
  const configured = process.env.APP_URL?.trim();
  if (configured) return new URL(configured).origin;
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) throw new ActionError("Uygulama adresi belirlenemedi. Sunucuda APP_URL tanımlayın.");
  return `${headerList.get("x-forwarded-proto") ?? "https"}://${host}`;
}

function revalidateProducts(id?: number) {
  revalidatePath("/dashboard/sales/products");
  if (id) revalidatePath(`/dashboard/sales/products/${id}`);
}

export async function saveProductAction(formData: FormData) {
  return runCommerceAction(async () => {
    await assertSuperadminUser();
    const id = getOptionalId(formData, "id");
    const input = productInputFromForm(formData);
    const files = uploadedImages(formData);
    if (!id) {
      const newId = await createProduct(input, files);
      revalidateProducts();
      redirect(`/dashboard/sales/products/${newId}`);
    }
    const { published } = await updateProduct(id, input, files);
    revalidateProducts(id);
    return published ? "Değişiklikler kaydedildi. Shopier'e yansıtmak için “Shopier'i güncelle”yi kullanın." : "Ürün kaydedildi.";
  });
}

export async function makePrimaryProductImageAction(formData: FormData) {
  return runCommerceAction(async () => {
    await assertSuperadminUser();
    const id = getId(formData, "id");
    await makePrimaryImage(id, getId(formData, "imageId"));
    revalidateProducts(id);
    return "Ana görsel değiştirildi.";
  });
}

export async function removeProductImageAction(formData: FormData) {
  return runCommerceAction(async () => {
    await assertSuperadminUser();
    const id = getId(formData, "id");
    await removeProductImage(id, getId(formData, "imageId"));
    revalidateProducts(id);
    return "Görsel kaldırıldı.";
  });
}

export async function publishProductAction(formData: FormData) {
  return runCommerceAction(async () => {
    await assertSuperadminUser();
    const id = getId(formData, "id");
    try {
      const { created } = await publishProduct(id, await publicBaseUrl());
      return created ? "Ürün Shopier'de yayınlandı." : "Shopier'deki ürün güncellendi.";
    } catch (error) {
      if (error instanceof ProductRuleError) throw new ActionError(error.message);
      throw error;
    } finally {
      revalidateProducts(id);
    }
  });
}

export async function unpublishProductAction(formData: FormData) {
  return runCommerceAction(async () => {
    await assertSuperadminUser();
    const id = getId(formData, "id");
    await unpublishProduct(id);
    revalidateProducts(id);
    return "Ürün Shopier'den kaldırıldı ve arşivlendi.";
  });
}

export async function setDeviceOfferAction(formData: FormData) {
  return runCommerceAction(async () => {
    await assertSuperadminUser();
    const id = getId(formData, "id");
    const enabled = getString(formData, "enabled") === "1";
    await setDeviceOffer(id, enabled);
    revalidateProducts(id);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/devices");
    return enabled ? "Ürün panelde RFID okuyucu olarak öneriliyor." : "Ürün artık panelde önerilmiyor.";
  });
}

export async function deleteProductAction(formData: FormData) {
  return runCommerceAction(async () => {
    await assertSuperadminUser();
    await deleteProduct(getId(formData, "id"));
    revalidateProducts();
    redirect("/dashboard/sales/products");
  });
}

export async function importShopierProductsAction() {
  return runCommerceAction(async () => {
    await assertSuperadminUser();
    const totals = await importShopierProducts();
    revalidateProducts();
    return `İçe aktarma tamamlandı: Shopier'de ${totals.found} fiziksel ürün bulundu, ${totals.imported} yeni ürün eklendi, ${totals.existing} ürün zaten katalogdaydı${totals.skipped ? `, ${totals.skipped} kayıt atlandı` : ""}.`;
  });
}

export async function fulfillOrderAction(formData: FormData) {
  return runCommerceAction(async () => {
    const admin = await assertSuperadminUser();
    const id = getId(formData, "id");
    let input;
    try {
      input = parseFulfillmentInput({ shippingCompany: getString(formData, "shippingCompany"), trackingNumber: getString(formData, "trackingNumber") });
    } catch (error) {
      if (error instanceof ProductRuleError) throw new ActionError(error.message);
      throw error;
    }
    await fulfillOrder(id, input, admin.id);
    revalidateSales();
    return "Sipariş Shopier'de gönderildi olarak işaretlendi.";
  });
}

export async function ignorePendingLicenseAction(formData: FormData) {
  return runCommerceAction(async () => {
    const admin = await assertSuperadminUser();
    const licenseId = getId(formData, "licenseId");
    const note = getString(formData, "note");
    if (note.length > 500) throw new ActionError("Not en fazla 500 karakter olabilir.");
    await ignorePending(licenseId, admin.id, note);
    revalidateSales();
    return "Kayıt yok sayıldı.";
  });
}
