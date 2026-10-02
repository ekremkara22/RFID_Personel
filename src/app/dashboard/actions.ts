"use server";

import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AttendanceType,
  CalendarApprovalStatus,
  CalendarScopeType,
  DataScopeMode,
  DevicePurpose,
  LeaveApprovalStatus,
  LeaveDurationType,
  LeaveType,
  PayrollPeriodStatus,
  Role,
  SpecialDayType,
  WorkDayType,
} from "@/generated/prisma/client";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { assertPermission, deviceScopeWhere, employeeScopeWhere } from "@/lib/authorization";
import { PERMISSIONS, READY_COMPANY_ROLES } from "@/lib/permission-catalog";
import { ALL_MODULE_KEYS, defaultRoleModules } from "@/lib/module-catalog";
import { prisma } from "@/lib/prisma";
import {
  assertPayrollPeriodUnlocked,
  buildPayrollSnapshot,
  getDefaultPayrollMonth,
  getPayrollMonthRange,
  PAYROLL_MONTH_PATTERN,
} from "@/lib/payroll-period";
import { requireSessionUser } from "@/lib/session";
import { calculateGrossMinutes, calculateNetMinutes } from "@/lib/work-calendar-rules";
import { saveResolvedEmployeeWorkCalendar } from "@/lib/work-calendar";
import { isValidOptionalUsername, normalizeOptionalUsername } from "@/lib/user-identity";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getStringList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseIdValue(value: string, fieldName: string) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`${fieldName} bilgisi gecersiz.`);
  }
  return id;
}

function getId(formData: FormData, key: string) {
  return parseIdValue(getString(formData, key), key);
}

function getOptionalId(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value ? parseIdValue(value, key) : null;
}

function getIdList(formData: FormData, key: string) {
  return getStringList(formData, key).map((value) => parseIdValue(value, key));
}

function normalizeOptionalEmail(email: string) {
  return email ? email.toLowerCase() : null;
}

function normalizeOptionalRfidCardId(cardId: string) {
  return cardId ? cardId.toUpperCase() : null;
}

const defaultRoleNames: Record<Role, string> = {
  SUPERADMIN: "Super Admin",
  COMPANY_ADMIN: "Firma Admin",
  EMPLOYEE: "Personel",
};

async function getAssignableRole(formData: FormData) {
  const role = getString(formData, "role") as Role;
  const allowedRoles = new Set<string>(Object.values(Role));

  if (!allowedRoles.has(role)) {
    throw new Error("Rol bilgisi gecersiz.");
  }

  const configuredRoles = await prisma.roleDefinition.findMany({
    where: { isActive: true },
    select: { code: true },
  });

  if (configuredRoles.length > 0 && !configuredRoles.some((item) => item.code === role)) {
    throw new Error("Secilen rol aktif degil.");
  }

  return role;
}

function getOptionalDate(formData: FormData, key: string) {
  const value = getString(formData, key);
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getOptionalNumber(formData: FormData, key: string) {
  const value = getString(formData, key);
  if (!value) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function getRequiredDate(formData: FormData, key: string) {
  const date = getOptionalDate(formData, key);
  if (!date) throw new Error("Tarih bilgisi gecersiz.");
  return date;
}

function parseCalendarScope(formData: FormData) {
  const scopeType = getString(formData, "scopeType") as CalendarScopeType;
  const allowedScopes = new Set<string>(Object.values(CalendarScopeType));

  if (!allowedScopes.has(scopeType)) {
    throw new Error("Takvim kapsami gecersiz.");
  }

  return {
    scopeType,
    branchId: scopeType === CalendarScopeType.BRANCH ? getOptionalId(formData, "branchId") : null,
    departmentId: scopeType === CalendarScopeType.DEPARTMENT ? getOptionalId(formData, "departmentId") : null,
    employeeId: scopeType === CalendarScopeType.EMPLOYEE ? getOptionalId(formData, "employeeId") : null,
  };
}

async function assertCalendarScopeBelongsToCompany(
  companyId: number,
  scope: ReturnType<typeof parseCalendarScope>,
) {
  if (scope.branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: scope.branchId, companyId },
      select: { id: true },
    });

    if (!branch) {
      throw new Error("Secilen sube firmaya ait degil.");
    }
  }

  if (scope.departmentId) {
    const department = await prisma.department.findFirst({
      where: { id: scope.departmentId, companyId },
      select: { id: true },
    });

    if (!department) {
      throw new Error("Secilen departman firmaya ait degil.");
    }
  }

  if (scope.employeeId) {
    const employee = await prisma.employee.findFirst({
      where: { id: scope.employeeId, companyId },
      select: { id: true },
    });

    if (!employee) {
      throw new Error("Secilen personel firmaya ait degil.");
    }
  }
}

function buildWeekdayPayload(formData: FormData) {
  return Array.from({ length: 7 }, (_, index) => {
    const weekday = index + 1;
    const dayType = getString(formData, `weekday-${weekday}-dayType`) as WorkDayType;
    const startTime = getString(formData, `weekday-${weekday}-startTime`) || null;
    const endTime = getString(formData, `weekday-${weekday}-endTime`) || null;
    const breakStartTime = getString(formData, `weekday-${weekday}-breakStartTime`) || null;
    const breakEndTime = getString(formData, `weekday-${weekday}-breakEndTime`) || null;
    const crossesMidnight = formData.get(`weekday-${weekday}-crossesMidnight`) === "on";
    const breakMinutes = getOptionalNumber(formData, `weekday-${weekday}-breakMinutes`) ?? 0;
    const grossMinutes = calculateGrossMinutes(startTime, endTime, crossesMidnight);

    return {
      weekday,
      dayType: Object.values(WorkDayType).includes(dayType) ? dayType : WorkDayType.NON_WORKING,
      startTime,
      endTime,
      breakStartTime,
      breakEndTime,
      crossesMidnight,
      breakMinutes,
      plannedGrossMinutes: grossMinutes,
      plannedNetMinutes: calculateNetMinutes(startTime, endTime, breakMinutes, crossesMidnight),
      checkLateArrival: formData.get(`weekday-${weekday}-checkLateArrival`) === "on",
      checkEarlyDeparture: formData.get(`weekday-${weekday}-checkEarlyDeparture`) === "on",
      checkAbsence: formData.get(`weekday-${weekday}-checkAbsence`) === "on",
    };
  });
}

function revalidateCalendarPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/templates");
  revalidatePath("/dashboard/calendar/official-holidays");
  revalidatePath("/dashboard/calendar/special-days");
  revalidatePath("/dashboard/calendar/assignments");
  revalidatePath("/dashboard/calendar/exceptions");
  revalidatePath("/dashboard/calendar/conflicts");
  revalidatePath("/dashboard/calendar/change-logs");
  revalidatePath("/dashboard/reports");
}

function getReturnTo(formData: FormData) {
  const returnTo = getString(formData, "returnTo");
  return returnTo.startsWith("/dashboard") ? returnTo : "";
}

function redirectToReturnPath(formData: FormData, fallback?: string) {
  redirect(getReturnTo(formData) || fallback || "/dashboard");
}

