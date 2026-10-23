/** License changes never erase role definitions. Reopening restores configured access. */
export function licensedModules(roleKey: string, roleModules: string[], companyLicenses: string[]): Set<string> {
  const licensed = new Set(companyLicenses);
  return new Set(roleKey === "OWNER" ? companyLicenses : roleModules.filter((key) => licensed.has(key)));
}

import { permissionModule } from "./permission-catalog";
import { MODULE_NEUTRAL_PERMISSIONS, type AuthorizationContext } from "./authorization-scope";
import { ALL_MODULE_KEYS } from "./module-catalog";
import { getAppDayKey, getAppDayRange } from "./app-time";

export const TRIAL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export type LicenseHolder = {
  trialEndsAt: Date | null;
  moduleEntitlements: { moduleKey: string; expiresAt: Date | null }[];
};

export function trialEndDate(start: Date) {
  return new Date(start.getTime() + TRIAL_DAYS * DAY_MS);
}

export function isTrialActive(holder: Pick<LicenseHolder, "trialEndsAt">, now = new Date()) {
  return !!holder.trialEndsAt && holder.trialEndsAt.getTime() > now.getTime();
}

/** Remaining whole days, rounded up so the last partial day still counts as one. */
export function trialDaysLeft(holder: Pick<LicenseHolder, "trialEndsAt">, now = new Date()) {
  if (!isTrialActive(holder, now)) return 0;
  return Math.ceil((holder.trialEndsAt!.getTime() - now.getTime()) / DAY_MS);
}

export function isEntitlementActive(entitlement: { expiresAt: Date | null }, now = new Date()) {
  return !entitlement.expiresAt || entitlement.expiresAt.getTime() > now.getTime();
}

/** Purchased/assigned licenses that are still valid, independent of the trial. */
export function activeEntitlementKeys(holder: Pick<LicenseHolder, "moduleEntitlements">, now = new Date()) {
  return holder.moduleEntitlements.filter((item) => isEntitlementActive(item, now)).map((item) => item.moduleKey);
}

/** The trial opens every module; after it ends only active licenses remain. */
export function effectiveLicenseKeys(holder: LicenseHolder, now = new Date()): string[] {
  const keys = new Set(activeEntitlementKeys(holder, now));
  if (isTrialActive(holder, now)) for (const key of ALL_MODULE_KEYS) keys.add(key);
  return [...keys];
}

export type LicenseState = "TRIAL" | "TRIAL_EXPIRED" | "LICENSED" | "NO_LICENSE";

export function licenseState(holder: LicenseHolder, now = new Date()): LicenseState {
  if (activeEntitlementKeys(holder, now).length) return isTrialActive(holder, now) ? "TRIAL" : "LICENSED";
  if (isTrialActive(holder, now)) return "TRIAL";
  return holder.trialEndsAt ? "TRIAL_EXPIRED" : "NO_LICENSE";
}

type RoleDefinition = { key: string; modules: { moduleKey: string }[]; permissions: { permission: string }[] };

export function assignableRoleModules(role: RoleDefinition, authorization: AuthorizationContext) {
  const companyModules = authorization.companyModules ?? authorization.modules;
  return role.modules.map((item) => item.moduleKey).filter((key) => authorization.isPlatformAdmin || companyModules.has(key));
}

export function canDelegateRole(role: RoleDefinition, authorization: AuthorizationContext) {
  if (role.key === "OWNER") return false;
  if (authorization.isPlatformAdmin) return true;
  const modules = assignableRoleModules(role, authorization);
  return modules.every((key) => authorization.modules.has(key)) && role.permissions.every(({ permission }) => {
    const moduleKey = permissionModule(permission);
    if (moduleKey && !MODULE_NEUTRAL_PERMISSIONS.has(permission) && !modules.includes(moduleKey)) return true;
    return authorization.permissions.has(permission);
  });
}

/** "YYYY-MM-DD" means valid through that Türkiye day, so the stored instant is the next midnight. */
export function licenseDateFromInput(value: string): Date | null | undefined {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const range = getAppDayRange(value);
  return getAppDayKey(range.start) === value ? range.end : undefined;
}

export function licenseDateToInput(date: Date | null) {
  return date ? getAppDayKey(new Date(date.getTime() - 1)) : "";
}
