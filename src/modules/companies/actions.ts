"use server";

import { ActionError } from "@/lib/action-error";
import { runFormAction } from "@/lib/run-form-action";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS, READY_COMPANY_ROLES } from "@/lib/permission-catalog";
import { ALL_MODULE_KEYS, defaultRoleModules } from "@/lib/module-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { isValidOptionalUsername, normalizeOptionalUsername } from "@/lib/user-identity";
import { getString, getStringList, getId, getOptionalNumber, getReturnTo, redirectToReturnPath } from "@/modules/shared/action-helpers";

function getAttendanceFinalizationDelayMinutes(formData: FormData) {
  const value = getOptionalNumber(formData, "attendanceFinalizationDelayMinutes") ?? 120;
  if (!Number.isInteger(value) || value < 30 || value > 720) {
    throw new ActionError("Mesai sonu kesinleştirme toleransı 30–720 dakika arasında olmalıdır.");
  }
  return value;
}

export async function createCompanyAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN" && user.role !== "COMPANY_ADMIN") {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyName = getString(formData, "companyName");
  const contactName = getString(formData, "contactName");
  const contactEmail = getString(formData, "contactEmail").toLowerCase();
  const contactPhone = getString(formData, "contactPhone");
  const address = getString(formData, "address");
  const city = getString(formData, "city");
  const district = getString(formData, "district");
  const category = getString(formData, "category");
  const attendanceFinalizationDelayMinutes = getAttendanceFinalizationDelayMinutes(formData);
  const adminFirstName = getString(formData, "adminFirstName");
  const adminLastName = getString(formData, "adminLastName");
  const adminEmail = getString(formData, "adminEmail").toLowerCase();
  const adminUsername = getString(formData, "adminUsername").toLowerCase();
  const adminPhone = getString(formData, "adminPhone");
  const adminPassword = getString(formData, "adminPassword");
  const requestedModuleKeys = getStringList(formData, "moduleKeys").filter((key) => ALL_MODULE_KEYS.includes(key as never));
  const entitlementRows = user.role === "COMPANY_ADMIN"
    ? await prisma.userModuleEntitlement.findMany({ where: { userId: user.id }, select: { moduleKey: true } })
    : [];
  const moduleKeys = user.role === "SUPERADMIN"
    ? requestedModuleKeys
    : entitlementRows.map((item) => item.moduleKey).filter((key) => ALL_MODULE_KEYS.includes(key as never));

  if (!companyName || !moduleKeys.length || (user.role === "SUPERADMIN" && (!adminFirstName || !adminLastName || !adminEmail || !adminUsername || !adminPassword))) {
    throw new Error("Sirket ve firma yoneticisi bilgileri eksik.");
  }

  await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: companyName,
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        address: address || null,
        city: city || null,
        district: district || null,
        category: category || null,
        attendanceFinalizationDelayMinutes,
      },
    });

    if (user.role === "SUPERADMIN") {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const adminUser = await tx.user.create({
        data: {
          name: `${adminFirstName} ${adminLastName}`.trim(),
          firstName: adminFirstName,
          lastName: adminLastName,
          username: adminUsername,
          email: adminEmail,
          phone: adminPhone || null,
          password: passwordHash,
          role: "COMPANY_ADMIN",
          companyId: company.id,
        },
      });

      await tx.userCompanyAccess.create({
        data: {
          userId: adminUser.id,
          companyId: company.id,
        },
      });
      let ownerRoleId = 0;
      for (const definition of READY_COMPANY_ROLES) {
        const roleModuleKeys = defaultRoleModules(definition.key).filter((moduleKey) => moduleKeys.includes(moduleKey));
        const role = await tx.companyRole.create({ data: { companyId: company.id, key: definition.key, name: definition.name, description: definition.description, isSystem: true, permissions: { create: definition.permissions.map((permission) => ({ permission })) }, modules: { create: roleModuleKeys.map((moduleKey) => ({ moduleKey })) } } });
        if (definition.key === "OWNER") ownerRoleId = role.id;
      }
      await tx.companyMembership.create({ data: { userId: adminUser.id, companyId: company.id, roleId: ownerRoleId, status: "ACTIVE", scopeMode: "COMPANY", modules: { create: moduleKeys.map((moduleKey) => ({ moduleKey })) } } });
      await tx.userModuleEntitlement.createMany({ data: moduleKeys.map((moduleKey) => ({ userId: adminUser.id, moduleKey })), skipDuplicates: true });
    } else {
      let ownerRoleId = 0;
      for (const definition of READY_COMPANY_ROLES) {
        const roleModuleKeys = defaultRoleModules(definition.key).filter((moduleKey) => moduleKeys.includes(moduleKey));
        const role = await tx.companyRole.create({ data: { companyId: company.id, key: definition.key, name: definition.name, description: definition.description, isSystem: true, permissions: { create: definition.permissions.map((permission) => ({ permission })) }, modules: { create: roleModuleKeys.map((moduleKey) => ({ moduleKey })) } } });
        if (definition.key === "OWNER") ownerRoleId = role.id;
      }
      await tx.user.update({ where: { id: user.id }, data: { companyId: company.id } });
      await tx.userCompanyAccess.create({ data: { userId: user.id, companyId: company.id } });
      await tx.companyMembership.create({ data: { userId: user.id, companyId: company.id, roleId: ownerRoleId, status: "ACTIVE", scopeMode: "COMPANY", modules: { create: moduleKeys.map((moduleKey) => ({ moduleKey })) } } });
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/companies");
  if (getReturnTo(formData)) redirectToReturnPath(formData, "/dashboard/companies");
}

