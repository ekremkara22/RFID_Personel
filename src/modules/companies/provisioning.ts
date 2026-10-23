import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { READY_COMPANY_ROLES } from "@/lib/permission-catalog";
import { defaultRoleModules } from "@/lib/module-catalog";

type Tx = Prisma.TransactionClient;

/** Creates the ready system roles of a new company and returns the OWNER role id. */
export async function createReadyCompanyRoles(tx: Tx, companyId: number, moduleKeys: string[]) {
  let ownerRoleId = 0;
  for (const definition of READY_COMPANY_ROLES) {
    const roleModuleKeys = defaultRoleModules(definition.key).filter((moduleKey) => moduleKeys.includes(moduleKey));
    const role = await tx.companyRole.create({ data: { companyId, key: definition.key, name: definition.name, description: definition.description, isSystem: true, permissions: { create: definition.permissions.map((permission) => ({ permission })) }, modules: { create: roleModuleKeys.map((moduleKey) => ({ moduleKey })) } } });
    if (definition.key === "OWNER") ownerRoleId = role.id;
  }
  return ownerRoleId;
}

/** Makes an existing company admin the owner of a new company they created themselves (store flow or self sign-up). */
export async function provisionOwnedCompany(tx: Tx, params: { userId: number; companyId: number; moduleKeys: string[] }) {
  const ownerRoleId = await createReadyCompanyRoles(tx, params.companyId, params.moduleKeys);
  await tx.user.update({ where: { id: params.userId }, data: { companyId: params.companyId } });
  await tx.userCompanyAccess.create({ data: { userId: params.userId, companyId: params.companyId } });
  await tx.companyMembership.create({ data: { userId: params.userId, companyId: params.companyId, roleId: ownerRoleId, status: "ACTIVE", scopeMode: "COMPANY", modules: { create: params.moduleKeys.map((moduleKey) => ({ moduleKey })) } } });
}
