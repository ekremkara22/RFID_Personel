"use server";

import { ActionError } from "@/lib/action-error";
import { runFormAction } from "@/lib/run-form-action";
import { assignableRoleModules, canDelegateRole } from "@/lib/module-license-policy";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CompanyMembershipStatus, DataScopeMode, Role } from "@/generated/prisma/client";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { ALL_MODULE_KEYS, moduleLabel } from "@/lib/module-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { value, ids, normalizeEmail, normalizeUsername, validateModuleSelection, validateDelegatedModules, validateScopeIds } from "@/modules/access/action-helpers";

export async function createCompanyUserAction(formData: FormData) {
  return runFormAction(() => createCompanyUserActionImpl(formData));
}

async function createCompanyUserActionImpl(formData: FormData) {
  const { user, authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.ACCESS_MANAGE);
  if (!authorization.companyId) throw new ActionError("Aktif firma seçilmedi.");

  const firstName = value(formData, "firstName");
  const lastName = value(formData, "lastName");
  const username = normalizeUsername(value(formData, "username"));
  const email = normalizeEmail(value(formData, "email"));
  const phone = value(formData, "phone");
  const password = value(formData, "password");
  const roleId = Number(value(formData, "roleId"));
  const scopeMode = value(formData, "scopeMode") as DataScopeMode;
  const employeeId = Number(value(formData, "employeeId")) || null;
  if (!firstName || !lastName || !email.includes("@") || password.length < 10 || !/^[a-z0-9._-]{3,64}$/.test(username)) {
    throw new ActionError("Ad, soyad, geçerli e-posta, en az 3 karakter kullanıcı adı ve en az 10 karakter şifre zorunludur.");
  }
  if (!Object.values(DataScopeMode).includes(scopeMode)) throw new ActionError("Veri kapsamı geçersiz.");

  const role = await prisma.companyRole.findFirst({ where: { id: roleId, companyId: authorization.companyId, isActive: true }, include: { permissions: true, modules: true } });
  if (!role || role.key === "OWNER") throw new ActionError("Firma sahibi rolü bu formdan atanamaz.");
  const selectedModuleKeys = assignableRoleModules(role, authorization);
  validateModuleSelection(selectedModuleKeys);
  validateDelegatedModules(selectedModuleKeys, authorization.modules, authorization.isPlatformAdmin);
  if (!canDelegateRole(role, authorization)) throw new ActionError("Sahip olmadığınız bir yetkiyi devredemezsiniz.");

  const branchIds = ids(formData, "branchIds"); const departmentIds = ids(formData, "departmentIds"); const employeeIds = ids(formData, "employeeIds"); const deviceIds = ids(formData, "deviceIds"); const teamIds = ids(formData, "teamIds");
  await validateScopeIds(authorization.companyId, branchIds, departmentIds, employeeIds, deviceIds, teamIds);
  if (employeeId && !(await prisma.employee.findFirst({ where: { id: employeeId, companyId: authorization.companyId }, select: { id: true } }))) throw new ActionError("Bağlı personel bu firmaya ait değil.");
  const duplicate = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] }, select: { email: true, username: true } });
  if (duplicate) throw new ActionError(duplicate.email === email ? "Bu e-posta zaten kullanılıyor." : "Bu kullanıcı adı zaten kullanılıyor.");

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { firstName, lastName, name: `${firstName} ${lastName}`.trim(), username, email, phone: phone || null, password: passwordHash, role: Role.COMPANY_ADMIN, companyId: authorization.companyId } });
    await tx.userCompanyAccess.create({ data: { userId: created.id, companyId: authorization.companyId! } });
    const membership = await tx.companyMembership.create({ data: { userId: created.id, companyId: authorization.companyId!, roleId, status: CompanyMembershipStatus.ACTIVE, scopeMode, employeeId } });
    await tx.membershipModule.createMany({ data: selectedModuleKeys.map((moduleKey) => ({ membershipId: membership.id, moduleKey })) });
    if (branchIds.length) await tx.membershipBranchScope.createMany({ data: branchIds.map((branchId) => ({ membershipId: membership.id, branchId })) });
    if (departmentIds.length) await tx.membershipDepartmentScope.createMany({ data: departmentIds.map((departmentId) => ({ membershipId: membership.id, departmentId })) });
    if (employeeIds.length) await tx.membershipEmployeeScope.createMany({ data: employeeIds.map((employeeId) => ({ membershipId: membership.id, employeeId })) });
    if (deviceIds.length) await tx.membershipDeviceScope.createMany({ data: deviceIds.map((deviceId) => ({ membershipId: membership.id, deviceId })) });
    if (teamIds.length) await tx.membershipTeamScope.createMany({ data: teamIds.map((teamId) => ({ membershipId: membership.id, teamId })) });
    await tx.companyAccessAudit.create({ data: { companyId: authorization.companyId!, actorUserId: user.id, targetUserId: created.id, action: "USER_CREATED", summary: `${username} kullanıcı adıyla ${role.name} rolünde kullanıcı oluşturuldu.`, metadataJson: JSON.stringify({ roleId, scopeMode, employeeId, moduleKeys: selectedModuleKeys, branchIds, departmentIds, employeeIds, deviceIds, teamIds }) } });
  });
  revalidatePath("/dashboard/access");
  redirect("/dashboard/access");
}

