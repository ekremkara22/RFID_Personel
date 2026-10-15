import "server-only";

import { CompanyMembershipStatus, Role, ShopierLicenseStatus, type Prisma } from "@/generated/prisma/client";
import { ActionError } from "@/lib/action-error";
import { findCompanyLicensePrincipal } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import {
  computeEntitlementExpiry,
  isFullyRefunded,
  isStaleRefundUpdate,
  mergeRefundStatus,
  isPaidOrder,
  normalizeEmail,
  normalizeShopierOrder,
  type NormalizedShopierOrder,
} from "./license-rules";
import type { ShopierOrderSource } from "./shopier-types";

/**
 * The only place the commerce module writes UserModuleEntitlement (see MODULE.md).
 * Idempotency key: ShopierOrderLicense @@unique([orderId, shopierProductId]). The license row
 * and the entitlement extension are written in one transaction, so a webhook retry or a manual
 * sync can never extend the same order line twice.
 */

export type IngestResult = {
  shopierOrderId: string;
  created: boolean;
  activated: number;
  pending: number;
  refunded: number;
  alreadyProcessed: number;
  unmapped: number;
};

type Tx = Prisma.TransactionClient;
type LicenseRow = { id: number; moduleKey: string; durationDays: number | null; quantity: number };

function isUniqueViolation(error: unknown) {
  return !!error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "P2002";
}

/**
 * License holder for a buyer: the company license principal when the user belongs to a company,
 * otherwise the user. Platform admins never receive purchased licenses.
 */
async function resolveHolderForUser(userId: number): Promise<number | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, companyId: true } });
  if (!user || user.role === Role.SUPERADMIN) return null;
  const companyId = user.companyId ?? (await prisma.companyMembership.findFirst({
    where: { userId: user.id, status: CompanyMembershipStatus.ACTIVE },
    orderBy: { id: "asc" },
    select: { companyId: true },
  }))?.companyId ?? null;
  if (companyId) {
    const principal = await findCompanyLicensePrincipal(companyId);
    if (principal) return principal.userId;
  }
  return user.id;
}

async function resolveHolderForEmail(email: string | null): Promise<number | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  // MariaDB utf8mb4_unicode_ci comparison is case-insensitive; emails are also stored lower-case.
  const user = await prisma.user.findFirst({ where: { email: normalized }, select: { id: true } });
  return user ? resolveHolderForUser(user.id) : null;
}

/** Extends the holder's entitlement for one license row inside the caller's transaction. */
async function extendEntitlement(tx: Tx, holderId: number, license: LicenseRow, now: Date) {
  // Serialize concurrent purchases for the same holder so extensions are not lost.
  await tx.$queryRaw`SELECT id FROM \`User\` WHERE id = ${holderId} FOR UPDATE`;
  const current = await tx.userModuleEntitlement.findUnique({
    where: { userId_moduleKey: { userId: holderId, moduleKey: license.moduleKey } },
    select: { expiresAt: true },
  });
  const expiresAt = computeEntitlementExpiry({ durationDays: license.durationDays, quantity: license.quantity, current, now });
  await tx.userModuleEntitlement.upsert({
    where: { userId_moduleKey: { userId: holderId, moduleKey: license.moduleKey } },
    create: { userId: holderId, moduleKey: license.moduleKey, expiresAt },
    update: { expiresAt },
  });
  return expiresAt;
}

type StoredOrder = { id: number; created: boolean; refundStatus: string | null; stale: boolean };

async function updateExistingOrder(existing: { id: number; refundStatus: string | null }, data: Prisma.ShopierOrderUpdateInput, incomingRefund: NormalizedShopierOrder["refundStatus"]): Promise<StoredOrder> {
  // An older body (e.g. late order.created after a completed refund) must not roll the refund back.
  if (isStaleRefundUpdate(existing.refundStatus, incomingRefund)) {
    return { id: existing.id, created: false, refundStatus: mergeRefundStatus(existing.refundStatus, incomingRefund), stale: true };
  }
  await prisma.shopierOrder.update({ where: { id: existing.id }, data });
  return { id: existing.id, created: false, refundStatus: incomingRefund, stale: false };
}

