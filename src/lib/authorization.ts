import { CompanyMembershipStatus, DataScopeMode } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ALL_PERMISSIONS } from "@/lib/permission-catalog";
import { ALL_MODULE_KEYS } from "@/lib/module-catalog";
import type { AuthorizationContext } from "@/lib/authorization-scope";
export * from "@/lib/authorization-scope";

export async function getAuthorizationContext(user: { id: number; role: string }, requestedCompanyId?: number | null): Promise<AuthorizationContext> {
  if (user.role === "SUPERADMIN") {
    return { isPlatformAdmin: true, userId: user.id, companyId: requestedCompanyId ?? null, membershipId: null, membershipStatus: null, sessionVersion: 1, roleKey: "PLATFORM_ADMIN", roleName: "Platform yöneticisi", permissions: new Set(ALL_PERMISSIONS), modules: new Set<string>(ALL_MODULE_KEYS), scopeMode: DataScopeMode.COMPANY, employeeId: null, branchIds: [], departmentIds: [], employeeIds: [], deviceIds: [], teamEmployeeIds: [] };
  }

  const memberships = await prisma.companyMembership.findMany({
    where: { userId: user.id, status: CompanyMembershipStatus.ACTIVE, company: { isActive: true }, role: { isActive: true } },
    include: {
      role: { include: { permissions: true } },
      branchScopes: true,
      departmentScopes: true,
      employeeScopes: true,
      deviceScopes: true,
      teamScopes: { include: { team: { include: { members: true } } } },
      modules: true,
    },
    orderBy: { id: "asc" },
  });
  const membership = memberships.find((item) => item.companyId === requestedCompanyId) ?? memberships[0];
  if (!membership) {
    const entitlements = await prisma.userModuleEntitlement.findMany({
      where: { userId: user.id },
      select: { moduleKey: true },
    });
    return { isPlatformAdmin: false, userId: user.id, companyId: null, membershipId: null, membershipStatus: null, sessionVersion: 0, roleKey: "PENDING_COMPANY_OWNER", roleName: "Firma yöneticisi", permissions: new Set(), modules: new Set(entitlements.map((item) => item.moduleKey)), scopeMode: DataScopeMode.NONE, employeeId: null, branchIds: [], departmentIds: [], employeeIds: [], deviceIds: [], teamEmployeeIds: [] };
  }
  return {
    isPlatformAdmin: false,
    userId: user.id,
    companyId: membership.companyId,
    membershipId: membership.id,
    membershipStatus: membership.status,
    sessionVersion: membership.sessionVersion,
    roleKey: membership.role.key,
    roleName: membership.role.name,
    permissions: new Set(membership.role.permissions.map((item) => item.permission)),
    modules: new Set(membership.modules.map((item) => item.moduleKey)),
    scopeMode: membership.scopeMode,
    employeeId: membership.employeeId,
    branchIds: membership.branchScopes.map((item) => item.branchId),
    departmentIds: membership.departmentScopes.map((item) => item.departmentId),
    employeeIds: membership.employeeScopes.map((item) => item.employeeId),
    deviceIds: membership.deviceScopes.map((item) => item.deviceId),
    teamEmployeeIds: [...new Set(membership.teamScopes.flatMap((item) => item.team.members.map((member) => member.employeeId)))],
  };
}

