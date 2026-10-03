"use server";

import { ActionError } from "@/lib/action-error";
import { runFormAction } from "@/lib/run-form-action";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@/generated/prisma/client";
import { ALL_MODULE_KEYS } from "@/lib/module-catalog";
import { prisma } from "@/lib/prisma";
import { isValidOptionalUsername, normalizeOptionalUsername } from "@/lib/user-identity";
import { getString, getStringList, getId, getIdList, normalizeOptionalEmail, getAssignableRole, getReturnTo, redirectToReturnPath, assertSuperadminUser } from "@/modules/shared/action-helpers";

export async function createDashboardUserAction(formData: FormData) {
  return runFormAction(() => createDashboardUserActionImpl(formData));
}

async function createDashboardUserActionImpl(formData: FormData) {
  await assertSuperadminUser();

  const firstName = getString(formData, "firstName");
  const lastName = getString(formData, "lastName");
  const email = normalizeOptionalEmail(getString(formData, "email"));
  const username = normalizeOptionalUsername(getString(formData, "username"));
  const phone = getString(formData, "phone");
  const password = getString(formData, "password");
  const role = await getAssignableRole(formData);
  const moduleKeys = [...new Set(getStringList(formData, "moduleKeys").filter((key) => ALL_MODULE_KEYS.includes(key as never)))];

  if (!firstName || !lastName) throw new ActionError("Ad ve soyad alanlarını doldurun.");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ActionError("Geçerli bir e-posta adresi girin.");
  if (!username || !isValidOptionalUsername(username)) throw new ActionError("Kullanıcı adı 3–64 karakter olmalı; yalnız İngilizce harf, rakam, nokta, alt çizgi veya tire içermelidir. Boşluk ve Türkçe karakter kullanmayın.");
  if (password.length < 10) throw new ActionError("Şifre en az 10 karakter olmalıdır.");
  if (role !== Role.COMPANY_ADMIN) throw new ActionError("Bu ekrandan yalnız firma admini oluşturulabilir.");
  if (!moduleKeys.length) throw new ActionError("Firma admini için en az bir modül lisansı seçilmelidir.");

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { firstName, lastName, name: `${firstName} ${lastName}`.trim(), username, email, phone: phone || null, password: passwordHash, role, companyId: null } });
    await tx.userModuleEntitlement.createMany({ data: moduleKeys.map((moduleKey) => ({ userId: created.id, moduleKey })) });
  });

  revalidatePath("/dashboard/users");
  redirect("/dashboard/users");
}

export async function updateDashboardUserAction(formData: FormData) {
  return runFormAction(() => updateDashboardUserActionImpl(formData));
}

async function updateDashboardUserActionImpl(formData: FormData) {
  const currentUser = await assertSuperadminUser();

  const userId = getId(formData, "userId");
  const submittedFirstName = getString(formData, "firstName");
  const submittedLastName = getString(formData, "lastName");
  const submittedEmail = normalizeOptionalEmail(getString(formData, "email"));
  const username = normalizeOptionalUsername(getString(formData, "username"));
  const phone = getString(formData, "phone");
  const password = getString(formData, "password");
  const moduleKeys = [...new Set(getStringList(formData, "moduleKeys").filter((key) => ALL_MODULE_KEYS.includes(key as never)))];
  const deviceIds = getIdList(formData, "deviceIds");
  const targetUser = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true, firstName: true, lastName: true, email: true } })
    : null;
  const role = await getAssignableRole(formData);
  const firstName = submittedFirstName || targetUser?.firstName?.trim() || "";
  const lastName = submittedLastName || targetUser?.lastName?.trim() || "";
  const email = submittedEmail ?? targetUser?.email ?? null;

  if (!userId || !targetUser) throw new ActionError("Güncellenecek kullanıcı bulunamadı.");
  if (!firstName || !lastName || !email) throw new ActionError("Kullanıcının ad, soyad veya e-posta bilgisi eksik.");
  if (!isValidOptionalUsername(username)) {
    throw new ActionError("Kullanıcı adı 3–64 karakter olmalı; yalnız İngilizce harf, rakam, nokta, alt çizgi veya tire içermelidir.");
  }

  if (userId === currentUser.id && role !== Role.SUPERADMIN) {
    throw new ActionError("Kendi super admin rolunuzu degistiremezsiniz.");
  }
  if (role !== Role.SUPERADMIN && role !== Role.COMPANY_ADMIN) throw new ActionError("Bu ekrandan yalnız süper admin veya firma admini yönetilebilir.");
  if (password && password.length < 10) throw new ActionError("Yeni şifre en az 10 karakter olmalıdır.");
  const passwordHash = password ? await bcrypt.hash(password, 10) : null;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { firstName, lastName, username, name: `${firstName} ${lastName}`.trim(), email, phone: phone || null, role, ...(passwordHash ? { password: passwordHash } : {}) },
    });
    await tx.userModuleEntitlement.deleteMany({ where: { userId } });
    if (role === Role.COMPANY_ADMIN) {
      if (moduleKeys.length) await tx.userModuleEntitlement.createMany({ data: moduleKeys.map((moduleKey) => ({ userId, moduleKey })) });
      // Keep role and membership configuration intact when a license is disabled.
      // Authorization intersects it with the owner's current licenses on every request.
      const memberships = await tx.companyMembership.findMany({ where: { userId, role: { key: "OWNER" } }, select: { companyId: true } });
      const companyIds = memberships.map((item) => item.companyId);
      await tx.companyMembership.updateMany({ where: { companyId: { in: companyIds } }, data: { sessionVersion: { increment: 1 } } });
    }
    await tx.userDeviceAccess.deleteMany({ where: { userId } });
    if (role === Role.COMPANY_ADMIN && deviceIds.length > 0) {
      await tx.userDeviceAccess.createMany({ data: [...new Set(deviceIds)].map((deviceId) => ({ userId, deviceId })), skipDuplicates: true });
    }
  });

  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
  revalidatePath("/dashboard", "layout");
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function deleteDashboardUserAction(formData: FormData) {
  return runFormAction(() => deleteDashboardUserActionImpl(formData));
}

async function deleteDashboardUserActionImpl(formData: FormData) {
  const currentUser = await assertSuperadminUser();
  const userId = getId(formData, "userId");

  if (!userId || userId === currentUser.id) {
    throw new ActionError("Kullanici silinemez.");
  }

  await prisma.user.deleteMany({ where: { id: userId } });
  revalidatePath("/dashboard/users");
  redirect("/dashboard/users");
}
