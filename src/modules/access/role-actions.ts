"use server";

import { ActionError } from "@/lib/action-error";
import { runFormAction } from "@/lib/run-form-action";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CompanyMembershipStatus } from "@/generated/prisma/client";
import { assertPermission } from "@/lib/authorization";
import { ALL_PERMISSIONS, permissionModule, PERMISSIONS } from "@/lib/permission-catalog";
import { moduleLabel } from "@/lib/module-catalog";
import { prisma } from "@/lib/prisma";
import { membershipModuleRows } from "@/lib/role-module-sync";
import { companyRoleDeletionMessage } from "@/lib/company-role-policy";
import { requireSessionUser } from "@/lib/session";
import { value, moduleKeys, validateModuleSelection, validateDelegatedModules, validatePermissionsForModules } from "@/modules/access/action-helpers";

export async function createCompanyRoleAction(formData: FormData) {
  return runFormAction(() => createCompanyRoleActionImpl(formData));
}

async function createCompanyRoleActionImpl(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.ACCESS_MANAGE);
  if (!authorization.companyId) throw new ActionError("Aktif firma seçilmedi.");
  const name = value(formData, "name"); const description = value(formData, "description"); const requested = formData.getAll("permissions").filter((item): item is string => typeof item === "string" && ALL_PERMISSIONS.includes(item as never));
  const selectedModuleKeys = moduleKeys(formData); validateModuleSelection(selectedModuleKeys); validateDelegatedModules(selectedModuleKeys, authorization.modules, authorization.isPlatformAdmin);
  if (!name || requested.length === 0) throw new ActionError("Rol adı ve en az bir izin zorunludur.");
  if (requested.some((permission) => !authorization.permissions.has(permission))) throw new ActionError("Sahip olmadığınız izni role ekleyemezsiniz.");
  validatePermissionsForModules(requested, selectedModuleKeys);
  const role = await prisma.$transaction(async (tx) => {
    const created = await tx.companyRole.create({ data: { companyId: authorization.companyId!, key: `CUSTOM_${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`, name, description: description || null, modules: { create: selectedModuleKeys.map((moduleKey) => ({ moduleKey })) } } });
    await tx.companyRolePermission.createMany({ data: requested.map((permission) => ({ roleId: created.id, permission })) });
    await tx.companyAccessAudit.create({ data: { companyId: authorization.companyId!, actorUserId: user.id, action: "ROLE_CREATED", summary: `${name} özel rolü ${selectedModuleKeys.map(moduleLabel).join(", ")} modülleri için oluşturuldu.`, metadataJson: JSON.stringify({ permissions: requested, moduleKeys: selectedModuleKeys }) } });
    return created;
  });
  revalidatePath("/dashboard/access/roles"); redirect(`/dashboard/access/roles?created=${role.id}`);
}

export async function updateCompanyRoleAction(formData: FormData) {
  return runFormAction(() => updateCompanyRoleActionImpl(formData));
}