export async function updateCompanyAction(formData: FormData) {
  return runFormAction(() => updateCompanyActionImpl(formData));
}

async function updateCompanyActionImpl(formData: FormData) {
  const { user, authorization } = await requireSessionUser();

  if (user.role !== "SUPERADMIN" && user.role !== "COMPANY_ADMIN") {
    throw new Error("Bu islem icin yetkiniz yok.");
  }
  if (user.role !== "SUPERADMIN") assertPermission(authorization, PERMISSIONS.COMPANY_UPDATE);

  const companyId = getId(formData, "companyId");
  const adminId = getId(formData, "adminId");
  const companyName = getString(formData, "companyName");
  const contactName = getString(formData, "contactName");
  const contactEmail = getString(formData, "contactEmail").toLowerCase();
  const contactPhone = getString(formData, "contactPhone");
  const address = getString(formData, "address");
  const city = getString(formData, "city");
  const district = getString(formData, "district");
  const category = getString(formData, "category");
  const attendanceFinalizationDelayMinutes = getAttendanceFinalizationDelayMinutes(formData);
  const adminFirstName = getString(formData, "adminFirstName");
  const adminLastName = getString(formData, "adminLastName");
  const adminEmail = getString(formData, "adminEmail").toLowerCase();
  const adminUsername = normalizeOptionalUsername(getString(formData, "adminUsername"));
  const adminPhone = getString(formData, "adminPhone");
  const adminPassword = getString(formData, "adminPassword");
  const moduleKeys = getStringList(formData, "moduleKeys").filter((key) => ALL_MODULE_KEYS.includes(key as never));
  const isActive = user.role === "SUPERADMIN" ? formData.get("isActive") === "on" : true;

  if (
    !companyId ||
    !companyName ||
    (user.role === "SUPERADMIN" && (!adminId || !adminFirstName || !adminLastName || !adminEmail || !moduleKeys.length))
  ) {
    throw new ActionError("Firma ve admin bilgileri eksik.");
  }

  if (!isValidOptionalUsername(adminUsername)) {
    throw new ActionError("Kullanıcı adı 3–64 karakter olmalı; yalnız İngilizce harf, rakam, nokta, alt çizgi veya tire içermelidir.");
  }

  if (user.role === "COMPANY_ADMIN") {
    if (authorization.companyId !== companyId) {
      throw new Error("Bu firma icin yetkiniz yok.");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.company.update({
      where: { id: companyId },
      data: {
        name: companyName,
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        address: address || null,
        city: city || null,
        district: district || null,
        category: category || null,
        attendanceFinalizationDelayMinutes,
        isActive,
      },
    });

    if (user.role === "SUPERADMIN") {
      await tx.user.update({
        where: { id: adminId },
        data: {
          name: `${adminFirstName} ${adminLastName}`.trim(),
          firstName: adminFirstName,
          lastName: adminLastName,
          username: adminUsername,
          email: adminEmail,
          phone: adminPhone || null,
          ...(adminPassword ? { password: await bcrypt.hash(adminPassword, 10) } : {}),
        },
      });

      await tx.userModuleEntitlement.deleteMany({ where: { userId: adminId } });
      await tx.userModuleEntitlement.createMany({
        data: moduleKeys.map((moduleKey) => ({ userId: adminId, moduleKey })),
      });

      await tx.userCompanyAccess.upsert({
        where: {
          userId_companyId: {
            userId: adminId,
            companyId,
          },
        },
        create: {
          userId: adminId,
          companyId,
        },
        update: {},
      });
      const adminMembership = await tx.companyMembership.findFirst({ where: { companyId, userId: adminId } });
      if (!adminMembership) throw new Error("Firma admin üyeliği bulunamadı.");
      await tx.membershipModule.deleteMany({ where: { membershipId: adminMembership.id } });
      await tx.membershipModule.createMany({ data: moduleKeys.map((moduleKey) => ({ membershipId: adminMembership.id, moduleKey })) });
      await tx.companyMembership.updateMany({
        where: { companyId },
        data: { sessionVersion: { increment: 1 } },
      });
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/companies");
  revalidatePath(`/dashboard/companies/${companyId}`);
}

export async function deleteCompanyAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = getId(formData, "companyId");

  if (!companyId) {
    throw new Error("Firma bilgisi eksik.");
  }

  await prisma.company.delete({
    where: { id: companyId },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/companies");
  redirect("/dashboard/companies");
}
