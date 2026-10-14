"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
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
    const client = await getShopierClient();
    const existing = await client.listWebhooks();
    const storedIds = new Set((await Promise.all(SHOPIER_LICENSE_WEBHOOK_EVENTS.map(storedWebhookId))).filter((id): id is string => !!id));
    const toDelete = existing
      .filter((webhook) => {
        const id = normalizeShopierId(webhook.id);
        return id && (storedIds.has(id) || webhook.url === url);
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
    for (const event of SHOPIER_LICENSE_WEBHOOK_EVENTS) {
      try {
        const created = await client.createWebhook(event, url);
        const id = normalizeShopierId(created?.id);
        const token = typeof created?.token === "string" ? created.token : "";
        if (!id || !token) throw new ActionError("imza anahtarı dönmedi");
        // The token is only returned here; it is stored encrypted and never shown.
        await setCredential(SHOPIER_PROVIDER, shopierWebhookKey(event), JSON.stringify({ id, token }), user.id, { maskable: false });
      } catch {
        // The old subscription may already be deleted: a stale token must not look "installed".
        await deleteCredential(SHOPIER_PROVIDER, shopierWebhookKey(event));
        failedEvents.push(webhookEventLabel(event));
      }
    }
    revalidateSales();
    const cleanup = `${deleted ? ` ${deleted} eski abonelik silindi.` : ""}${deleteFailed ? ` ${deleteFailed} eski abonelik silinemedi; Shopier panelinden kontrol edin.` : ""}`;
    if (failedEvents.length) {
      const installed = SHOPIER_LICENSE_WEBHOOK_EVENTS.length - failedEvents.length;
      throw new ActionError(`${installed} webhook kuruldu; kurulamayan olaylar: ${failedEvents.join(", ")}. Bu olaylar için tekrar "Webhook'ları kur" deneyin.${cleanup}`);
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