export async function updateCompanyMembershipAction(formData: FormData) {
  return runFormAction(() => updateCompanyMembershipActionImpl(formData));
}

async function updateCompanyMembershipActionImpl(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.ACCESS_MANAGE);
  if (!authorization.companyId) throw new ActionError("Aktif firma seçilmedi.");
  const membershipId = Number(value(formData, "membershipId")); const roleId = Number(value(formData, "roleId")); const status = value(formData, "status") as CompanyMembershipStatus; const scopeMode = value(formData, "scopeMode") as DataScopeMode; const employeeId = Number(value(formData, "employeeId")) || null;
  if (!Object.values(CompanyMembershipStatus).includes(status) || !Object.values(DataScopeMode).includes(scopeMode)) throw new ActionError("Üyelik bilgileri geçersiz.");
  const firstName = value(formData, "firstName"); const lastName = value(formData, "lastName"); const usernameInput = value(formData, "username"); const username = usernameInput ? normalizeUsername(usernameInput) : null; const email = normalizeEmail(value(formData, "email")); const phone = value(formData, "phone"); const password = value(formData, "password");
  if (!firstName || !lastName || !email.includes("@") || (username !== null && !/^[a-z0-9._-]{3,64}$/.test(username)) || (password && password.length < 10)) throw new ActionError("Kullanıcı bilgileri geçersiz. Kullanıcı adı girilirse en az 3 karakter, yeni şifre girilirse en az 10 karakter olmalıdır.");
  const [target, role] = await Promise.all([prisma.companyMembership.findFirst({ where: { id: membershipId, companyId: authorization.companyId }, include: { role: { include: { permissions: true } }, user: true } }), prisma.companyRole.findFirst({ where: { id: roleId, companyId: authorization.companyId, isActive: true }, include: { permissions: true, modules: true } })]);
  if (!target || !role) throw new ActionError("Üyelik veya rol bulunamadı.");
  const selectedModuleKeys = assignableRoleModules(role, authorization);
  validateModuleSelection(selectedModuleKeys);
  validateDelegatedModules(selectedModuleKeys, authorization.modules, authorization.isPlatformAdmin);
  if (target.role.key === "OWNER" || role.key === "OWNER") throw new ActionError("Firma sahibi değişikliği yalnız sahiplik devriyle yapılabilir.");
  if (!canDelegateRole(role, authorization)) throw new ActionError("Sahip olmadığınız bir yetkiyi devredemezsiniz.");
  if (target.userId === user.id) throw new ActionError("Kendi rolünüzü, durumunuzu veya veri kapsamınızı değiştiremezsiniz. Bu değişikliği başka bir firma yöneticisi yapmalıdır.");
  const duplicate = await prisma.user.findFirst({ where: { id: { not: target.userId }, OR: [{ email }, ...(username ? [{ username }] : [])] }, select: { id: true } });
  if (duplicate) throw new ActionError("Kullanıcı adı veya e-posta başka bir kullanıcı tarafından kullanılıyor.");
  const branchIds = ids(formData, "branchIds"); const departmentIds = ids(formData, "departmentIds"); const employeeIds = ids(formData, "employeeIds"); const deviceIds = ids(formData, "deviceIds"); const teamIds = ids(formData, "teamIds");
  await validateScopeIds(authorization.companyId, branchIds, departmentIds, employeeIds, deviceIds, teamIds);
  if (employeeId && !(await prisma.employee.findFirst({ where: { id: employeeId, companyId: authorization.companyId }, select: { id: true } }))) throw new ActionError("Personel bağlantısı bu firmaya ait değil.");
  const passwordHash = password ? await bcrypt.hash(password, 12) : null;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: target.userId }, data: { firstName, lastName, name: `${firstName} ${lastName}`.trim(), username, email, phone: phone || null, ...(passwordHash ? { password: passwordHash } : {}) } });
    await tx.companyMembership.update({ where: { id: target.id }, data: { roleId, status, scopeMode, employeeId, sessionVersion: { increment: 1 } } });
    await Promise.all([tx.membershipBranchScope.deleteMany({ where: { membershipId } }), tx.membershipDepartmentScope.deleteMany({ where: { membershipId } }), tx.membershipEmployeeScope.deleteMany({ where: { membershipId } }), tx.membershipDeviceScope.deleteMany({ where: { membershipId } }), tx.membershipTeamScope.deleteMany({ where: { membershipId } })]);
    await tx.membershipModule.deleteMany({ where: { membershipId } });
    if (selectedModuleKeys.length) await tx.membershipModule.createMany({ data: selectedModuleKeys.map((moduleKey) => ({ membershipId, moduleKey })) });
    if (branchIds.length) await tx.membershipBranchScope.createMany({ data: branchIds.map((branchId) => ({ membershipId, branchId })) });
    if (departmentIds.length) await tx.membershipDepartmentScope.createMany({ data: departmentIds.map((departmentId) => ({ membershipId, departmentId })) });
    if (employeeIds.length) await tx.membershipEmployeeScope.createMany({ data: employeeIds.map((itemEmployeeId) => ({ membershipId, employeeId: itemEmployeeId })) });
    if (deviceIds.length) await tx.membershipDeviceScope.createMany({ data: deviceIds.map((deviceId) => ({ membershipId, deviceId })) });
    if (teamIds.length) await tx.membershipTeamScope.createMany({ data: teamIds.map((teamId) => ({ membershipId, teamId })) });
    await tx.companyAccessAudit.create({ data: { companyId: authorization.companyId!, actorUserId: user.id, targetUserId: target.userId, action: "MEMBERSHIP_UPDATED", summary: `Üyelik ${role.name} rolü, ${scopeMode} kapsamı, ${status} durumu ve ${selectedModuleKeys.map(moduleLabel).join(", ")} modülleriyle güncellendi.`, metadataJson: JSON.stringify({ roleId, scopeMode, status, branchIds, departmentIds, employeeIds, deviceIds, teamIds, employeeId, moduleKeys: selectedModuleKeys }) } });
  });
  revalidatePath("/dashboard/access"); redirect(`/dashboard/access/members/${membershipId}`);
}

