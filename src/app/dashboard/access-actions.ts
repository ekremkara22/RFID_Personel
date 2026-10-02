"use server";

import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CompanyInvitationStatus, CompanyMembershipStatus, DataScopeMode, Role } from "@/generated/prisma/client";
import { AUTH_COOKIE_NAME, signToken } from "@/lib/auth";
import { assertPermission } from "@/lib/authorization";
import { ALL_PERMISSIONS, permissionModule, PERMISSIONS } from "@/lib/permission-catalog";
import { ALL_MODULE_KEYS, MODULES, moduleLabel } from "@/lib/module-catalog";
import { prisma } from "@/lib/prisma";
import { membershipModuleRows } from "@/lib/role-module-sync";
import { ACTIVE_COMPANY_COOKIE_NAME, requireSessionUser } from "@/lib/session";

function value(formData: FormData, key: string) { const item = formData.get(key); return typeof item === "string" ? item.trim() : ""; }
function ids(formData: FormData, key: string) { return [...new Set(formData.getAll(key).map(Number).filter((item) => Number.isSafeInteger(item) && item > 0))]; }
function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
function normalizeEmail(email: string) { return email.trim().toLocaleLowerCase("tr-TR"); }
function normalizeUsername(username: string) { return username.trim().toLocaleLowerCase("tr-TR"); }
function moduleKeys(formData: FormData) { return [...new Set(formData.getAll("moduleKeys").filter((item): item is string => typeof item === "string" && ALL_MODULE_KEYS.includes(item as never)))]; }

function validateModuleSelection(keys: string[]) {
  if (!keys.length) throw new Error("Kullanıcı için en az bir modül seçilmelidir.");
}

function validateDelegatedModules(keys: string[], available: Set<string>, isPlatformAdmin: boolean) {
  if (!isPlatformAdmin && keys.some((key) => !available.has(key))) {
    throw new Error("Sahip olmadığınız bir modülü başka kullanıcıya açamazsınız.");
  }
}

function validatePermissionsForModules(permissions: string[], selectedModules: string[]) {
  if (permissions.some((permission) => {
    const moduleKey = permissionModule(permission);
    return moduleKey !== null && !selectedModules.includes(moduleKey);
  })) throw new Error("Seçilen yetkilerin tamamı rol için açılan modüllere ait olmalıdır.");
}

async function validateScopeIds(companyId: number, branchIds: number[], departmentIds: number[], employeeIds: number[], deviceIds: number[], teamIds: number[]) {
  const [branches, departments, employees, devices, teams] = await Promise.all([
    prisma.branch.count({ where: { id: { in: branchIds }, companyId } }),
    prisma.department.count({ where: { id: { in: departmentIds }, companyId } }),
    prisma.employee.count({ where: { id: { in: employeeIds }, companyId } }),
    prisma.device.count({ where: { id: { in: deviceIds }, companyId } }),
    prisma.companyTeam.count({ where: { id: { in: teamIds }, companyId } }),
  ]);
  if (branches !== branchIds.length || departments !== departmentIds.length || employees !== employeeIds.length || devices !== deviceIds.length || teams !== teamIds.length) {
    throw new Error("Kapsam seçimlerinden biri bu firmaya ait değil.");
  }
}

export async function setActiveCompanyAction(formData: FormData) {
  const { user } = await requireSessionUser();
  const companyId = Number(value(formData, "companyId"));
  const membership = await prisma.companyMembership.findFirst({ where: { userId: user.id, companyId, status: CompanyMembershipStatus.ACTIVE, company: { isActive: true }, role: { isActive: true } }, select: { id: true } });
  if (!membership && user.role !== Role.SUPERADMIN) throw new Error("Bu firmaya erişiminiz yok.");
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_COMPANY_COOKIE_NAME, String(companyId), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/dashboard");
}