async function saveEmployeePhoto(formData: FormData, fallback?: string | null) {
  const file = formData.get("photo");

  if (!(file instanceof File) || file.size === 0) {
    return fallback ?? null;
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Personel resmi icin gecerli bir gorsel dosyasi secilmelidir.");
  }

  const extension = path.extname(file.name).toLowerCase() || ".jpg";
  const filename = `${randomUUID()}${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "employees");

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

  return `/uploads/employees/${filename}`;
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
  const adminFirstName = getString(formData, "adminFirstName");
  const adminLastName = getString(formData, "adminLastName");
  const adminEmail = getString(formData, "adminEmail").toLowerCase();
  const adminUsername = getString(formData, "adminUsername").toLowerCase();
  const adminPhone = getString(formData, "adminPhone");
  const adminPassword = getString(formData, "adminPassword");
  const moduleKeys = getStringList(formData, "moduleKeys").filter((key) => ALL_MODULE_KEYS.includes(key as never));
  const isActive = user.role === "SUPERADMIN" ? formData.get("isActive") === "on" : true;

  if (
    !companyId ||
    !companyName ||
    (user.role === "SUPERADMIN" && (!adminId || !adminFirstName || !adminLastName || !adminEmail || !adminUsername || !moduleKeys.length))
  ) {
    throw new Error("Firma ve admin bilgileri eksik.");
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
      await tx.companyMembership.update({ where: { id: adminMembership.id }, data: { sessionVersion: { increment: 1 } } });
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

async function assertSuperadminUser() {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  return user;
}

export async function createDashboardUserAction(formData: FormData) {
  await assertSuperadminUser();

  const firstName = getString(formData, "firstName");
  const lastName = getString(formData, "lastName");
  const email = normalizeOptionalEmail(getString(formData, "email"));
  const username = normalizeOptionalUsername(getString(formData, "username"));
  const phone = getString(formData, "phone");
  const password = getString(formData, "password");
  const role = await getAssignableRole(formData);
  const moduleKeys = [...new Set(getStringList(formData, "moduleKeys").filter((key) => ALL_MODULE_KEYS.includes(key as never)))];

  if (!firstName || !lastName || !email || !password || !username || !/^[a-z0-9._-]{3,64}$/.test(username)) {
    throw new Error("Kullanici bilgileri eksik.");
  }
  if (password.length < 10) throw new Error("Şifre en az 10 karakter olmalıdır.");
  if (role !== Role.COMPANY_ADMIN) throw new Error("Bu ekrandan yalnız firma admini oluşturulabilir.");
  if (!moduleKeys.length) throw new Error("Firma admini için en az bir modül lisansı seçilmelidir.");

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { firstName, lastName, name: `${firstName} ${lastName}`.trim(), username, email, phone: phone || null, password: passwordHash, role, companyId: null } });
    await tx.userModuleEntitlement.createMany({ data: moduleKeys.map((moduleKey) => ({ userId: created.id, moduleKey })) });
  });

  revalidatePath("/dashboard/users");
  redirect("/dashboard/users");
}

export async function updateDashboardUserAction(formData: FormData) {
  const currentUser = await assertSuperadminUser();

  const userId = getId(formData, "userId");
  const firstName = getString(formData, "firstName");
  const lastName = getString(formData, "lastName");
  const email = normalizeOptionalEmail(getString(formData, "email"));
  const username = normalizeOptionalUsername(getString(formData, "username"));
  const phone = getString(formData, "phone");
  const password = getString(formData, "password");
  const moduleKeys = [...new Set(getStringList(formData, "moduleKeys").filter((key) => ALL_MODULE_KEYS.includes(key as never)))];
  const deviceIds = getIdList(formData, "deviceIds");
  const targetUser = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    : null;
  const role = await getAssignableRole(formData);

  if (!userId || !targetUser || !firstName || !lastName || !email || !isValidOptionalUsername(username)) {
    throw new Error("Kullanici bilgileri eksik.");
  }

  if (userId === currentUser.id && role !== Role.SUPERADMIN) {
    throw new Error("Kendi super admin rolunuzu degistiremezsiniz.");
  }
  if (role !== Role.SUPERADMIN && role !== Role.COMPANY_ADMIN) throw new Error("Bu ekrandan yalnız süper admin veya firma admini yönetilebilir.");
  if (role === Role.COMPANY_ADMIN && !moduleKeys.length) throw new Error("Firma admini için en az bir modül lisansı seçilmelidir.");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { firstName, lastName, username, name: `${firstName} ${lastName}`.trim(), email, phone: phone || null, role, ...(password ? { password: await bcrypt.hash(password, 10) } : {}) },
    });
    await tx.userModuleEntitlement.deleteMany({ where: { userId } });
    if (role === Role.COMPANY_ADMIN) {
      await tx.userModuleEntitlement.createMany({ data: moduleKeys.map((moduleKey) => ({ userId, moduleKey })) });
      const memberships = await tx.companyMembership.findMany({ where: { userId }, select: { id: true, companyId: true, role: { select: { key: true } } } });
      const ownedCompanyIds = memberships.filter((membership) => membership.role.key === "OWNER").map((membership) => membership.companyId);
      if (ownedCompanyIds.length > 0) {
        await tx.membershipModule.deleteMany({
          where: { membership: { companyId: { in: ownedCompanyIds } }, moduleKey: { notIn: moduleKeys } },
        });
        await tx.companyRoleModule.deleteMany({
          where: { role: { companyId: { in: ownedCompanyIds } }, moduleKey: { notIn: moduleKeys } },
        });
      }
      await tx.membershipModule.deleteMany({ where: { membershipId: { in: memberships.map((item) => item.id) } } });
      if (memberships.length > 0) {
        await tx.membershipModule.createMany({
          data: memberships.flatMap((membership) => moduleKeys.map((moduleKey) => ({ membershipId: membership.id, moduleKey }))),
          skipDuplicates: true,
        });
      }
    }
    await tx.userDeviceAccess.deleteMany({ where: { userId } });
    if (role === Role.COMPANY_ADMIN && deviceIds.length > 0) {
      await tx.userDeviceAccess.createMany({ data: [...new Set(deviceIds)].map((deviceId) => ({ userId, deviceId })), skipDuplicates: true });
    }
  });

  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function deleteDashboardUserAction(formData: FormData) {
  const currentUser = await assertSuperadminUser();
  const userId = getId(formData, "userId");

  if (!userId || userId === currentUser.id) {
    throw new Error("Kullanici silinemez.");
  }

  await prisma.user.deleteMany({ where: { id: userId } });
  revalidatePath("/dashboard/users");
  redirect("/dashboard/users");
}

export async function createRoleDefinitionAction(formData: FormData) {
  await assertSuperadminUser();

  const code = getString(formData, "code") as Role;
  const name = getString(formData, "name") || defaultRoleNames[code];
  const description = getString(formData, "description") || null;

  if (!Object.values(Role).includes(code) || !name) {
    throw new Error("Rol bilgileri eksik.");
  }

  await prisma.roleDefinition.upsert({
    where: { code },
    create: {
      code,
      name,
      description,
      isActive: true,
    },
    update: {
      name,
      description,
      isActive: true,
    },
  });

  revalidatePath("/dashboard/settings/roles");
}

export async function updateRoleDefinitionAction(formData: FormData) {
  await assertSuperadminUser();

  const roleDefinitionId = getId(formData, "roleDefinitionId");
  const name = getString(formData, "name");
  const description = getString(formData, "description") || null;
  const isActive = formData.get("isActive") === "on";

  if (!roleDefinitionId || !name) {
    throw new Error("Rol bilgileri eksik.");
  }

  await prisma.roleDefinition.update({
    where: { id: roleDefinitionId },
    data: {
      name,
      description,
      isActive,
    },
  });

  revalidatePath("/dashboard/settings/roles");
  revalidatePath("/dashboard/users");
}

export async function createCompanyCategoryAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const name = getString(formData, "name");

  if (!name) {
    throw new Error("Kategori adi zorunludur.");
  }

  await prisma.companyCategory.create({
    data: { name },
  });

  revalidatePath("/dashboard/settings/company-categories");
  revalidatePath("/dashboard/companies/new");
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function updateCompanyCategoryAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const categoryId = getId(formData, "categoryId");
  const name = getString(formData, "name");
  const isActive = formData.get("isActive") === "on";

  if (!categoryId || !name) {
    throw new Error("Kategori bilgileri eksik.");
  }

  await prisma.companyCategory.update({
    where: { id: categoryId },
    data: { name, isActive },
  });

  revalidatePath("/dashboard/settings/company-categories");
  revalidatePath("/dashboard/companies");
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function deleteCompanyCategoryAction(formData: FormData) {
  const { user } = await requireSessionUser();
  if (user.role !== "SUPERADMIN") throw new Error("Bu islem icin yetkiniz yok.");

  const categoryId = getId(formData, "categoryId");
  const category = await prisma.companyCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw new Error("Firma kategorisi bulunamadi.");

  const companyCount = await prisma.company.count({ where: { category: category.name } });
  if (companyCount > 0) {
    throw new Error("Bu kategori firmalarda kullaniliyor. Once ilgili firmalarin kategorisini degistirin.");
  }

  await prisma.companyCategory.delete({ where: { id: categoryId } });
  revalidatePath("/dashboard/settings/company-categories");
  revalidatePath("/dashboard/companies");
  redirect("/dashboard/settings/company-categories");
}

async function assertCompanyDepartment(companyId: number, department: string) {
  const existingDepartment = await prisma.department.findFirst({
    where: {
      companyId,
      name: department,
      isActive: true,
    },
  });

  if (!existingDepartment) {
    throw new Error("Secilen departman firma tanimlarinda aktif degil.");
  }
  return existingDepartment;
}

export async function createDepartmentAction(formData: FormData) {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.SETTINGS_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");

  const name = getString(formData, "name");

  if (!name) {
    throw new Error("Departman adi zorunludur.");
  }

  await prisma.department.create({
    data: {
      name,
      companyId: authorization.companyId,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/settings/departments");
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function updateDepartmentAction(formData: FormData) {
  const { authorization } = await requireSessionUser();
  assertPermission(authorization, PERMISSIONS.SETTINGS_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");

  const departmentId = getId(formData, "departmentId");
  const name = getString(formData, "name");
  const isActive = formData.get("isActive") === "on";

  if (!departmentId || !name) {
    throw new Error("Departman bilgileri eksik.");
  }

  await prisma.department.updateMany({
    where: {
      id: departmentId,
      companyId: authorization.companyId,
    },
    data: { name, isActive },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/settings/departments");
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function deleteDepartmentAction(formData: FormData) {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.SETTINGS_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");

  const departmentId = getId(formData, "departmentId");
  const department = await prisma.department.findFirst({ where: { id: departmentId, companyId: authorization.companyId } });
  if (!department) throw new Error("Departman bulunamadi.");

  const [employeeCount, assignmentCount, specialDayCount, exceptionCount] = await Promise.all([
    prisma.employee.count({ where: { companyId: authorization.companyId, departmentId } }),
    prisma.calendarAssignment.count({ where: { departmentId } }),
    prisma.calendarSpecialDay.count({ where: { departmentId } }),
    prisma.calendarDailyException.count({ where: { departmentId } }),
  ]);
  if (employeeCount + assignmentCount + specialDayCount + exceptionCount > 0) {
    throw new Error("Bu departman personel veya takvim kayitlarinda kullaniliyor. Silmek yerine pasif yapin.");
  }

  await prisma.department.delete({ where: { id: departmentId } });
  revalidatePath("/dashboard/settings/departments");
  redirect("/dashboard/settings/departments");
}

export async function createBranchAction(formData: FormData) {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.SETTINGS_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const name = getString(formData, "name");
  const location = getString(formData, "location");

  if (!name) {
    throw new Error("Sube adi zorunludur.");
  }

  await prisma.branch.create({
    data: {
      name,
      location: location || null,
      companyId,
    },
  });

  revalidatePath("/dashboard/settings/branches");
  revalidatePath("/dashboard/employees");
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function updateBranchAction(formData: FormData) {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.SETTINGS_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");

  const branchId = getId(formData, "branchId");
  const companyId = authorization.companyId;
  const name = getString(formData, "name");
  const location = getString(formData, "location");
  const isActive = formData.get("isActive") === "on";

  if (!branchId || !name) {
    throw new Error("Sube bilgileri eksik.");
  }

  await prisma.branch.updateMany({
    where: { id: branchId, companyId },
    data: { name, location: location || null, isActive },
  });

  revalidatePath("/dashboard/settings/branches");
  revalidatePath("/dashboard/employees");
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function deleteBranchAction(formData: FormData) {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.SETTINGS_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");

  const branchId = getId(formData, "branchId");
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, companyId: authorization.companyId },
  });
  if (!branch) throw new Error("Sube bulunamadi.");

  const [employeeCount, assignmentCount, specialDayCount, exceptionCount] = await Promise.all([
    prisma.employee.count({ where: { companyId: branch.companyId, branchId } }),
    prisma.calendarAssignment.count({ where: { branchId } }),
    prisma.calendarSpecialDay.count({ where: { branchId } }),
    prisma.calendarDailyException.count({ where: { branchId } }),
  ]);
  if (employeeCount + assignmentCount + specialDayCount + exceptionCount > 0) {
    throw new Error("Bu sube personel veya takvim kayitlarinda kullaniliyor. Silmek yerine pasif yapin.");
  }

  await prisma.branch.delete({ where: { id: branchId } });
  revalidatePath("/dashboard/settings/branches");
  redirect("/dashboard/settings/branches");
}

export async function createManagerAction(formData: FormData) {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.SETTINGS_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");

  const name = getString(formData, "name");
  const email = normalizeOptionalEmail(getString(formData, "email"));

  if (!name) {
    throw new Error("Yonetici adi zorunludur.");
  }

  await prisma.manager.create({
    data: {
      name,
      email,
      companyId: authorization.companyId,
    },
  });

  revalidatePath("/dashboard/settings/managers");
  revalidatePath("/dashboard/employees");
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function updateManagerAction(formData: FormData) {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.SETTINGS_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");

  const managerId = getId(formData, "managerId");
  const name = getString(formData, "name");
  const email = normalizeOptionalEmail(getString(formData, "email"));
  const isActive = formData.get("isActive") === "on";

  if (!managerId || !name) {
    throw new Error("Yonetici bilgileri eksik.");
  }

  await prisma.manager.updateMany({
    where: {
      id: managerId,
      companyId: authorization.companyId,
    },
    data: { name, email, isActive },
  });

  revalidatePath("/dashboard/settings/managers");
  revalidatePath("/dashboard/employees");
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function deleteManagerAction(formData: FormData) {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.SETTINGS_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");

  const managerId = getId(formData, "managerId");
  const manager = await prisma.manager.findFirst({ where: { id: managerId, companyId: authorization.companyId } });
  if (!manager) throw new Error("Yonetici bulunamadi.");

  const employeeCount = await prisma.employee.count({ where: { companyId: authorization.companyId, managerName: manager.name } });
  if (employeeCount > 0) {
    throw new Error("Bu yonetici personel kayitlarinda kullaniliyor. Silmek yerine pasif yapin.");
  }

  await prisma.manager.delete({ where: { id: managerId } });
  revalidatePath("/dashboard/settings/managers");
  redirect("/dashboard/settings/managers");
}

export async function createEmployeeAction(formData: FormData) {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.PERSONNEL_CREATE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");

  const firstName = getString(formData, "firstName");
  const lastName = getString(formData, "lastName");
  const companyId = authorization.companyId;
  const email = normalizeOptionalEmail(getString(formData, "email"));
  const password = getString(formData, "password");
  const department = getString(formData, "department");
  const registrationNumber = getString(formData, "registrationNumber") || null;
  const branch = getString(formData, "branch") || null;
  const managerName = getString(formData, "managerName") || null;
  const hireDate = getOptionalDate(formData, "hireDate");
  const terminationDate = getOptionalDate(formData, "terminationDate");
  const rfidCardId = normalizeOptionalRfidCardId(getString(formData, "rfidCardId"));
  const age = Number(getString(formData, "age") || "18");
  const photoUrl = await saveEmployeePhoto(formData);

  if (!firstName || !lastName || !department || !Number.isFinite(age) || age < 16) {
    throw new Error("Personel bilgileri gecersiz.");
  }

  const departmentRef = await assertCompanyDepartment(companyId, department);
  const branchRef = branch ? await prisma.branch.findFirst({ where: { companyId, name: branch, isActive: true } }) : null;
  if (branch && !branchRef) throw new Error("Secilen sube bu firmaya ait degil.");
  if (authorization.scopeMode === "OWN" || authorization.scopeMode === "NONE" || (authorization.scopeMode === "RESTRICTED" && (authorization.employeeIds.length > 0 || authorization.teamEmployeeIds.length > 0))) throw new Error("Bu veri kapsaminda yeni personel olusturamazsiniz.");
  if (authorization.scopeMode === "RESTRICTED" && authorization.branchIds.length && (!branchRef || !authorization.branchIds.includes(branchRef.id))) throw new Error("Secilen sube yetki kapsaminizda degil.");
  if (authorization.scopeMode === "RESTRICTED" && authorization.departmentIds.length && !authorization.departmentIds.includes(departmentRef.id)) throw new Error("Secilen departman yetki kapsaminizda degil.");

  await prisma.employee.create({
    data: {
      firstName,
      lastName,
      photoUrl,
      registrationNumber,
      email,
      password: password ? await bcrypt.hash(password, 10) : null,
      department,
      departmentId: departmentRef.id,
      branch,
      branchId: branchRef?.id ?? null,
      managerName,
      hireDate,
      terminationDate,
      age,
      rfidCardId,
      companyId,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  redirect("/dashboard/employees");
}

export async function updateEmployeeAction(formData: FormData) {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.PERSONNEL_UPDATE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");

  const employeeId = getId(formData, "employeeId");
  const firstName = getString(formData, "firstName");
  const lastName = getString(formData, "lastName");
  const companyId = authorization.companyId;
  const email = normalizeOptionalEmail(getString(formData, "email"));
  const password = getString(formData, "password");
  const department = getString(formData, "department");
  const registrationNumber = getString(formData, "registrationNumber") || null;
  const branch = getString(formData, "branch") || null;
  const managerName = getString(formData, "managerName") || null;
  const hireDate = getOptionalDate(formData, "hireDate");
  const terminationDate = getOptionalDate(formData, "terminationDate");
  const rfidCardId = normalizeOptionalRfidCardId(getString(formData, "rfidCardId"));
  const age = Number(getString(formData, "age") || "18");
  const isActive = formData.get("isActive") === "on";

  if (!employeeId || !firstName || !lastName || !department || !Number.isFinite(age) || age < 16) {
    throw new Error("Personel bilgileri gecersiz.");
  }

  const departmentRef = await assertCompanyDepartment(companyId, department);
  const branchRef = branch ? await prisma.branch.findFirst({ where: { companyId, name: branch, isActive: true } }) : null;
  if (branch && !branchRef) throw new Error("Secilen sube bu firmaya ait degil.");
  const currentEmployee = await prisma.employee.findFirst({
    where: { id: employeeId, ...employeeScopeWhere(authorization) },
    select: { photoUrl: true },
  });
  if (!currentEmployee) throw new Error("Personel bulunamadi veya yetki kapsaminizin disinda.");
  if (authorization.scopeMode === "RESTRICTED" && authorization.branchIds.length && (!branchRef || !authorization.branchIds.includes(branchRef.id))) throw new Error("Secilen sube yetki kapsaminizda degil.");
  if (authorization.scopeMode === "RESTRICTED" && authorization.departmentIds.length && !authorization.departmentIds.includes(departmentRef.id)) throw new Error("Secilen departman yetki kapsaminizda degil.");
  const photoUrl = await saveEmployeePhoto(formData, currentEmployee?.photoUrl);

  await prisma.employee.updateMany({
    where: {
      id: employeeId,
      ...employeeScopeWhere(authorization),
    },
    data: {
      firstName,
      lastName,
      photoUrl,
      registrationNumber,
      email,
      department,
      departmentId: departmentRef.id,
      branch,
      branchId: branchRef?.id ?? null,
      managerName,
      hireDate,
      terminationDate,
      age,
      rfidCardId,
      companyId,
      isActive,
      ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  revalidatePath(`/dashboard/employees/${employeeId}`);
}

export async function deleteEmployeeAction(formData: FormData) {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.PERSONNEL_DELETE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");

  const employeeId = getId(formData, "employeeId");

  if (!employeeId) {
    throw new Error("Personel bilgisi eksik.");
  }

  const currentEmployee = await prisma.employee.findFirst({
    where: { id: employeeId, ...employeeScopeWhere(authorization) },
    select: { terminationDate: true },
  });

  await prisma.employee.updateMany({
    where: {
      id: employeeId,
      ...employeeScopeWhere(authorization),
    },
    data: {
      isActive: false,
      terminationDate: currentEmployee?.terminationDate ?? new Date(),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  redirect("/dashboard/employees");
}

export async function createCompanyDeviceAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = getId(formData, "companyId");
  const code = getString(formData, "code") || null;
  const name = getString(formData, "name");
  const macAddress = getString(formData, "macAddress");
  const ipAddress = getString(formData, "ipAddress") || null;
  const branchLocation = getString(formData, "branchLocation") || null;
  const purpose = getString(formData, "purpose") as DevicePurpose;
  const clockOffsetMinutesValue = getString(formData, "clockOffsetMinutes");
  const clockOffsetMinutes = clockOffsetMinutesValue ? Number(clockOffsetMinutesValue) : null;
  const allowedPurposes = new Set<string>(Object.values(DevicePurpose));

  if (!companyId || !name || !macAddress || !allowedPurposes.has(purpose)) {
    throw new Error("Cihaz bilgileri eksik.");
  }

  await prisma.device.create({
    data: {
      code,
      name,
      macAddress,
      ipAddress,
      branchLocation,
      purpose,
      clockOffsetMinutes: Number.isFinite(clockOffsetMinutes) ? clockOffsetMinutes : null,
      companyId,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/companies/${companyId}`);
  redirect(`/dashboard/companies/${companyId}?tab=devices`);
}

