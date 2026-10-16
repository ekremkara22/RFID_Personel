import "server-only";

import { findCompanyLicensePrincipal } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import type { AuthorizationContext } from "@/lib/authorization-scope";
import { hasPaidModuleLicense, type LicenseHolder } from "@/lib/module-license-policy";

export type SessionLicense = {
  holderUserId: number;
  holderEmail: string;
  isPrincipal: boolean;
  selfRegistered: boolean;
  holder: LicenseHolder;
};

const holderSelect = {
  id: true,
  email: true,
  selfRegistered: true,
  trialEndsAt: true,
  moduleEntitlements: { select: { moduleKey: true, expiresAt: true } },
} as const;

/** Licenses that govern what the signed-in user sees: the company owner's, or their own before a company exists. */
export async function getSessionLicense(userId: number, companyId: number | null): Promise<SessionLicense | null> {
  const principal = companyId ? await findCompanyLicensePrincipal(companyId) : null;
  const holderUserId = principal?.userId ?? userId;
  const holder = await prisma.user.findUnique({ where: { id: holderUserId }, select: holderSelect });
  if (!holder) return null;
  return {
    holderUserId,
    holderEmail: holder.email,
    isPrincipal: holderUserId === userId,
    selfRegistered: holder.selfRegistered,
    holder: { trialEndsAt: holder.trialEndsAt, moduleEntitlements: holder.moduleEntitlements },
  };
}

/**
 * Whether the company's license holder has bought the module, not merely trialled it.
 * Platform admins are never limited. Locks paid-only features such as Muhasebe CSV/PDF transfer.
 */
export async function hasPaidLicenseFor(authorization: Pick<AuthorizationContext, "isPlatformAdmin" | "userId" | "companyId">, moduleKey: string) {
  if (authorization.isPlatformAdmin) return true;
  const license = await getSessionLicense(authorization.userId, authorization.companyId);
  return !!license && hasPaidModuleLicense(license.holder, moduleKey);
}