export async function createCompanyUserAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.ACCESS_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");

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
    throw new Error("Ad, soyad, geçerli e-posta, en az 3 karakter kullanıcı adı ve en az 10 karakter şifre zorunludur.");
  }
  if (!Object.values(DataScopeMode).includes(scopeMode)) throw new Error("Veri kapsamı geçersiz.");

  const role = await prisma.companyRole.findFirst({ where: { id: roleId, companyId: authorization.companyId, isActive: true }, include: { permissions: true, modules: true } });
  if (!role || role.key === "OWNER") throw new Error("Firma sahibi rolü bu formdan atanamaz.");
  const selectedModuleKeys = role.modules.map((item) => item.moduleKey);
  validateModuleSelection(selectedModuleKeys);
  validateDelegatedModules(selectedModuleKeys, authorization.modules, authorization.isPlatformAdmin);
  if (role.permissions.some((item) => !authorization.permissions.has(item.permission))) throw new Error("Sahip olmadığınız bir yetkiyi devredemezsiniz.");

  const branchIds = ids(formData, "branchIds"); const departmentIds = ids(formData, "departmentIds"); const employeeIds = ids(formData, "employeeIds"); const deviceIds = ids(formData, "deviceIds"); const teamIds = ids(formData, "teamIds");
  await validateScopeIds(authorization.companyId, branchIds, departmentIds, employeeIds, deviceIds, teamIds);
  if (employeeId && !(await prisma.employee.findFirst({ where: { id: employeeId, companyId: authorization.companyId }, select: { id: true } }))) throw new Error("Bağlı personel bu firmaya ait değil.");
  const duplicate = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] }, select: { email: true, username: true } });
  if (duplicate) throw new Error(duplicate.email === email ? "Bu e-posta zaten kullanılıyor." : "Bu kullanıcı adı zaten kullanılıyor.");

  await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { firstName, lastName, name: `${firstName} ${lastName}`.trim(), username, email, phone: phone || null, password: await bcrypt.hash(password, 12), role: Role.COMPANY_ADMIN, companyId: authorization.companyId } });
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

export async function createCompanyInvitationAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.ACCESS_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");
  const email = normalizeEmail(value(formData, "email"));
  const roleId = Number(value(formData, "roleId"));
  const scopeMode = value(formData, "scopeMode") as DataScopeMode;
  if (!email || !email.includes("@") || !Object.values(DataScopeMode).includes(scopeMode)) throw new Error("Davet bilgileri geçersiz.");
  const role = await prisma.companyRole.findFirst({ where: { id: roleId, companyId: authorization.companyId, isActive: true }, include: { permissions: true, modules: true } });
  if (!role || role.key === "OWNER") throw new Error("Firma sahibi davetle atanamaz; sahiplik devri kullanılmalıdır.");
  const selectedModuleKeys = role.modules.map((item) => item.moduleKey);
  validateModuleSelection(selectedModuleKeys);
  validateDelegatedModules(selectedModuleKeys, authorization.modules, authorization.isPlatformAdmin);
  if (role.permissions.some((item) => !authorization.permissions.has(item.permission))) throw new Error("Sahip olmadığınız bir yetkiyi devredemezsiniz.");
  const branchIds = ids(formData, "branchIds"); const departmentIds = ids(formData, "departmentIds"); const employeeIds = ids(formData, "employeeIds"); const deviceIds = ids(formData, "deviceIds"); const teamIds = ids(formData, "teamIds");
  await validateScopeIds(authorization.companyId, branchIds, departmentIds, employeeIds, deviceIds, teamIds);
  const existingMembership = await prisma.companyMembership.findFirst({ where: { companyId: authorization.companyId, user: { email } } });
  if (existingMembership && existingMembership.status !== CompanyMembershipStatus.REVOKED) throw new Error("Bu kullanıcı zaten firmaya üyedir.");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
  await prisma.$transaction(async (tx) => {
    await tx.companyInvitation.updateMany({ where: { companyId: authorization.companyId!, email, status: CompanyInvitationStatus.PENDING }, data: { status: CompanyInvitationStatus.REVOKED } });
    await tx.companyInvitation.create({ data: { companyId: authorization.companyId!, email, roleId, tokenHash: hashToken(token), scopeMode, scopeJson: JSON.stringify({ branchIds, departmentIds, employeeIds, deviceIds, teamIds }), moduleKeysJson: JSON.stringify(selectedModuleKeys), expiresAt, createdById: user.id } });
    await tx.companyAccessAudit.create({ data: { companyId: authorization.companyId!, actorUserId: user.id, action: "INVITATION_CREATED", summary: `${email} adresine ${role.name} rolü ve ${selectedModuleKeys.map(moduleLabel).join(", ")} modülleri için davet oluşturuldu.` } });
  });
  const appUrl = process.env.APP_URL ?? "https://test.flodeska.com";
  redirect(`/dashboard/access?invite=${encodeURIComponent(`${appUrl}/activate/${token}`)}`);
}

