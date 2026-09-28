import assert from "node:assert/strict";
import test from "node:test";
import { CompanyMembershipStatus, DataScopeMode } from "@/generated/prisma/client";
import { can, employeeScopeWhere, type AuthorizationContext } from "@/lib/authorization-scope";
import { PERMISSIONS, READY_COMPANY_ROLES } from "@/lib/permission-catalog";

function context(overrides: Partial<AuthorizationContext> = {}): AuthorizationContext {
  return { isPlatformAdmin: false, userId: 7, companyId: 10, membershipId: 2, membershipStatus: CompanyMembershipStatus.ACTIVE, sessionVersion: 1, roleKey: "TEST", roleName: "Test", permissions: new Set([PERMISSIONS.PERSONNEL_VIEW]), scopeMode: DataScopeMode.NONE, employeeId: null, branchIds: [], departmentIds: [], employeeIds: [], deviceIds: [], teamEmployeeIds: [], ...overrides };
}

test("boş kısıtlı kapsam hiçbir zaman sınırsız erişime dönüşmez", () => {
  assert.deepEqual(employeeScopeWhere(context({ scopeMode: DataScopeMode.RESTRICTED })), { id: -1 });
});

test("aynı tür değerler birleşir, farklı kapsam türleri kesişir", () => {
  assert.deepEqual(employeeScopeWhere(context({ scopeMode: DataScopeMode.RESTRICTED, branchIds: [1, 2], departmentIds: [8] })), { companyId: 10, AND: [{ branchId: { in: [1, 2] } }, { departmentId: { in: [8] } }] });
});

test("çalışan yalnız bağlı personel kaydını görür", () => {
  assert.deepEqual(employeeScopeWhere(context({ scopeMode: DataScopeMode.OWN, employeeId: 55 })), { companyId: 10, id: 55 });
  assert.deepEqual(employeeScopeWhere(context({ scopeMode: DataScopeMode.OWN, employeeId: null })), { id: -1 });
});

test("izin kodları birbirinden bağımsızdır", () => {
  const viewer = context({ permissions: new Set([PERMISSIONS.REPORT_VIEW]) });
  assert.equal(can(viewer, PERMISSIONS.REPORT_VIEW), true);
  assert.equal(can(viewer, PERMISSIONS.REPORT_EXPORT), false);
  assert.equal(can(viewer, PERMISSIONS.MOVEMENT_UPDATE), false);
});

test("muhasebe rolü rapor dışa aktarabilir ancak hareket değiştiremez", () => {
  const payroll = READY_COMPANY_ROLES.find((role) => role.key === "PAYROLL")!;
  assert.equal((payroll.permissions as readonly string[]).includes(PERMISSIONS.REPORT_EXPORT), true);
  assert.equal((payroll.permissions as readonly string[]).includes(PERMISSIONS.MOVEMENT_UPDATE), false);
});

test("teknik cihaz rolü personel ve yetki yönetimi içermez", () => {
  const technician = READY_COMPANY_ROLES.find((role) => role.key === "DEVICE_TECH")!;
  assert.equal((technician.permissions as readonly string[]).includes(PERMISSIONS.DEVICE_VIEW), true);
  assert.equal((technician.permissions as readonly string[]).includes(PERMISSIONS.PERSONNEL_VIEW), false);
  assert.equal((technician.permissions as readonly string[]).includes(PERMISSIONS.ACCESS_MANAGE), false);
});