async function upsertOrder(order: NormalizedShopierOrder, payload: string, source: ShopierOrderSource): Promise<StoredOrder> {
  const data = {
    status: order.status,
    paymentStatus: order.paymentStatus,
    currency: order.currency,
    total: order.total,
    buyerEmail: order.buyerEmail,
    buyerName: order.buyerName,
    buyerPhone: order.buyerPhone,
    orderedAt: order.orderedAt,
    refundStatus: order.refundStatus,
    hasPhysicalItems: order.lineItems.some((item) => item.type === "physical"),
    payload,
  };
  const select = { id: true, refundStatus: true } as const;
  const existing = await prisma.shopierOrder.findUnique({ where: { shopierOrderId: order.shopierOrderId }, select });
  if (existing) return updateExistingOrder(existing, data, order.refundStatus);
  try {
    const created = await prisma.shopierOrder.create({ data: { shopierOrderId: order.shopierOrderId, source, ...data }, select: { id: true } });
    return { id: created.id, created: true, refundStatus: order.refundStatus, stale: false };
  } catch (error) {
    // Webhook and sync raced on the same order: the other writer created it first.
    if (!isUniqueViolation(error)) throw error;
    const row = await prisma.shopierOrder.findUniqueOrThrow({ where: { shopierOrderId: order.shopierOrderId }, select });
    return updateExistingOrder(row, data, order.refundStatus);
  }
}

const REFUND_NOTE = "Shopier'de tam iade tamamlandı. Lisans otomatik kapatılmadı.";

/** Flags every not-yet-decided license of a fully refunded order; entitlements stay open for the admin to decide. */
async function markOrderRefunded(orderId: number) {
  const result = await prisma.shopierOrderLicense.updateMany({
    where: { orderId, status: { in: [ShopierLicenseStatus.ACTIVATED, ShopierLicenseStatus.PENDING_MATCH] } },
    data: { status: ShopierLicenseStatus.REFUNDED, note: REFUND_NOTE },
  });
  return result.count;
}


function activeMappings(order: NormalizedShopierOrder) {
  return prisma.shopierLicenseProduct.findMany({
    where: { shopierProductId: { in: order.lineItems.map((item) => item.productId) }, isActive: true },
    select: { shopierProductId: true, moduleKey: true, durationDays: true },
  });
}

/**
 * Stores a Shopier order and opens licenses for its paid, mapped lines exactly once.
 * Safe to call repeatedly with the same order (webhook retries, manual sync) and with
 * out-of-order deliveries (a stale body never reopens a refunded order).
 */
export async function ingestOrder(raw: unknown, source: ShopierOrderSource): Promise<IngestResult> {
  const order = normalizeShopierOrder(raw);
  const stored = await upsertOrder(order, JSON.stringify(raw), source);
  const result: IngestResult = { shopierOrderId: order.shopierOrderId, created: stored.created, activated: 0, pending: 0, refunded: 0, alreadyProcessed: 0, unmapped: 0 };

  if (isFullyRefunded(stored.refundStatus === "full" ? "full" : null)) {
    result.refunded = await markOrderRefunded(stored.id);
    // Lines that never got a license row get a REFUNDED row (no license opened) so a later,
    // stale "paid" delivery hits the unique key instead of opening a license.
    if (order.lineItems.length) {
      const mappings = await activeMappings(order);
      for (const mapping of mappings) {
        const item = order.lineItems.find((line) => line.productId === mapping.shopierProductId)!;
        try {
          await prisma.shopierOrderLicense.create({
            data: { orderId: stored.id, shopierProductId: mapping.shopierProductId, moduleKey: mapping.moduleKey, durationDays: mapping.durationDays, quantity: item.quantity, status: ShopierLicenseStatus.REFUNDED, note: "Sipariş lisans açılmadan tam iade edildi." },
          });
          result.refunded += 1;
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
        }
      }
    }
    return result;
  }
  if (stored.stale || !isPaidOrder(order) || order.lineItems.length === 0) return result;

  const mappings = await activeMappings(order);
  const mappingByProduct = new Map(mappings.map((mapping) => [mapping.shopierProductId, mapping]));
  const existing = new Set((await prisma.shopierOrderLicense.findMany({ where: { orderId: stored.id }, select: { shopierProductId: true } })).map((item) => item.shopierProductId));

  let holderId: number | null | undefined;
  for (const item of order.lineItems) {
    const mapping = mappingByProduct.get(item.productId);
    if (!mapping) {
      result.unmapped += 1;
      continue;
    }
    if (existing.has(item.productId)) {
      result.alreadyProcessed += 1;
      continue;
    }
    if (holderId === undefined) holderId = await resolveHolderForEmail(order.buyerEmail);
    const base = { orderId: stored.id, shopierProductId: item.productId, moduleKey: mapping.moduleKey, durationDays: mapping.durationDays, quantity: item.quantity };
    try {
      if (holderId) {
        const holder = holderId;
        await prisma.$transaction(async (tx) => {
          const now = new Date();
          const license = await tx.shopierOrderLicense.create({
            data: { ...base, status: ShopierLicenseStatus.ACTIVATED, userId: holder, activatedAt: now, activatedById: null },
            select: { id: true, moduleKey: true, durationDays: true, quantity: true },
          });
          const expiresAt = await extendEntitlement(tx, holder, license, now);
          await tx.shopierOrderLicense.update({ where: { id: license.id }, data: { expiresAtAfter: expiresAt } });
        });
        result.activated += 1;
      } else {
        await prisma.shopierOrderLicense.create({
          data: { ...base, status: ShopierLicenseStatus.PENDING_MATCH, note: order.buyerEmail ? null : "Siparişte alıcı e-postası yok." },
        });
        result.pending += 1;
      }
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      result.alreadyProcessed += 1;
    }
  }
  return result;
}