export async function updateCompanyDeviceAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = getId(formData, "companyId");
  const deviceId = getId(formData, "deviceId");
  const code = getString(formData, "code") || null;
  const name = getString(formData, "name");
  const macAddress = getString(formData, "macAddress");
  const ipAddress = getString(formData, "ipAddress") || null;
  const branchLocation = getString(formData, "branchLocation") || null;
  const purpose = getString(formData, "purpose") as DevicePurpose;
  const clockOffsetMinutesValue = getString(formData, "clockOffsetMinutes");
  const clockOffsetMinutes = clockOffsetMinutesValue ? Number(clockOffsetMinutesValue) : null;
  const allowedPurposes = new Set<string>(Object.values(DevicePurpose));

  if (!companyId || !deviceId || !name || !macAddress || !allowedPurposes.has(purpose)) {
    throw new Error("Cihaz bilgileri eksik.");
  }

  await prisma.device.updateMany({
    where: { id: deviceId, companyId },
    data: {
      code,
      name,
      macAddress,
      ipAddress,
      branchLocation,
      purpose,
      clockOffsetMinutes: Number.isFinite(clockOffsetMinutes) ? clockOffsetMinutes : null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/companies/${companyId}`);
}

export async function deleteCompanyDeviceAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = getId(formData, "companyId");
  const deviceId = getId(formData, "deviceId");

  if (!companyId || !deviceId) {
    throw new Error("Cihaz bilgisi eksik.");
  }

  await prisma.device.deleteMany({
    where: { id: deviceId, companyId },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/companies/${companyId}`);
}

export async function createUserDeviceAction(formData: FormData) {
  await assertSuperadminUser();

  const userId = getId(formData, "userId");
  const code = getString(formData, "code") || null;
  const name = getString(formData, "name");
  const macAddress = getString(formData, "macAddress");
  const ipAddress = getString(formData, "ipAddress") || null;
  const branchLocation = getString(formData, "branchLocation") || null;
  const purpose = getString(formData, "purpose") as DevicePurpose;
  const clockOffsetMinutesValue = getString(formData, "clockOffsetMinutes");
  const clockOffsetMinutes = clockOffsetMinutesValue ? Number(clockOffsetMinutesValue) : null;
  const allowedPurposes = new Set<string>(Object.values(DevicePurpose));

  if (!userId || !name || !macAddress || !allowedPurposes.has(purpose)) {
    throw new Error("Cihaz bilgileri eksik.");
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });

  if (!targetUser) {
    throw new Error("Cihaz atanacak kullanici bulunamadi.");
  }

  const device = await prisma.device.create({
    data: {
      code,
      name,
      macAddress,
      ipAddress,
      branchLocation,
      purpose,
      clockOffsetMinutes: Number.isFinite(clockOffsetMinutes) ? clockOffsetMinutes : null,
    },
  });

  await prisma.userDeviceAccess.create({
    data: {
      userId,
      deviceId: device.id,
    },
  });

  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
  redirect(`/dashboard/users/${userId}?tab=devices`);
}

