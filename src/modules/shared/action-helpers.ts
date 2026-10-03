import { redirect } from "next/navigation";
import { Role } from "@/generated/prisma/client";
import { ActionError } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";

export function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function getStringList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function parseIdValue(value: string, fieldName: string) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ActionError(`${fieldName} bilgisi gecersiz.`);
  return id;
}

export function getId(formData: FormData, key: string) {
  return parseIdValue(getString(formData, key), key);
}

export function getOptionalId(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value ? parseIdValue(value, key) : null;
}

export function getIdList(formData: FormData, key: string) {
  return getStringList(formData, key).map((value) => parseIdValue(value, key));
}

export function normalizeOptionalEmail(email: string) {
  return email ? email.toLowerCase() : null;
}

export function normalizeOptionalRfidCardId(cardId: string) {
  return cardId ? cardId.toUpperCase() : null;
}

export const defaultRoleNames: Record<Role, string> = {
  SUPERADMIN: "Super Admin",
  COMPANY_ADMIN: "Firma Admin",
  EMPLOYEE: "Personel",
};

export async function getAssignableRole(formData: FormData) {
  const role = getString(formData, "role") as Role;
  if (!new Set<string>(Object.values(Role)).has(role)) throw new ActionError("Rol bilgisi gecersiz.");

  const configuredRoles = await prisma.roleDefinition.findMany({ where: { isActive: true }, select: { code: true } });
  if (configuredRoles.length > 0 && !configuredRoles.some((item) => item.code === role)) {
    throw new ActionError("Secilen rol aktif degil.");
  }
  return role;
}

export async function assertSuperadminUser() {
  const { user } = await requireSessionUser();
  if (user.role !== Role.SUPERADMIN) throw new ActionError("Bu işlem için süper admin yetkisi gerekiyor.");
  return user;
}

export function getOptionalDate(formData: FormData, key: string) {
  const value = getString(formData, key);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getOptionalNumber(formData: FormData, key: string) {
  const value = getString(formData, key);
  if (!value) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function getRequiredDate(formData: FormData, key: string) {
  const date = getOptionalDate(formData, key);
  if (!date) throw new ActionError("Tarih bilgisi gecersiz.");
  return date;
}

export function getReturnTo(formData: FormData) {
  const returnTo = getString(formData, "returnTo");
  return returnTo.startsWith("/dashboard") ? returnTo : "";
}

export function redirectToReturnPath(formData: FormData, fallback?: string) {
  redirect(getReturnTo(formData) || fallback || "/dashboard");
}