async function updateCompanyRoleActionImpl(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.ACCESS_MANAGE);
  if (!authorization.companyId) throw new ActionError("Aktif firma seçilmedi.");
  const roleId = Number(value(formData, "roleId")); const name = value(formData, "name"); const description = value(formData, "description"); const isActive = formData.get("isActive") === "on"; const requested = formData.getAll("permissions").filter((item): item is string => typeof item === "string" && ALL_PERMISSIONS.includes(item as never));
  const selectedModuleKeys = moduleKeys(formData); validateDelegatedModules(selectedModuleKeys, authorization.modules, authorization.isPlatformAdmin);
  const role = await prisma.companyRole.findFirst({ where: { id: roleId, companyId: authorization.companyId }, include: { modules: true, permissions: true, memberships: { select: { id: true, status: true } } } });
  if (!role || !name) throw new ActionError("Rol bulunamadı.");
  if (role.key === "OWNER") throw new ActionError("Firma sahibi rolü korumalıdır. Modül lisanslarını süper admin kullanıcı ekranından değiştirin.");
  if (role.key === "OWNER" && !isActive) throw new ActionError("Firma sahibi rolü pasifleştirilemez.");
  if (requested.some((permission) => !authorization.permissions.has(permission))) throw new ActionError("Sahip olmadığınız izni role ekleyemezsiniz.");
  validatePermissionsForModules(requested, selectedModuleKeys);
  if (!isActive && role.memberships.some((membership) => membership.status === CompanyMembershipStatus.ACTIVE)) throw new ActionError("Aktif üyesi bulunan rol önce üyelerden kaldırılmalıdır; erişim sessizce başka role genişletilmez.");
  // Hidden, unlicensed modules are suspended, not deleted by edits to visible modules.
  const dormantModules = role.modules.map((item) => item.moduleKey).filter((key) =>
    !authorization.isPlatformAdmin && !(authorization.companyModules ?? authorization.modules).has(key));
  const savedModules = [...new Set([...selectedModuleKeys, ...dormantModules])];
  const savedPermissions = [...new Set([...requested, ...role.permissions
    .filter((item) => dormantModules.includes(permissionModule(item.permission) ?? ""))
    .map((item) => item.permission)])];
  await prisma.$transaction(async (tx) => {
    await tx.companyRole.update({ where: { id: role.id }, data: { name, description: description || null, isActive } });
    await tx.companyRolePermission.deleteMany({ where: { roleId: role.id } });
    if (savedPermissions.length) await tx.companyRolePermission.createMany({ data: savedPermissions.map((permission) => ({ roleId: role.id, permission })) });
    await tx.companyRoleModule.deleteMany({ where: { roleId: role.id } });
    if (savedModules.length) await tx.companyRoleModule.createMany({ data: savedModules.map((moduleKey) => ({ roleId: role.id, moduleKey })) });
    const membershipIds = role.memberships.map((membership) => membership.id);
    if (membershipIds.length) {
      await tx.membershipModule.deleteMany({ where: { membershipId: { in: membershipIds } } });
      if (savedModules.length) await tx.membershipModule.createMany({ data: membershipModuleRows(membershipIds, savedModules) });
    }
    await tx.companyMembership.updateMany({ where: { roleId: role.id }, data: { sessionVersion: { increment: 1 } } });
    await tx.companyAccessAudit.create({ data: { companyId: authorization.companyId!, actorUserId: user.id, action: "ROLE_UPDATED", summary: `${name} rolü güncellendi.`, metadataJson: JSON.stringify({ permissions: requested, moduleKeys: selectedModuleKeys, isActive }) } });
  });
  revalidatePath("/dashboard/access/roles");
  revalidatePath("/dashboard", "layout");
}

export async function deleteCompanyRoleAction(formData: FormData) {
  return runFormAction(() => deleteCompanyRoleActionImpl(formData));
}

async function deleteCompanyRoleActionImpl(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.ACCESS_MANAGE);
  if (!authorization.companyId) throw new ActionError("Aktif firma seçilmedi.");
  const roleId = Number(value(formData, "roleId"));
  const role = await prisma.companyRole.findFirst({ where: { id: roleId, companyId: authorization.companyId }, include: { _count: { select: { memberships: true } } } });
  if (!role) throw new ActionError("Rol bulunamadı.");
  const deletionMessage = companyRoleDeletionMessage(role._count.memberships);
  if (deletionMessage) throw new ActionError(deletionMessage);
  await prisma.$transaction(async (tx) => {
    await tx.companyInvitation.deleteMany({ where: { roleId: role.id } });
    await tx.companyRole.delete({ where: { id: role.id } });
    await tx.companyAccessAudit.create({ data: { companyId: authorization.companyId!, actorUserId: user.id, action: "ROLE_DELETED", summary: `${role.name} rolü silindi.` } });
  });
  revalidatePath("/dashboard/access/roles"); redirect("/dashboard/access/roles");
}