export async function deleteUserDeviceAccessAction(formData: FormData) {
  await assertSuperadminUser();

  const userId = getId(formData, "userId");
  const deviceId = getId(formData, "deviceId");

  if (!userId || !deviceId) {
    throw new Error("Cihaz bilgisi eksik.");
  }

  await prisma.userDeviceAccess.deleteMany({
    where: {
      userId,
      deviceId,
    },
  });

  revalidatePath("/dashboard/users");
  revalidatePath(`/dashboard/users/${userId}`);
  redirect(`/dashboard/users/${userId}?tab=devices`);
}

export async function updateDeviceAction(formData: FormData) {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.DEVICE_MANAGE);

  const deviceId = getId(formData, "deviceId");
  const companyId = getId(formData, "companyId");
  const name = getString(formData, "name");
  const branchLocation = getString(formData, "branchLocation") || null;

  if (!deviceId || !companyId || !name) {
    throw new Error("Cihaz adi ve firma bilgisi zorunludur.");
  }

  if (authorization.companyId !== companyId) {
    throw new Error("Bu firma icin yetkiniz yok.");
  }
  const assignedDevice = await prisma.device.findFirst({
    where: { id: deviceId, ...deviceScopeWhere(authorization) },
    select: { id: true },
  });

  if (!assignedDevice) {
    throw new Error("Bu cihaz kullaniciya atanmamis.");
  }

  await prisma.device.updateMany({
    where: {
      id: deviceId,
    },
    data: { name, companyId, branchLocation },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/devices");
}

export async function updateAttendanceLogAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.MOVEMENT_UPDATE);

  const logId = getId(formData, "logId");
  const type = getString(formData, "type") as AttendanceType;
  const scannedAtValue = getString(formData, "scannedAt");
  const correctionReason = getString(formData, "correctionReason");
  const allowedTypes = new Set<string>(Object.values(AttendanceType));

  if (!logId || !allowedTypes.has(type) || !scannedAtValue || !correctionReason) {
    throw new Error("Hareket bilgileri gecersiz.");
  }

  const scannedAt = new Date(scannedAtValue);

  if (Number.isNaN(scannedAt.getTime())) {
    throw new Error("Hareket tarihi gecersiz.");
  }

  const oldLog = await prisma.attendanceLog.findFirst({
    where: { id: logId, employee: employeeScopeWhere(authorization) },
    include: { employee: { select: { companyId: true } } },
  });
  if (!oldLog) throw new Error("Hareket bulunamadi veya bu kayit icin yetkiniz yok.");

  await assertPayrollPeriodUnlocked(oldLog.employee.companyId, oldLog.scannedAt);
  await assertPayrollPeriodUnlocked(oldLog.employee.companyId, scannedAt);

  await prisma.$transaction(async (tx) => {
    await tx.attendanceLog.update({ where: { id: logId }, data: { type, scannedAt } });
    await tx.attendanceMovementAudit.create({
      data: {
        sourceLogId: logId,
        employeeId: oldLog.employeeId,
        movementDateTime: scannedAt,
        oldType: oldLog.type,
        newType: type,
        oldScannedAt: oldLog.scannedAt,
        newScannedAt: scannedAt,
        operation: "UPDATE",
        changedById: user.id,
        correctionReason,
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/movements");
  revalidatePath("/dashboard/movement-reviews");
  revalidatePath("/dashboard/reports/payroll");
  redirectToReturnPath(formData, "/dashboard/movements");
}

export async function createAttendanceLogAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.MOVEMENT_CREATE);

  const employeeId = getId(formData, "employeeId");
  const deviceId = getOptionalId(formData, "deviceId");
  const type = getString(formData, "type") as AttendanceType;
  const scannedAtValue = getString(formData, "scannedAt");
  const rfidCardId = normalizeOptionalRfidCardId(getString(formData, "rfidCardId"));
  const correctionReason = getString(formData, "correctionReason");
  const allowedTypes = new Set<string>(Object.values(AttendanceType));

  if (!employeeId || !allowedTypes.has(type) || !scannedAtValue || !correctionReason) {
    throw new Error("Hareket bilgileri gecersiz.");
  }

  const scannedAt = new Date(scannedAtValue);

  if (Number.isNaN(scannedAt.getTime())) {
    throw new Error("Hareket tarihi gecersiz.");
  }

  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      ...employeeScopeWhere(authorization),
    },
    select: {
      id: true,
      companyId: true,
      rfidCardId: true,
    },
  });

  if (!employee) {
    throw new Error("Personel bulunamadi.");
  }

  await assertPayrollPeriodUnlocked(employee.companyId, scannedAt);

  if (deviceId) {
    const device = await prisma.device.findFirst({
      where: {
        id: deviceId,
        ...deviceScopeWhere(authorization),
      },
      select: {
        id: true,
      },
    });

    if (!device) {
      throw new Error("Cihaz bulunamadi.");
    }
  }

  await saveResolvedEmployeeWorkCalendar(employee.id, scannedAt);

  await prisma.$transaction(async (tx) => {
    const log = await tx.attendanceLog.create({
      data: {
        employeeId: employee.id,
        deviceId,
        type,
        scannedAt,
        receivedAt: new Date(),
        rfidCardId: rfidCardId ?? employee.rfidCardId,
      },
    });
    await tx.attendanceMovementAudit.create({
      data: {
        sourceLogId: log.id,
        employeeId: employee.id,
        movementDateTime: scannedAt,
        newType: type,
        newScannedAt: scannedAt,
        operation: "INSERT",
        changedById: user.id,
        correctionReason,
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/movements");
  revalidatePath("/dashboard/movement-reviews");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/reports/payroll");
  redirectToReturnPath(formData, "/dashboard/movements");
}

export async function deleteAttendanceLogAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.MOVEMENT_DELETE);

  const logId = getId(formData, "logId");
  const correctionReason = getString(formData, "correctionReason");

  if (!logId || !correctionReason) {
    throw new Error("Hareket bilgisi eksik.");
  }

  const oldLog = await prisma.attendanceLog.findFirst({
    where: { id: logId, employee: employeeScopeWhere(authorization) },
    include: { employee: { select: { companyId: true } } },
  });
  if (!oldLog) throw new Error("Hareket bulunamadi veya bu kayit icin yetkiniz yok.");

  await assertPayrollPeriodUnlocked(oldLog.employee.companyId, oldLog.scannedAt);

  await prisma.$transaction(async (tx) => {
    await tx.attendanceMovementAudit.create({
      data: {
        sourceLogId: oldLog.id,
        employeeId: oldLog.employeeId,
        movementDateTime: oldLog.scannedAt,
        oldType: oldLog.type,
        oldScannedAt: oldLog.scannedAt,
        operation: "DELETE",
        changedById: user.id,
        correctionReason,
      },
    });
    await tx.attendanceLog.delete({ where: { id: oldLog.id } });
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/movements");
  revalidatePath("/dashboard/movement-reviews");
  revalidatePath("/dashboard/reports/payroll");
  redirectToReturnPath(formData, "/dashboard/movements");
}

export async function createLeaveRequestAction(formData: FormData) {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.LEAVE_CREATE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");

  const employeeId = getId(formData, "employeeId");
  const type = getString(formData, "type") as LeaveType;
  const durationType = getString(formData, "durationType") as LeaveDurationType;
  const approvalStatus = getString(formData, "approvalStatus") as LeaveApprovalStatus;
  const startDate = getOptionalDate(formData, "startDate");
  const endDate = getOptionalDate(formData, "endDate");
  const startTime = getString(formData, "startTime") || null;
  const endTime = getString(formData, "endTime") || null;
  const description = getString(formData, "description") || null;

  if (
    !employeeId ||
    !startDate ||
    !endDate ||
    !Object.values(LeaveType).includes(type) ||
    !Object.values(LeaveDurationType).includes(durationType) ||
    !Object.values(LeaveApprovalStatus).includes(approvalStatus)
  ) {
    throw new Error("Izin bilgileri gecersiz.");
  }
  if (approvalStatus !== LeaveApprovalStatus.PENDING) assertPermission(authorization, PERMISSIONS.LEAVE_APPROVE);
  if (approvalStatus !== LeaveApprovalStatus.PENDING && authorization.employeeId === employeeId) throw new Error("Kendi izin talebinizi onaylayamazsiniz.");

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, ...employeeScopeWhere(authorization) },
    select: { id: true },
  });

  if (!employee) {
    throw new Error("Personel bulunamadi.");
  }

  await prisma.leaveRequest.create({
    data: {
      employeeId,
      companyId: authorization.companyId,
      type,
      durationType,
      approvalStatus,
      startDate,
      endDate,
      startTime,
      endTime,
      description,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard/reports");
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function updateLeaveRequestAction(formData: FormData) {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.LEAVE_CREATE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");

  const leaveId = getId(formData, "leaveId");
  const employeeId = getId(formData, "employeeId");
  const type = getString(formData, "type") as LeaveType;
  const durationType = getString(formData, "durationType") as LeaveDurationType;
  const approvalStatus = getString(formData, "approvalStatus") as LeaveApprovalStatus;
  const startDate = getOptionalDate(formData, "startDate");
  const endDate = getOptionalDate(formData, "endDate");
  const description = getString(formData, "description") || null;

  if (
    !leaveId ||
    !employeeId ||
    !startDate ||
    !endDate ||
    !Object.values(LeaveType).includes(type) ||
    !Object.values(LeaveDurationType).includes(durationType) ||
    !Object.values(LeaveApprovalStatus).includes(approvalStatus)
  ) {
    throw new Error("Izin bilgileri gecersiz.");
  }
  const existingLeave = await prisma.leaveRequest.findFirst({ where: { id: leaveId, companyId: authorization.companyId, employee: employeeScopeWhere(authorization) }, select: { approvalStatus: true, employeeId: true } });
  if (!existingLeave) throw new Error("Izin kaydi bulunamadi veya kapsam disinda.");
  if (existingLeave.approvalStatus !== approvalStatus) {
    assertPermission(authorization, PERMISSIONS.LEAVE_APPROVE);
    if (authorization.employeeId === existingLeave.employeeId) throw new Error("Kendi izin talebinizi onaylayamazsiniz.");
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, ...employeeScopeWhere(authorization) },
    select: { id: true },
  });

  if (!employee) {
    throw new Error("Personel bulunamadi.");
  }

  await prisma.leaveRequest.updateMany({
    where: { id: leaveId, companyId: authorization.companyId, employee: employeeScopeWhere(authorization) },
    data: {
      employeeId,
      type,
      durationType,
      approvalStatus,
      startDate,
      endDate,
      startTime: getString(formData, "startTime") || null,
      endTime: getString(formData, "endTime") || null,
      description,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard/reports");
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function deleteLeaveRequestAction(formData: FormData) {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.LEAVE_DELETE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");

  const leaveId = getId(formData, "leaveId");

  if (!leaveId) {
    throw new Error("Izin bilgisi eksik.");
  }

  await prisma.leaveRequest.deleteMany({
    where: { id: leaveId, companyId: authorization.companyId, employee: employeeScopeWhere(authorization) },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard/reports");
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function createWorkCalendarTemplateAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const code = getString(formData, "code").toUpperCase();
  const name = getString(formData, "name");
  const description = getString(formData, "description") || null;
  const validFrom = getOptionalDate(formData, "validFrom");
  const validTo = getOptionalDate(formData, "validTo");
  const isDefault = formData.get("isDefault") === "on";
  const weekdays = buildWeekdayPayload(formData);

  if (!code || !name) {
    throw new Error("Takvim sablon kodu ve adi zorunludur.");
  }

  await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.workCalendarTemplate.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await tx.workCalendarTemplate.create({
      data: {
        code,
        name,
        description,
        validFrom,
        validTo,
        isDefault,
        companyId,
        weekdays: { create: weekdays },
      },
    });

    await tx.calendarChangeLog.create({
      data: {
        companyId,
        recordType: "TEMPLATE",
        recordId: template.id,
        newValue: JSON.stringify({ code, name, isDefault }),
        changeReason: "Takvim sablonu olusturuldu",
        changedById: user.id,
      },
    });
  });

  revalidateCalendarPaths();
  redirectToReturnPath(formData, "/dashboard/calendar/templates");
}

export async function updateWorkCalendarTemplateAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const templateId = getId(formData, "templateId");
  const code = getString(formData, "code").toUpperCase();
  const name = getString(formData, "name");
  const description = getString(formData, "description") || null;
  const validFrom = getOptionalDate(formData, "validFrom");
  const validTo = getOptionalDate(formData, "validTo");
  const isDefault = formData.get("isDefault") === "on";
  const isActive = formData.get("isActive") === "on";
  const weekdays = buildWeekdayPayload(formData);

  if (!templateId || !code || !name) {
    throw new Error("Takvim sablon bilgileri eksik.");
  }

  await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.workCalendarTemplate.updateMany({
        where: { companyId, isDefault: true, id: { not: templateId } },
        data: { isDefault: false },
      });
    }

    await tx.workCalendarTemplate.updateMany({
      where: { id: templateId, companyId },
      data: { code, name, description, validFrom, validTo, isDefault, isActive },
    });

    for (const weekday of weekdays) {
      await tx.workCalendarWeekday.upsert({
        where: {
          calendarTemplateId_weekday: {
            calendarTemplateId: templateId,
            weekday: weekday.weekday,
          },
        },
        update: weekday,
        create: { ...weekday, calendarTemplateId: templateId },
      });
    }

    await tx.calendarChangeLog.create({
      data: {
        companyId,
        recordType: "TEMPLATE",
        recordId: templateId,
        newValue: JSON.stringify({ code, name, isDefault, isActive }),
        changeReason: getString(formData, "changeReason") || "Takvim sablonu guncellendi",
        changedById: user.id,
      },
    });
  });

  revalidateCalendarPaths();
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function deleteWorkCalendarTemplateAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const templateId = getId(formData, "templateId");

  if (!templateId) {
    throw new Error("Takvim sablon bilgisi eksik.");
  }

  await prisma.workCalendarTemplate.deleteMany({
    where: { id: templateId, companyId },
  });

  await prisma.calendarChangeLog.create({
    data: {
      companyId,
      recordType: "TEMPLATE",
      recordId: templateId,
      changeReason: "Takvim sablonu silindi",
      changedById: user.id,
    },
  });

  revalidateCalendarPaths();
  redirectToReturnPath(formData, "/dashboard/calendar/templates");
}

export async function createCalendarSpecialDayAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const name = getString(formData, "name");
  const specialDayType = getString(formData, "specialDayType") as SpecialDayType;
  const dateFrom = getRequiredDate(formData, "dateFrom");
  const dateTo = getRequiredDate(formData, "dateTo");
  const scope = parseCalendarScope(formData);

  if (!name || !Object.values(SpecialDayType).includes(specialDayType)) {
    throw new Error("Ozel gun bilgileri gecersiz.");
  }

  const record = await prisma.calendarSpecialDay.create({
    data: {
      name,
      specialDayType,
      dateFrom,
      dateTo,
      isHalfDay: formData.get("isHalfDay") === "on",
      startTime: getString(formData, "startTime") || null,
      endTime: getString(formData, "endTime") || null,
      breakMinutes: getOptionalNumber(formData, "breakMinutes") ?? 0,
      scopeType: scope.scopeType,
      branchId: scope.branchId,
      departmentId: scope.departmentId,
      employeeId: scope.employeeId,
      description: getString(formData, "description") || null,
      repeatsYearly: formData.get("repeatsYearly") === "on",
      companyId,
    },
  });

  await prisma.calendarChangeLog.create({
    data: {
      companyId,
      recordType: "SPECIAL_DAY",
      recordId: record.id,
      newValue: JSON.stringify({ name, specialDayType, dateFrom, dateTo, scope }),
      changeReason: "Takvim ozel gunu olusturuldu",
      changedById: user.id,
    },
  });

  revalidateCalendarPaths();
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function updateCalendarSpecialDayAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const specialDayId = getId(formData, "specialDayId");
  const name = getString(formData, "name");
  const specialDayType = getString(formData, "specialDayType") as SpecialDayType;
  const scope = parseCalendarScope(formData);

  if (!specialDayId || !name || !Object.values(SpecialDayType).includes(specialDayType)) {
    throw new Error("Ozel gun bilgileri gecersiz.");
  }

  await prisma.calendarSpecialDay.updateMany({
    where: { id: specialDayId, companyId },
    data: {
      name,
      specialDayType,
      dateFrom: getRequiredDate(formData, "dateFrom"),
      dateTo: getRequiredDate(formData, "dateTo"),
      isHalfDay: formData.get("isHalfDay") === "on",
      startTime: getString(formData, "startTime") || null,
      endTime: getString(formData, "endTime") || null,
      breakMinutes: getOptionalNumber(formData, "breakMinutes") ?? 0,
      scopeType: scope.scopeType,
      branchId: scope.branchId,
      departmentId: scope.departmentId,
      employeeId: scope.employeeId,
      description: getString(formData, "description") || null,
      repeatsYearly: formData.get("repeatsYearly") === "on",
      isActive: formData.get("isActive") === "on",
    },
  });

  await prisma.calendarChangeLog.create({
    data: {
      companyId,
      recordType: "SPECIAL_DAY",
      recordId: specialDayId,
      newValue: JSON.stringify({ name, specialDayType, scope }),
      changeReason: getString(formData, "changeReason") || "Takvim ozel gunu guncellendi",
      changedById: user.id,
    },
  });

  revalidateCalendarPaths();
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function deleteCalendarSpecialDayAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const specialDayId = getId(formData, "specialDayId");

  if (!specialDayId) {
    throw new Error("Takvim kaydi eksik.");
  }

  await prisma.calendarSpecialDay.deleteMany({
    where: {
      id: specialDayId,
      companyId,
    },
  });

  await prisma.calendarChangeLog.create({
    data: {
      companyId,
      recordType: "SPECIAL_DAY",
      recordId: specialDayId,
      changeReason: "Takvim ozel gunu silindi",
      changedById: user.id,
    },
  });

  revalidateCalendarPaths();
  redirectToReturnPath(formData, "/dashboard/calendar/special-days");
}

export async function createCalendarAssignmentAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const calendarTemplateId = getId(formData, "calendarTemplateId");
  const scope = parseCalendarScope(formData);
  const validFrom = getRequiredDate(formData, "validFrom");
  const validTo = getOptionalDate(formData, "validTo");
  const priority = getOptionalNumber(formData, "priority") ?? 100;
  const conflictReason = getString(formData, "conflictReason") || null;
  const conflictApproved = formData.get("conflictApproved") === "on";

  if (!calendarTemplateId) {
    throw new Error("Takvim sablonu secilmelidir.");
  }

  const template = await prisma.workCalendarTemplate.findFirst({
    where: { id: calendarTemplateId, companyId },
    select: { id: true },
  });

  if (!template) {
    throw new Error("Secilen takvim sablonu firmaya ait degil.");
  }

  await assertCalendarScopeBelongsToCompany(companyId, scope);

  const conflict = await prisma.calendarAssignment.findFirst({
    where: {
      companyId,
      isActive: true,
      scopeType: scope.scopeType,
      branchId: scope.branchId,
      departmentId: scope.departmentId,
      employeeId: scope.employeeId,
      validFrom: { lte: validTo ?? validFrom },
      OR: [{ validTo: null }, { validTo: { gte: validFrom } }],
    },
  });

  if (conflict && !conflictApproved && !conflictReason) {
    throw new Error("Bu kapsam ve tarih araliginda cakisan takvim atamasi var. Aciklama veya onay olmadan kaydedilemez.");
  }

  const record = await prisma.calendarAssignment.create({
    data: {
      calendarTemplateId,
      scopeType: scope.scopeType,
      companyId,
      branchId: scope.branchId,
      departmentId: scope.departmentId,
      employeeId: scope.employeeId,
      validFrom,
      validTo,
      priority,
      description: getString(formData, "description") || null,
      conflictApproved,
      conflictReason,
    },
  });

  await prisma.calendarChangeLog.create({
    data: {
      companyId,
      recordType: "ASSIGNMENT",
      recordId: record.id,
      newValue: JSON.stringify({ calendarTemplateId, scope, validFrom, validTo, priority }),
      changeReason: "Takvim atamasi olusturuldu",
      changedById: user.id,
    },
  });

  revalidateCalendarPaths();
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function updateCalendarAssignmentAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const assignmentId = getId(formData, "assignmentId");
  const calendarTemplateId = getId(formData, "calendarTemplateId");
  const scope = parseCalendarScope(formData);
  const priority = getOptionalNumber(formData, "priority") ?? 100;

  if (!assignmentId || !calendarTemplateId) {
    throw new Error("Takvim atama bilgileri eksik.");
  }

  const template = await prisma.workCalendarTemplate.findFirst({
    where: { id: calendarTemplateId, companyId },
    select: { id: true },
  });

  if (!template) {
    throw new Error("Secilen takvim sablonu firmaya ait degil.");
  }

  await assertCalendarScopeBelongsToCompany(companyId, scope);

  await prisma.calendarAssignment.updateMany({
    where: { id: assignmentId, companyId },
    data: {
      calendarTemplateId,
      scopeType: scope.scopeType,
      branchId: scope.branchId,
      departmentId: scope.departmentId,
      employeeId: scope.employeeId,
      validFrom: getRequiredDate(formData, "validFrom"),
      validTo: getOptionalDate(formData, "validTo"),
      priority,
      isActive: formData.get("isActive") === "on",
      description: getString(formData, "description") || null,
      conflictApproved: formData.get("conflictApproved") === "on",
      conflictReason: getString(formData, "conflictReason") || null,
    },
  });

  await prisma.calendarChangeLog.create({
    data: {
      companyId,
      recordType: "ASSIGNMENT",
      recordId: assignmentId,
      newValue: JSON.stringify({ calendarTemplateId, scope, priority }),
      changeReason: getString(formData, "changeReason") || "Takvim atamasi guncellendi",
      changedById: user.id,
    },
  });

  revalidateCalendarPaths();
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function deleteCalendarAssignmentAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const assignmentId = getId(formData, "assignmentId");

  if (!assignmentId) {
    throw new Error("Takvim atama bilgisi eksik.");
  }

  await prisma.calendarAssignment.deleteMany({
    where: { id: assignmentId, companyId },
  });

  await prisma.calendarChangeLog.create({
    data: {
      companyId,
      recordType: "ASSIGNMENT",
      recordId: assignmentId,
      changeReason: "Takvim atamasi silindi",
      changedById: user.id,
    },
  });

  revalidateCalendarPaths();
  redirectToReturnPath(formData, "/dashboard/calendar/assignments");
}

export async function createCalendarDailyExceptionAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const scope = parseCalendarScope(formData);
  const newDayType = getString(formData, "newDayType") as WorkDayType;
  const changeReason = getString(formData, "changeReason");

  if (!changeReason || !Object.values(WorkDayType).includes(newDayType)) {
    throw new Error("Gunluk istisna bilgileri eksik.");
  }

  const record = await prisma.calendarDailyException.create({
    data: {
      workDate: getRequiredDate(formData, "workDate"),
      scopeType: scope.scopeType,
      companyId,
      branchId: scope.branchId,
      departmentId: scope.departmentId,
      employeeId: scope.employeeId,
      originalDayType: (getString(formData, "originalDayType") as WorkDayType) || null,
      newDayType,
      newStartTime: getString(formData, "newStartTime") || null,
      newEndTime: getString(formData, "newEndTime") || null,
      newBreakMinutes: getOptionalNumber(formData, "newBreakMinutes"),
      changeReason,
      approvalStatus: (getString(formData, "approvalStatus") as CalendarApprovalStatus) || CalendarApprovalStatus.APPROVED,
      createdById: user.id,
      approvedById: user.id,
    },
  });

  await prisma.calendarChangeLog.create({
    data: {
      companyId,
      recordType: "DAILY_EXCEPTION",
      recordId: record.id,
      newValue: JSON.stringify({ scope, newDayType }),
      changeReason,
      changedById: user.id,
      approvedById: user.id,
    },
  });

  revalidateCalendarPaths();
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function updateCalendarDailyExceptionAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const exceptionId = getId(formData, "exceptionId");
  const newDayType = getString(formData, "newDayType") as WorkDayType;
  const changeReason = getString(formData, "changeReason");

  if (!exceptionId || !changeReason || !Object.values(WorkDayType).includes(newDayType)) {
    throw new Error("Gunluk istisna bilgileri eksik.");
  }

  await prisma.calendarDailyException.updateMany({
    where: { id: exceptionId, companyId },
    data: {
      newDayType,
      newStartTime: getString(formData, "newStartTime") || null,
      newEndTime: getString(formData, "newEndTime") || null,
      newBreakMinutes: getOptionalNumber(formData, "newBreakMinutes"),
      changeReason,
      approvalStatus: (getString(formData, "approvalStatus") as CalendarApprovalStatus) || CalendarApprovalStatus.APPROVED,
      approvedById: user.id,
    },
  });

  await prisma.calendarChangeLog.create({
    data: {
      companyId,
      recordType: "DAILY_EXCEPTION",
      recordId: exceptionId,
      newValue: JSON.stringify({ newDayType }),
      changeReason,
      changedById: user.id,
      approvedById: user.id,
    },
  });

  revalidateCalendarPaths();
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function generateEmployeeDailyCalendarAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.CALENDAR_MANAGE);
  if (!authorization.companyId) throw new Error("Aktif firma secilmedi.");
  const companyId = authorization.companyId;
  const fromDate = getRequiredDate(formData, "fromDate");
  const toDate = getRequiredDate(formData, "toDate");
  const employeeId = getOptionalId(formData, "employeeId");
  const department = getString(formData, "department");

  const employees = await prisma.employee.findMany({
    where: {
      ...employeeScopeWhere(authorization),
      ...(employeeId ? { id: employeeId } : {}),
      ...(department ? { department } : {}),
    },
    select: { id: true },
  });

  const current = new Date(fromDate);
  const end = new Date(toDate);
  current.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (current > end) {
    throw new Error("Baslangic tarihi bitis tarihinden sonra olamaz.");
  }

  let generatedCount = 0;
  while (current <= end) {
    for (const employee of employees) {
      await saveResolvedEmployeeWorkCalendar(employee.id, current);
      generatedCount += 1;
    }
    current.setDate(current.getDate() + 1);
  }

  await prisma.calendarChangeLog.create({
    data: {
      companyId,
      recordType: "EMPLOYEE_DAILY_CALENDAR",
      recordId: companyId,
      newValue: JSON.stringify({ fromDate, toDate, employeeId, department, generatedCount }),
      changeReason: "Personel gunluk takvimleri uretildi",
      changedById: user.id,
    },
  });

  revalidateCalendarPaths();
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function approvePayrollPeriodAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.PAYROLL_APPROVE);
  const companyId = getId(formData, "companyId");
  const monthKey = getString(formData, "month");
  const approvalNote = getString(formData, "approvalNote") || null;
  if (!PAYROLL_MONTH_PATTERN.test(monthKey)) throw new Error("Puantaj donemi gecersiz.");
  if (monthKey > getDefaultPayrollMonth()) throw new Error("Gelecek donem onaylanamaz.");
  if (authorization.companyId !== companyId) throw new Error("Bu firma icin yetkiniz yok.");
  if (!authorization.isPlatformAdmin && authorization.scopeMode !== DataScopeMode.COMPANY) throw new Error("Puantaj dönemi yalnız firma genelinde yetkili kullanıcı tarafından onaylanabilir.");
  const { year, month } = getPayrollMonthRange(monthKey);
  const current = await prisma.payrollPeriod.findUnique({
    where: { companyId_year_month: { companyId, year, month } },
  });
  if (current?.status === PayrollPeriodStatus.LOCKED) throw new Error("Kilitli puantaj donemi degistirilemez.");

  const snapshot = await buildPayrollSnapshot(companyId, monthKey);
  await prisma.payrollPeriod.upsert({
    where: { companyId_year_month: { companyId, year, month } },
    create: {
      companyId,
      year,
      month,
      status: PayrollPeriodStatus.APPROVED,
      snapshotJson: JSON.stringify(snapshot),
      snapshotCreatedAt: new Date(),
      approvalNote,
      approvedById: user.id,
      approvedAt: new Date(),
    },
    update: {
      status: PayrollPeriodStatus.APPROVED,
      snapshotJson: JSON.stringify(snapshot),
      snapshotCreatedAt: new Date(),
      approvalNote,
      approvedById: user.id,
      approvedAt: new Date(),
      lockedById: null,
      lockedAt: null,
    },
  });
  revalidatePath("/dashboard/reports/payroll");
  redirectToReturnPath(formData, `/dashboard/reports/payroll?month=${monthKey}&companyId=${companyId}`);
}

