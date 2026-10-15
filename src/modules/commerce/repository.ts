import "server-only";

import { ShopierLicenseStatus, type Prisma } from "@/generated/prisma/client";
import { ActionError } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { getAppDayRange } from "@/lib/app-time";
import {
  getCredentialStatus,
  isEncryptionKeyConfigured,
  listCredentialStatuses,
  SHOPIER_API_TOKEN_KEY,
  SHOPIER_PROVIDER,
  SHOPIER_WEBHOOK_KEY_PREFIX,
  shopierWebhookKey,
} from "./credentials";
import { getShopierClient } from "./shopier-client";
import { SHOPIER_LICENSE_WEBHOOK_EVENTS } from "./shopier-types";

/** Read models for src/app/dashboard/sales pages (pages never import Prisma directly). */

export const SHOPIER_WEBHOOK_PATH = "/api/integrations/shopier/webhook";

export async function getShopierIntegrationOverview() {
  const [apiToken, webhookRows] = await Promise.all([
    getCredentialStatus(SHOPIER_PROVIDER, SHOPIER_API_TOKEN_KEY),
    listCredentialStatuses(SHOPIER_PROVIDER, SHOPIER_WEBHOOK_KEY_PREFIX),
  ]);
  const byKey = new Map(webhookRows.map((row) => [row.key, row.updatedAt]));
  return {
    encryptionReady: isEncryptionKeyConfigured(),
    apiToken,
    webhooks: SHOPIER_LICENSE_WEBHOOK_EVENTS.map((event) => ({
      event,
      configured: byKey.has(shopierWebhookKey(event)),
      updatedAt: byKey.get(shopierWebhookKey(event)) ?? null,
    })),
    appUrl: process.env.APP_URL?.trim() || null,
  };
}

export function listLicenseProducts() {
  return prisma.shopierLicenseProduct.findMany({ orderBy: [{ isActive: "desc" }, { title: "asc" }] });
}

export function getLicenseProduct(id: number) {
  return prisma.shopierLicenseProduct.findUnique({ where: { id } });
}

/** Digital Shopier products for the mapping picker; API failures become a readable message. */
export async function listShopierDigitalProducts(): Promise<{ products: { id: string; title: string; price: string | null }[]; error: string | null }> {
  let client: Awaited<ReturnType<typeof getShopierClient>>;
  try {
    client = await getShopierClient();
  } catch (error) {
    return { products: [], error: error instanceof ActionError ? error.message : "Shopier ürünleri alınamadı." };
  }
  try {
    const products = await client.listProducts();
    return {
      products: products
        .filter((product) => product.id !== null && product.id !== undefined && (product.type ?? "").toLowerCase() === "digital")
        .map((product) => ({
          id: String(product.id),
          title: product.title?.trim() || `Ürün ${product.id}`,
          price: product.priceData?.price !== null && product.priceData?.price !== undefined ? String(product.priceData.price) : null,
        })),
      error: null,
    };
  } catch {
    // Some tokens are denied on /products; fall back to digital products seen in the last 60 days of orders.
    try {
      const byId = new Map<string, { id: string; title: string; price: string | null }>();
      for (const order of await client.listOrders()) {
        for (const item of order.lineItems ?? []) {
          if (item.productId === null || item.productId === undefined || (item.type ?? "").toLowerCase() !== "digital") continue;
          const id = String(item.productId);
          if (!byId.has(id)) byId.set(id, { id, title: item.title?.trim() || `Ürün ${id}`, price: item.price ?? null });
        }
      }
      return {
        products: [...byId.values()],
        error: byId.size ? null : "Shopier ürün listesine erişilemedi ve son 60 günde dijital ürün siparişi yok. Ürün numarasını Shopier ürün sayfasından elle girin.",
      };
    } catch (error) {
      return { products: [], error: error instanceof ActionError ? error.message : "Shopier ürünleri alınamadı." };
    }
  }
}

export type OrderListFilter = { q?: string; from?: string; to?: string };

export async function listShopierOrders(filter: OrderListFilter) {
  const where: Prisma.ShopierOrderWhereInput = {};
  const q = filter.q?.trim();
  if (q) where.OR = [{ shopierOrderId: { contains: q } }, { buyerEmail: { contains: q.toLowerCase() } }, { buyerName: { contains: q } }];
  const orderedAt: Prisma.DateTimeFilter = {};
  if (filter.from && /^\d{4}-\d{2}-\d{2}$/.test(filter.from)) orderedAt.gte = getAppDayRange(filter.from).start;
  if (filter.to && /^\d{4}-\d{2}-\d{2}$/.test(filter.to)) orderedAt.lt = getAppDayRange(filter.to).end;
  if (orderedAt.gte || orderedAt.lt) where.orderedAt = orderedAt;
  return prisma.shopierOrder.findMany({
    where,
    select: {
      id: true,
      shopierOrderId: true,
      status: true,
      paymentStatus: true,
      currency: true,
      total: true,
      buyerEmail: true,
      buyerName: true,
      orderedAt: true,
      refundStatus: true,
      source: true,
      licenses: { select: { status: true } },
    },
    orderBy: { orderedAt: "desc" },
    take: 500,
  });
}

/** Licenses that need a super admin decision: waiting for a match, or refunded after activation. */
export function listLicenseQueue() {
  return prisma.shopierOrderLicense.findMany({
    where: { status: { in: [ShopierLicenseStatus.PENDING_MATCH, ShopierLicenseStatus.REFUNDED] } },
    select: {
      id: true,
      status: true,
      moduleKey: true,
      durationDays: true,
      quantity: true,
      note: true,
      createdAt: true,
      activatedAt: true,
      user: { select: { id: true, email: true, firstName: true, lastName: true, name: true } },
      order: { select: { shopierOrderId: true, buyerEmail: true, buyerName: true, orderedAt: true, total: true, currency: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 500,
  });
}

export async function countLicenseQueue() {
  const [pending, refunded] = await Promise.all([
    prisma.shopierOrderLicense.count({ where: { status: ShopierLicenseStatus.PENDING_MATCH } }),
    prisma.shopierOrderLicense.count({ where: { status: ShopierLicenseStatus.REFUNDED } }),
  ]);
  return { pending, refunded };
}