export async function activateCompanyInvitationAction(formData: FormData) {
  const token = value(formData, "token"); const firstName = value(formData, "firstName"); const lastName = value(formData, "lastName"); const password = value(formData, "password");
  if (!token || password.length < 10) throw new Error("Davet veya parola geçersiz. Parola en az 10 karakter olmalıdır.");
  const invitation = await prisma.companyInvitation.findUnique({ where: { tokenHash: hashToken(token) }, include: { company: true, role: true } });
  if (!invitation || invitation.status !== CompanyInvitationStatus.PENDING || invitation.acceptedAt || invitation.expiresAt <= new Date() || !invitation.company.isActive || !invitation.role.isActive) throw new Error("Davet geçersiz, kullanılmış veya süresi dolmuş.");
  let user = await prisma.user.findUnique({ where: { email: invitation.email } });
  if (user) {
    if (!(await bcrypt.compare(password, user.password))) throw new Error("Mevcut hesap parolası hatalı. Hesabın parolası değiştirilmedi.");
  } else {
    if (!firstName || !lastName) throw new Error("Yeni hesap için ad ve soyad zorunludur.");
    user = await prisma.user.create({ data: { email: invitation.email, firstName, lastName, name: `${firstName} ${lastName}`, password: await bcrypt.hash(password, 12), role: Role.COMPANY_ADMIN } });
  }
  const scope = JSON.parse(invitation.scopeJson || "{}") as { branchIds?: number[]; departmentIds?: number[]; employeeIds?: number[]; deviceIds?: number[]; teamIds?: number[] };
  const invitationModules = JSON.parse(invitation.moduleKeysJson || JSON.stringify([MODULES.HR])) as string[];
  await prisma.$transaction(async (tx) => {
    const membership = await tx.companyMembership.upsert({ where: { userId_companyId: { userId: user!.id, companyId: invitation.companyId } }, create: { userId: user!.id, companyId: invitation.companyId, roleId: invitation.roleId, status: CompanyMembershipStatus.ACTIVE, scopeMode: invitation.scopeMode }, update: { roleId: invitation.roleId, status: CompanyMembershipStatus.ACTIVE, scopeMode: invitation.scopeMode, sessionVersion: { increment: 1 } } });
    await Promise.all([tx.membershipBranchScope.deleteMany({ where: { membershipId: membership.id } }), tx.membershipDepartmentScope.deleteMany({ where: { membershipId: membership.id } }), tx.membershipEmployeeScope.deleteMany({ where: { membershipId: membership.id } }), tx.membershipDeviceScope.deleteMany({ where: { membershipId: membership.id } }), tx.membershipTeamScope.deleteMany({ where: { membershipId: membership.id } })]);
    await tx.membershipModule.deleteMany({ where: { membershipId: membership.id } });
    await tx.membershipModule.createMany({ data: invitationModules.filter((item) => ALL_MODULE_KEYS.includes(item as never)).map((moduleKey) => ({ membershipId: membership.id, moduleKey })), skipDuplicates: true });
    if (scope.branchIds?.length) await tx.membershipBranchScope.createMany({ data: scope.branchIds.map((branchId) => ({ membershipId: membership.id, branchId })) });
    if (scope.departmentIds?.length) await tx.membershipDepartmentScope.createMany({ data: scope.departmentIds.map((departmentId) => ({ membershipId: membership.id, departmentId })) });
    if (scope.employeeIds?.length) await tx.membershipEmployeeScope.createMany({ data: scope.employeeIds.map((employeeId) => ({ membershipId: membership.id, employeeId })) });
    if (scope.deviceIds?.length) await tx.membershipDeviceScope.createMany({ data: scope.deviceIds.map((deviceId) => ({ membershipId: membership.id, deviceId })) });
    if (scope.teamIds?.length) await tx.membershipTeamScope.createMany({ data: scope.teamIds.map((teamId) => ({ membershipId: membership.id, teamId })) });
    await tx.companyInvitation.update({ where: { id: invitation.id }, data: { status: CompanyInvitationStatus.ACCEPTED, acceptedAt: new Date() } });
    await tx.companyAccessAudit.create({ data: { companyId: invitation.companyId, actorUserId: user!.id, targetUserId: user!.id, action: "INVITATION_ACCEPTED", summary: `${invitation.email} üyeliği etkinleştirildi.` } });
  });
  const authToken = await signToken({ id: user.id, email: user.email, name: user.name ?? (`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email), role: user.role, companyId: invitation.companyId });
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, authToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 });
  cookieStore.set(ACTIVE_COMPANY_COOKIE_NAME, String(invitation.companyId), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/dashboard");
}

export async function updateCompanyMembershipAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.ACCESS_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");
  const membershipId = Number(value(formData, "membershipId")); const roleId = Number(value(formData, "roleId")); const status = value(formData, "status") as CompanyMembershipStatus; const scopeMode = value(formData, "scopeMode") as DataScopeMode; const employeeId = Number(value(formData, "employeeId")) || null;
  if (!Object.values(CompanyMembershipStatus).includes(status) || !Object.values(DataScopeMode).includes(scopeMode)) throw new Error("Üyelik bilgileri geçersiz.");
  const firstName = value(formData, "firstName"); const lastName = value(formData, "lastName"); const usernameInput = value(formData, "username"); const username = usernameInput ? normalizeUsername(usernameInput) : null; const email = normalizeEmail(value(formData, "email")); const phone = value(formData, "phone"); const password = value(formData, "password");
  if (!firstName || !lastName || !email.includes("@") || (username !== null && !/^[a-z0-9._-]{3,64}$/.test(username)) || (password && password.length < 10)) throw new Error("Kullanıcı bilgileri geçersiz. Kullanıcı adı girilirse en az 3 karakter, yeni şifre girilirse en az 10 karakter olmalıdır.");
  const [target, role] = await Promise.all([prisma.companyMembership.findFirst({ where: { id: membershipId, companyId: authorization.companyId }, include: { role: { include: { permissions: true } }, user: true } }), prisma.companyRole.findFirst({ where: { id: roleId, companyId: authorization.companyId, isActive: true }, include: { permissions: true, modules: true } })]);
  if (!target || !role) throw new Error("Üyelik veya rol bulunamadı.");
  const selectedModuleKeys = role.modules.map((item) => item.moduleKey);
  validateModuleSelection(selectedModuleKeys);
  validateDelegatedModules(selectedModuleKeys, authorization.modules, authorization.isPlatformAdmin);
  if (target.role.key === "OWNER" || role.key === "OWNER") throw new Error("Firma sahibi değişikliği yalnız sahiplik devriyle yapılabilir.");
  if (role.permissions.some((item) => !authorization.permissions.has(item.permission))) throw new Error("Sahip olmadığınız bir yetkiyi devredemezsiniz.");
  if (target.userId === user.id) throw new Error("Kendi rolünüzü, durumunuzu veya veri kapsamınızı değiştiremezsiniz. Bu değişikliği başka bir firma yöneticisi yapmalıdır.");
  const duplicate = await prisma.user.findFirst({ where: { id: { not: target.userId }, OR: [{ email }, ...(username ? [{ username }] : [])] }, select: { id: true } });
  if (duplicate) throw new Error("Kullanıcı adı veya e-posta başka bir kullanıcı tarafından kullanılıyor.");
  const branchIds = ids(formData, "branchIds"); const departmentIds = ids(formData, "departmentIds"); const employeeIds = ids(formData, "employeeIds"); const deviceIds = ids(formData, "deviceIds"); const teamIds = ids(formData, "teamIds");
  await validateScopeIds(authorization.companyId, branchIds, departmentIds, employeeIds, deviceIds, teamIds);
  if (employeeId && !(await prisma.employee.findFirst({ where: { id: employeeId, companyId: authorization.companyId }, select: { id: true } }))) throw new Error("Personel bağlantısı bu firmaya ait değil.");
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: target.userId }, data: { firstName, lastName, name: `${firstName} ${lastName}`.trim(), username, email, phone: phone || null, ...(password ? { password: await bcrypt.hash(password, 12) } : {}) } });
    await tx.companyMembership.update({ where: { id: target.id }, data: { roleId, status, scopeMode, employeeId, sessionVersion: { increment: 1 } } });
    await Promise.all([tx.membershipBranchScope.deleteMany({ where: { membershipId } }), tx.membershipDepartmentScope.deleteMany({ where: { membershipId } }), tx.membershipEmployeeScope.deleteMany({ where: { membershipId } }), tx.membershipDeviceScope.deleteMany({ where: { membershipId } }), tx.membershipTeamScope.deleteMany({ where: { membershipId } })]);
    await tx.membershipModule.deleteMany({ where: { membershipId } });
    await tx.membershipModule.createMany({ data: selectedModuleKeys.map((moduleKey) => ({ membershipId, moduleKey })) });
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
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.OWNERSHIP_TRANSFER);
  if (!authorization.companyId || authorization.roleKey !== "OWNER") throw new Error("Sahiplik devrini yalnız mevcut firma sahibi yapabilir.");
  const targetMembershipId = Number(value(formData, "targetMembershipId"));
  const [target, ownerRole, adminRole] = await Promise.all([prisma.companyMembership.findFirst({ where: { id: targetMembershipId, companyId: authorization.companyId, status: CompanyMembershipStatus.ACTIVE } }), prisma.companyRole.findUnique({ where: { companyId_key: { companyId: authorization.companyId, key: "OWNER" } } }), prisma.companyRole.findUnique({ where: { companyId_key: { companyId: authorization.companyId, key: "ADMIN" } } })]);
  if (!target || target.userId === user.id || !ownerRole || !adminRole) throw new Error("Sahiplik devri hedefi geçersiz.");
  await prisma.$transaction(async (tx) => {
    await tx.companyMembership.update({ where: { id: target.id }, data: { roleId: ownerRole.id, scopeMode: DataScopeMode.COMPANY, sessionVersion: { increment: 1 } } });
    await tx.membershipModule.createMany({ data: ALL_MODULE_KEYS.map((moduleKey) => ({ membershipId: target.id, moduleKey })), skipDuplicates: true });
    await tx.companyMembership.update({ where: { id: authorization.membershipId! }, data: { roleId: adminRole.id, sessionVersion: { increment: 1 } } });
    await tx.companyAccessAudit.create({ data: { companyId: authorization.companyId!, actorUserId: user.id, targetUserId: target.userId, action: "OWNERSHIP_TRANSFERRED", summary: "Firma sahipliği açık işlemle devredildi." } });
  });
  redirect("/dashboard/access");
}

export async function createCompanyRoleAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.ACCESS_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");
  const name = value(formData, "name"); const description = value(formData, "description"); const requested = formData.getAll("permissions").filter((item): item is string => typeof item === "string" && ALL_PERMISSIONS.includes(item as never));
  const selectedModuleKeys = moduleKeys(formData); validateModuleSelection(selectedModuleKeys); validateDelegatedModules(selectedModuleKeys, authorization.modules, authorization.isPlatformAdmin);
  if (!name || requested.length === 0) throw new Error("Rol adı ve en az bir izin zorunludur.");
  if (requested.some((permission) => !authorization.permissions.has(permission))) throw new Error("Sahip olmadığınız izni role ekleyemezsiniz.");
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
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.ACCESS_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");
  const roleId = Number(value(formData, "roleId")); const name = value(formData, "name"); const description = value(formData, "description"); const isActive = formData.get("isActive") === "on"; const requested = formData.getAll("permissions").filter((item): item is string => typeof item === "string" && ALL_PERMISSIONS.includes(item as never));
  const selectedModuleKeys = moduleKeys(formData); validateModuleSelection(selectedModuleKeys); validateDelegatedModules(selectedModuleKeys, authorization.modules, authorization.isPlatformAdmin);
  const role = await prisma.companyRole.findFirst({ where: { id: roleId, companyId: authorization.companyId }, include: { memberships: { select: { id: true, status: true } } } });
  if (!role || !name) throw new Error("Rol bulunamadı.");
  if (role.key === "OWNER" && !isActive) throw new Error("Firma sahibi rolü pasifleştirilemez.");
  if (requested.some((permission) => !authorization.permissions.has(permission))) throw new Error("Sahip olmadığınız izni role ekleyemezsiniz.");
  validatePermissionsForModules(requested, selectedModuleKeys);
  if (!isActive && role.memberships.some((membership) => membership.status === CompanyMembershipStatus.ACTIVE)) throw new Error("Aktif üyesi bulunan rol önce üyelerden kaldırılmalıdır; erişim sessizce başka role genişletilmez.");
  await prisma.$transaction(async (tx) => {
    await tx.companyRole.update({ where: { id: role.id }, data: { name, description: description || null, isActive } });
    await tx.companyRolePermission.deleteMany({ where: { roleId: role.id } });
    if (requested.length) await tx.companyRolePermission.createMany({ data: requested.map((permission) => ({ roleId: role.id, permission })) });
    await tx.companyRoleModule.deleteMany({ where: { roleId: role.id } });
    await tx.companyRoleModule.createMany({ data: selectedModuleKeys.map((moduleKey) => ({ roleId: role.id, moduleKey })) });
    const membershipIds = role.memberships.map((membership) => membership.id);
    if (membershipIds.length) {
      await tx.membershipModule.deleteMany({ where: { membershipId: { in: membershipIds } } });
      await tx.membershipModule.createMany({ data: membershipModuleRows(membershipIds, selectedModuleKeys) });
    }
    await tx.companyMembership.updateMany({ where: { roleId: role.id }, data: { sessionVersion: { increment: 1 } } });
    await tx.companyAccessAudit.create({ data: { companyId: authorization.companyId!, actorUserId: user.id, action: "ROLE_UPDATED", summary: `${name} rolü güncellendi.`, metadataJson: JSON.stringify({ permissions: requested, moduleKeys: selectedModuleKeys, isActive }) } });
  });
  revalidatePath("/dashboard/access/roles");
}

export async function deleteCompanyRoleAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.ACCESS_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");
  const roleId = Number(value(formData, "roleId"));
  const role = await prisma.companyRole.findFirst({ where: { id: roleId, companyId: authorization.companyId }, include: { _count: { select: { memberships: true } } } });
  if (!role) throw new Error("Rol bulunamadı.");
  if (role.isSystem) throw new Error("Hazır roller silinemez; gerekirse pasifleştirilebilir.");
  if (role._count.memberships) throw new Error("Kullanıcısı bulunan rol silinemez. Önce kullanıcıları başka role taşıyın.");
  await prisma.$transaction(async (tx) => {
    await tx.companyRole.delete({ where: { id: role.id } });
    await tx.companyAccessAudit.create({ data: { companyId: authorization.companyId!, actorUserId: user.id, action: "ROLE_DELETED", summary: `${role.name} rolü silindi.` } });
  });
  revalidatePath("/dashboard/access/roles"); redirect("/dashboard/access/roles");
}

export async function saveCompanyTeamAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.ACCESS_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma seçilmedi.");
  const teamId = Number(value(formData, "teamId")) || null; const name = value(formData, "name"); const employeeIds = ids(formData, "employeeIds"); const isActive = formData.get("isActive") === "on" || !teamId;
  if (!name) throw new Error("Ekip adı zorunludur.");
  await validateScopeIds(authorization.companyId, [], [], employeeIds, [], []);
  await prisma.$transaction(async (tx) => {
    const team = teamId ? await tx.companyTeam.update({ where: { id: teamId, companyId: authorization.companyId! }, data: { name, isActive } }) : await tx.companyTeam.create({ data: { companyId: authorization.companyId!, name, isActive: true } });
    await tx.companyTeamEmployee.deleteMany({ where: { teamId: team.id } });
    if (employeeIds.length) await tx.companyTeamEmployee.createMany({ data: employeeIds.map((employeeId) => ({ teamId: team.id, employeeId })) });
    await tx.companyAccessAudit.create({ data: { companyId: authorization.companyId!, actorUserId: user.id, action: teamId ? "TEAM_UPDATED" : "TEAM_CREATED", summary: `${name} ekibi ${employeeIds.length} personelle kaydedildi.` } });
  });
  revalidatePath("/dashboard/access/teams");
}