export async function reopenPayrollPeriodAction(formData: FormData) {
  const { authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.PAYROLL_APPROVE);
  const companyId = getId(formData, "companyId");
  const monthKey = getString(formData, "month");
  if (!PAYROLL_MONTH_PATTERN.test(monthKey)) throw new Error("Puantaj donemi gecersiz.");
  if (monthKey > getDefaultPayrollMonth()) throw new Error("Gelecek donem acilamaz.");
  if (authorization.companyId !== companyId) throw new Error("Bu firma icin yetkiniz yok.");
  if (!authorization.isPlatformAdmin && authorization.scopeMode !== DataScopeMode.COMPANY) throw new Error("Puantaj dönemi yalnız firma genelinde yetkili kullanıcı tarafından yeniden açılabilir.");
  const { year, month } = getPayrollMonthRange(monthKey);
  const period = await prisma.payrollPeriod.findUnique({
    where: { companyId_year_month: { companyId, year, month } },
  });
  if (!period || period.status !== PayrollPeriodStatus.APPROVED) {
    throw new Error("Yalnizca onayli ve henuz kilitlenmemis donem yeniden acilabilir.");
  }
  await prisma.payrollPeriod.update({
    where: { id: period.id },
    data: {
      status: PayrollPeriodStatus.OPEN,
      snapshotJson: null,
      snapshotCreatedAt: null,
      approvedById: null,
      approvedAt: null,
      approvalNote: null,
    },
  });
  revalidatePath("/dashboard/reports/payroll");
  redirectToReturnPath(formData, `/dashboard/reports/payroll?month=${monthKey}&companyId=${companyId}`);
}

