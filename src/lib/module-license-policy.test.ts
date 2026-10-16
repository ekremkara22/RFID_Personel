import { test } from "node:test";
import assert from "node:assert/strict";
import { licensedModules, canDelegateRole } from "./module-license-policy";
import { can, type AuthorizationContext } from "./authorization-scope";
import { ALL_PERMISSIONS, PERMISSIONS } from "./permission-catalog";
import { CompanyMembershipStatus, DataScopeMode } from "@/generated/prisma/client";

function context(licenses: string[], modules = licenses): AuthorizationContext {
  return { isPlatformAdmin: false, userId: 1, companyId: 1, membershipId: 1, membershipStatus: CompanyMembershipStatus.ACTIVE, sessionVersion: 1, roleKey: "ADMIN", roleName: "Yönetici", permissions: new Set(ALL_PERMISSIONS), companyModules: new Set(licenses), modules: new Set(modules), scopeMode: DataScopeMode.COMPANY, employeeId: null, branchIds: [], departmentIds: [], employeeIds: [], deviceIds: [], teamEmployeeIds: [] };
}

test("lisans kapatılıp açıldığında alt kullanıcının rolü korunur ve erişimi geri gelir", () => {
  const roleModules = ["HR", "PRODUCTION_PLANNING"];
  for (const licenses of [roleModules, ["HR"], [], roleModules]) {
    const auth = { ...context(licenses), modules: licensedModules("CUSTOM", roleModules, licenses) };
    assert.equal(can(auth, PERMISSIONS.WORK_CENTER_VIEW), licenses.includes("PRODUCTION_PLANNING"));
    assert.equal(can(auth, PERMISSIONS.PERSONNEL_VIEW), licenses.includes("HR"));
  }
  assert.deepEqual(roleModules, ["HR", "PRODUCTION_PLANNING"]);
});

test("firma sahibi yeni açılan modülü eski rol modüllerinden bağımsız alır", () => {
  assert.deepEqual([...licensedModules("OWNER", ["HR"], ["PRODUCTION_PLANNING"])], ["PRODUCTION_PLANNING"]);
  assert.equal(licensedModules("OWNER", ["HR"], []).size, 0);
});

test("kapalı modülün kayıtlı izinleri açık modüldeki rol atamasını engellemez", () => {
  const role = { key: "CUSTOM", modules: [{ moduleKey: "HR" }, { moduleKey: "PRODUCTION_PLANNING" }], permissions: [{ permission: PERMISSIONS.PERSONNEL_VIEW }, { permission: PERMISSIONS.WORK_CENTER_VIEW }] };
  const auth = context(["HR"]);
  auth.permissions.delete(PERMISSIONS.WORK_CENTER_VIEW);
  assert.equal(canDelegateRole(role, auth), true);
  assert.equal(canDelegateRole(role, context(["HR", "PRODUCTION_PLANNING"], ["HR"])), false);
  assert.equal(canDelegateRole({ ...role, key: "OWNER" }, auth), false);
});

test("lisans veya rol olmadan modül erişimi verilmez", () => {
  assert.equal(licensedModules("CUSTOM", ["HR"], []).size, 0);
  assert.equal(licensedModules("CUSTOM", [], ["HR"]).size, 0);
  assert.equal(licensedModules("CUSTOM", ["PRODUCTION_PLANNING"], ["HR"]).size, 0);
});

test("deneme süresi boyunca tüm modüller açıktır, süre bitince yalnız geçerli lisanslar kalır", async () => {
  const { effectiveLicenseKeys, licenseState, trialDaysLeft, trialEndDate } = await import("./module-license-policy");
  const { ALL_MODULE_KEYS } = await import("./module-catalog");
  const start = new Date("2026-10-01T09:00:00Z");
  const holder = { trialEndsAt: trialEndDate(start), moduleEntitlements: [] as { moduleKey: string; expiresAt: Date | null }[] };

  assert.deepEqual(effectiveLicenseKeys(holder, start).sort(), [...ALL_MODULE_KEYS].sort());
  assert.equal(trialDaysLeft(holder, start), 14);
  assert.equal(licenseState(holder, start), "TRIAL");

  const afterTrial = new Date("2026-10-15T09:00:01Z");
  assert.deepEqual(effectiveLicenseKeys(holder, afterTrial), []);
  assert.equal(licenseState(holder, afterTrial), "TRIAL_EXPIRED");

  holder.moduleEntitlements.push({ moduleKey: "HR", expiresAt: null }, { moduleKey: "ACCOUNTING", expiresAt: new Date("2026-10-10T00:00:00Z") });
  assert.deepEqual(effectiveLicenseKeys(holder, afterTrial), ["HR"]);
  assert.equal(licenseState(holder, afterTrial), "LICENSED");
});

test("deneme kaydı olmayan mevcut kullanıcıların lisansları değişmez", async () => {
  const { effectiveLicenseKeys, licenseState } = await import("./module-license-policy");
  const holder = { trialEndsAt: null, moduleEntitlements: [{ moduleKey: "HR", expiresAt: null }, { moduleKey: "PRODUCTION_PLANNING", expiresAt: null }] };
  assert.deepEqual(effectiveLicenseKeys(holder), ["HR", "PRODUCTION_PLANNING"]);
  assert.equal(licenseState(holder), "LICENSED");
  assert.equal(licenseState({ trialEndsAt: null, moduleEntitlements: [] }), "NO_LICENSE");
});

test("lisans bitiş tarihi seçilen günün sonuna kadar geçerlidir", async () => {
  const { licenseDateFromInput, licenseDateToInput } = await import("./module-license-policy");
  const end = licenseDateFromInput("2026-10-27")!;
  assert.equal(end.toISOString(), "2026-10-27T21:00:00.000Z");
  assert.equal(licenseDateToInput(end), "2026-10-27");
  assert.equal(licenseDateFromInput(""), null);
  assert.equal(licenseDateFromInput("2026-02-30"), undefined);
  assert.equal(licenseDateFromInput("27.10.2026"), undefined);
});

test("deneme erişimi ücretli lisans sayılmaz; yalnız geçerli lisans ücretli özellikleri açar", async () => {
  const { effectiveLicenseKeys, hasPaidModuleLicense, trialEndDate } = await import("./module-license-policy");
  const now = new Date("2026-10-05T09:00:00Z");
  const holder = { trialEndsAt: trialEndDate(new Date("2026-10-01T09:00:00Z")), moduleEntitlements: [] as { moduleKey: string; expiresAt: Date | null }[] };
  assert.ok(effectiveLicenseKeys(holder, now).includes("ACCOUNTING"));
  assert.equal(hasPaidModuleLicense(holder, "ACCOUNTING", now), false);

  holder.moduleEntitlements.push({ moduleKey: "HR", expiresAt: null });
  assert.equal(hasPaidModuleLicense(holder, "ACCOUNTING", now), false);

  holder.moduleEntitlements.push({ moduleKey: "ACCOUNTING", expiresAt: new Date("2026-11-01T00:00:00Z") });
  assert.equal(hasPaidModuleLicense(holder, "ACCOUNTING", now), true);
  assert.equal(hasPaidModuleLicense(holder, "ACCOUNTING", new Date("2026-11-01T00:00:01Z")), false);
  assert.equal(hasPaidModuleLicense({ moduleEntitlements: [{ moduleKey: "ACCOUNTING", expiresAt: null }] }, "ACCOUNTING", now), true);
});
