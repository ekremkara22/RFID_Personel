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