export async function lockPayrollPeriodAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.PAYROLL_APPROVE);
  const companyId = getId(formData, "companyId");
  const monthKey = getString(formData, "month");
  if (!PAYROLL_MONTH_PATTERN.test(monthKey)) throw new Error("Puantaj donemi gecersiz.");
  if (monthKey > getDefaultPayrollMonth()) throw new Error("Gelecek donem kilitlenemez.");
  if (authorization.companyId !== companyId) throw new Error("Bu firma icin yetkiniz yok.");
  if (!authorization.isPlatformAdmin && authorization.scopeMode !== DataScopeMode.COMPANY) throw new Error("Puantaj dönemi yalnız firma genelinde yetkili kullanıcı tarafından kilitlenebilir.");
  const { year, month } = getPayrollMonthRange(monthKey);
  const period = await prisma.payrollPeriod.findUnique({
    where: { companyId_year_month: { companyId, year, month } },
  });
  if (!period || period.status !== PayrollPeriodStatus.APPROVED || !period.snapshotJson) {
    throw new Error("Donem kilitlenmeden once onaylanmalidir.");
  }
  await prisma.payrollPeriod.update({
    where: { id: period.id },
    data: { status: PayrollPeriodStatus.LOCKED, lockedById: user.id, lockedAt: new Date() },
  });
  revalidatePath("/dashboard/reports/payroll");
  redirectToReturnPath(formData, `/dashboard/reports/payroll?month=${monthKey}&companyId=${companyId}`);
}

export async function resolveAttendanceReviewAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.MOVEMENT_UPDATE);
  const employeeId = getId(formData, "employeeId");
  const dayKey = getString(formData, "dayKey");
  const fingerprint = getString(formData, "fingerprint");
  const resolutionNote = getString(formData, "resolutionNote");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey) || !/^[a-f0-9]{64}$/.test(fingerprint) || !resolutionNote) {
    throw new Error("Inceleme sonucu bilgileri eksik.");
  }
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, ...employeeScopeWhere(authorization) },
    select: { id: true },
  });
  if (!employee) throw new Error("Personel bulunamadi veya yetkiniz yok.");
  const workDate = new Date(`${dayKey}T00:00:00+03:00`);
  await prisma.attendanceReviewResolution.upsert({
    where: { employeeId_workDate_fingerprint: { employeeId, workDate, fingerprint } },
    create: { employeeId, workDate, fingerprint, resolutionNote, resolvedById: user.id },
    update: { resolutionNote, resolvedById: user.id, resolvedAt: new Date() },
  });
  revalidatePath("/dashboard/movement-reviews");
  redirectToReturnPath(formData, "/dashboard/movement-reviews");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  revalidatePath("/login");
}