export async function transferCompanyOwnershipAction(formData: FormData) {
  return runFormAction(() => transferCompanyOwnershipActionImpl(formData));
}

async function transferCompanyOwnershipActionImpl(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.OWNERSHIP_TRANSFER);
  if (!authorization.companyId || authorization.roleKey !== "OWNER") throw new ActionError("Sahiplik devrini yalnız mevcut firma sahibi yapabilir.");
  const targetMembershipId = Number(value(formData, "targetMembershipId"));
  const [target, ownerRole, adminRole] = await Promise.all([prisma.companyMembership.findFirst({ where: { id: targetMembershipId, companyId: authorization.companyId, status: CompanyMembershipStatus.ACTIVE } }), prisma.companyRole.findUnique({ where: { companyId_key: { companyId: authorization.companyId, key: "OWNER" } } }), prisma.companyRole.findUnique({ where: { companyId_key: { companyId: authorization.companyId, key: "ADMIN" } } })]);
  if (!target || target.userId === user.id || !ownerRole || !adminRole) throw new ActionError("Sahiplik devri hedefi geçersiz.");
  await prisma.$transaction(async (tx) => {
    // Carry the owner's real licenses (with expiry) and trial over; copying the effective
    // module set would turn trial access into permanent licenses.
    const currentOwner = await tx.user.findUniqueOrThrow({ where: { id: user.id }, select: { selfRegistered: true, trialEndsAt: true, moduleEntitlements: { select: { moduleKey: true, expiresAt: true } } } });
    if (currentOwner.moduleEntitlements.length) await tx.userModuleEntitlement.createMany({ data: currentOwner.moduleEntitlements.map((item) => ({ userId: target.userId, moduleKey: item.moduleKey, expiresAt: item.expiresAt })), skipDuplicates: true });
    if (currentOwner.trialEndsAt) await tx.user.update({ where: { id: target.userId }, data: { trialEndsAt: currentOwner.trialEndsAt, selfRegistered: currentOwner.selfRegistered } });
    await tx.companyMembership.update({ where: { id: target.id }, data: { roleId: ownerRole.id, scopeMode: DataScopeMode.COMPANY, sessionVersion: { increment: 1 } } });
    await tx.membershipModule.createMany({ data: ALL_MODULE_KEYS.map((moduleKey) => ({ membershipId: target.id, moduleKey })), skipDuplicates: true });
    await tx.companyMembership.update({ where: { id: authorization.membershipId! }, data: { roleId: adminRole.id, sessionVersion: { increment: 1 } } });
    await tx.companyAccessAudit.create({ data: { companyId: authorization.companyId!, actorUserId: user.id, targetUserId: target.userId, action: "OWNERSHIP_TRANSFERRED", summary: "Firma sahipliği açık işlemle devredildi." } });
  });
  redirect("/dashboard/access");
}