/** Moves one PENDING_MATCH row to ACTIVATED for `holderId`; the status guard makes it single-use. */
async function activateLicenseRecord(licenseId: number, holderId: number, actorId: number | null) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const claimed = await tx.shopierOrderLicense.updateMany({
      where: { id: licenseId, status: ShopierLicenseStatus.PENDING_MATCH },
      data: { status: ShopierLicenseStatus.ACTIVATED, userId: holderId, activatedAt: now, activatedById: actorId },
    });
    if (claimed.count !== 1) return false;
    const license = await tx.shopierOrderLicense.findUniqueOrThrow({ where: { id: licenseId }, select: { id: true, moduleKey: true, durationDays: true, quantity: true } });
    const expiresAt = await extendEntitlement(tx, holderId, license, now);
    await tx.shopierOrderLicense.update({ where: { id: licenseId }, data: { expiresAtAfter: expiresAt } });
    return true;
  });
}

/** Super admin assigns a waiting license to a user (holder resolved through the user's company). */
export async function activatePending(licenseId: number, userId: number, adminId: number) {
  const holderId = await resolveHolderForUser(userId);
  if (!holderId) throw new ActionError("Seçilen kullanıcıya lisans verilemez. Platform yöneticisi olmayan bir kullanıcı seçin.");
  const activated = await activateLicenseRecord(licenseId, holderId, adminId);
  if (!activated) throw new ActionError("Bu kayıt artık eşleşme beklemiyor; sayfayı yenileyin.");
  return { holderId };
}

export async function ignorePending(licenseId: number, adminId: number, note: string) {
  const result = await prisma.shopierOrderLicense.updateMany({
    where: { id: licenseId, status: ShopierLicenseStatus.PENDING_MATCH },
    data: { status: ShopierLicenseStatus.IGNORED, activatedById: adminId, note: note.slice(0, 500) || "Süper admin tarafından yok sayıldı." },
  });
  if (result.count !== 1) throw new ActionError("Bu kayıt artık eşleşme beklemiyor; sayfayı yenileyin.");
}

/**
 * Called after sign-up: opens every license waiting for this email. Never throws on a single
 * failed row so registration is not blocked; returns how many were activated.
 */
export async function claimPendingLicensesForEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return 0;
  const pending = await prisma.shopierOrderLicense.findMany({
    where: { status: ShopierLicenseStatus.PENDING_MATCH, order: { buyerEmail: normalized } },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  if (pending.length === 0) return 0;
  const holderId = await resolveHolderForEmail(normalized);
  if (!holderId) return 0;
  let activated = 0;
  for (const license of pending) {
    try {
      if (await activateLicenseRecord(license.id, holderId, null)) activated += 1;
    } catch (error) {
      console.error("[commerce] pending license claim failed", { licenseId: license.id, code: error && typeof error === "object" && "code" in error ? error.code : null });
    }
  }
  return activated;
}
