import "server-only";

import { ActionError } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret, parseEncryptionKey, SecretKeyError, secretLast4 } from "./secret-box";

/**
 * Encrypted integration secret store (IntegrationCredential). Values never leave the server:
 * pages only receive getCredentialStatus() (configured flag, last4, updatedAt).
 */
export const SHOPIER_PROVIDER = "SHOPIER";
export const SHOPIER_API_TOKEN_KEY = "API_TOKEN";
export const SHOPIER_WEBHOOK_KEY_PREFIX = "WEBHOOK:";

export function shopierWebhookKey(event: string) {
  return `${SHOPIER_WEBHOOK_KEY_PREFIX}${event}`;
}

export type CredentialStatus = { configured: boolean; last4: string | null; updatedAt: Date | null };

function encryptionKey() {
  try {
    return parseEncryptionKey(process.env.INTEGRATION_ENCRYPTION_KEY);
  } catch (error) {
    if (error instanceof SecretKeyError) throw new ActionError(error.message);
    throw error;
  }
}

function context(provider: string, key: string) {
  return `${provider}:${key}`;
}

export async function setCredential(provider: string, key: string, value: string, userId: number | null, options: { maskable?: boolean } = {}) {
  if (!value) throw new ActionError("Kaydedilecek değer boş olamaz.");
  const encryptedValue = encryptSecret(value, encryptionKey(), context(provider, key));
  const last4 = options.maskable === false ? null : secretLast4(value);
  await prisma.integrationCredential.upsert({
    where: { provider_key: { provider, key } },
    create: { provider, key, encryptedValue, last4, updatedById: userId },
    update: { encryptedValue, last4, updatedById: userId },
  });
}

export async function getCredential(provider: string, key: string): Promise<string | null> {
  const row = await prisma.integrationCredential.findUnique({ where: { provider_key: { provider, key } }, select: { encryptedValue: true } });
  if (!row) return null;
  const secretKey = encryptionKey();
  try {
    return decryptSecret(row.encryptedValue, secretKey, context(provider, key));
  } catch {
    throw new ActionError("Kayıtlı entegrasyon bilgisi çözülemedi; şifreleme anahtarı değişmiş olabilir. Bilgiyi yeniden girin.");
  }
}

export async function deleteCredential(provider: string, key: string) {
  await prisma.integrationCredential.deleteMany({ where: { provider, key } });
}

export async function getCredentialStatus(provider: string, key: string): Promise<CredentialStatus> {
  const row = await prisma.integrationCredential.findUnique({ where: { provider_key: { provider, key } }, select: { last4: true, updatedAt: true } });
  return { configured: !!row, last4: row?.last4 ?? null, updatedAt: row?.updatedAt ?? null };
}

/** Status rows whose key starts with `prefix` (e.g. every Shopier webhook subscription). */
export async function listCredentialStatuses(provider: string, prefix: string) {
  const rows = await prisma.integrationCredential.findMany({
    where: { provider, key: { startsWith: prefix } },
    select: { key: true, updatedAt: true },
    orderBy: { key: "asc" },
  });
  return rows.map((row) => ({ key: row.key, updatedAt: row.updatedAt }));
}

export function isEncryptionKeyConfigured() {
  try {
    parseEncryptionKey(process.env.INTEGRATION_ENCRYPTION_KEY);
    return true;
  } catch {
    return false;
  }
}
