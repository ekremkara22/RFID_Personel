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
  DevicePurpose,
  LeaveApprovalStatus,
  LeaveDurationType,
  LeaveType,
  Role,
  SpecialDayType,
  WorkDayType,
} from "@/generated/prisma/client";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { calculateGrossMinutes, calculateNetMinutes } from "@/lib/work-calendar-rules";
import { saveResolvedEmployeeWorkCalendar } from "@/lib/work-calendar";

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

async function getScopedCompanyId(formData: FormData, fallbackCompanyId?: number | null, userId?: number) {
  const requestedCompanyId = getOptionalId(formData, "companyId");
  const companyId = requestedCompanyId || fallbackCompanyId;

  if (!companyId) {
    throw new Error("Firma bilgisi secilmelidir.");
  }

  if (fallbackCompanyId && companyId !== fallbackCompanyId && userId) {
    const access = await prisma.userCompanyAccess.findFirst({
      where: {
        userId,
        companyId,
      },
      select: {
        id: true,
      },
    });

    if (!access) {
      throw new Error("Bu firma icin yetkiniz yok.");
    }
  }

  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!company) {
    throw new Error("Firma bulunamadi.");
  }

  return company.id;
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
  const adminPassword = getString(formData, "adminPassword");

  if (
    !companyName ||
    (user.role === "SUPERADMIN" && (!adminFirstName || !adminLastName || !adminEmail || !adminPassword))
  ) {
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
          email: adminEmail,
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
    } else {
      await tx.userCompanyAccess.create({
        data: {
          userId: user.id,
          companyId: company.id,
        },
      });

      if (!user.companyId) {
        await tx.user.update({
          where: { id: user.id },
          data: { companyId: company.id },
        });
      }
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/companies");
  if (getReturnTo(formData)) redirectToReturnPath(formData, "/dashboard/companies");
}

export async function updateCompanyAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN" && user.role !== "COMPANY_ADMIN") {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

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
  const adminPassword = getString(formData, "adminPassword");
  const isActive = user.role === "SUPERADMIN" ? formData.get("isActive") === "on" : true;

  if (
    !companyId ||
    !companyName ||
    (user.role === "SUPERADMIN" && (!adminId || !adminFirstName || !adminLastName || !adminEmail))
  ) {
    throw new Error("Firma ve admin bilgileri eksik.");
  }

  if (user.role === "COMPANY_ADMIN") {
    const access = await prisma.userCompanyAccess.findFirst({
      where: { userId: user.id, companyId },
      select: { id: true },
    });

    if (!access && user.companyId !== companyId) {
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
          email: adminEmail,
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

async function syncUserAccess(userId: number, companyIds: number[], deviceIds: number[]) {
  const uniqueCompanyIds = Array.from(new Set(companyIds));
  const uniqueDeviceIds = Array.from(new Set(deviceIds));

  if (uniqueCompanyIds.length > 0) {
    const companyCount = await prisma.company.count({
      where: { id: { in: uniqueCompanyIds }, isActive: true },
    });

    if (companyCount !== uniqueCompanyIds.length) {
      throw new Error("Secilen firmalardan biri bulunamadi.");
    }
  }

  if (uniqueDeviceIds.length > 0) {
    const deviceCount = await prisma.device.count({
      where: {
        id: { in: uniqueDeviceIds },
        ...(uniqueCompanyIds.length > 0
          ? {
              OR: [
                { companyId: { in: uniqueCompanyIds } },
                { companyId: null },
              ],
            }
          : {}),
      },
    });

    if (deviceCount !== uniqueDeviceIds.length) {
      throw new Error("Secilen cihazlardan biri kullanicinin firmalarina ait degil.");
    }
  }

  await prisma.userCompanyAccess.deleteMany({ where: { userId } });
  await prisma.userDeviceAccess.deleteMany({ where: { userId } });

  if (uniqueCompanyIds.length > 0) {
    await prisma.userCompanyAccess.createMany({
      data: uniqueCompanyIds.map((companyId) => ({ userId, companyId })),
      skipDuplicates: true,
    });
  }

  if (uniqueDeviceIds.length > 0) {
    await prisma.userDeviceAccess.createMany({
      data: uniqueDeviceIds.map((deviceId) => ({ userId, deviceId })),
      skipDuplicates: true,
    });
  }
}

export async function createDashboardUserAction(formData: FormData) {
  await assertSuperadminUser();

  const firstName = getString(formData, "firstName");
  const lastName = getString(formData, "lastName");
  const email = normalizeOptionalEmail(getString(formData, "email"));
  const password = getString(formData, "password");
  const role = await getAssignableRole(formData);
  const companyIds = getIdList(formData, "companyIds");
  const deviceIds = getIdList(formData, "deviceIds");

  if (!firstName || !lastName || !email || !password) {
    throw new Error("Kullanici bilgileri eksik.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      email,
      password: passwordHash,
      role,
      companyId: role === Role.COMPANY_ADMIN ? companyIds[0] ?? null : null,
    },
  });

  await syncUserAccess(newUser.id, role === Role.COMPANY_ADMIN ? companyIds : [], role === Role.COMPANY_ADMIN ? deviceIds : []);

  revalidatePath("/dashboard/users");
  redirect("/dashboard/users");
}

export async function updateDashboardUserAction(formData: FormData) {
  const currentUser = await assertSuperadminUser();

  const userId = getId(formData, "userId");
  const firstName = getString(formData, "firstName");
  const lastName = getString(formData, "lastName");
  const email = normalizeOptionalEmail(getString(formData, "email"));
  const password = getString(formData, "password");
  const companyIds = getIdList(formData, "companyIds");
  const deviceIds = getIdList(formData, "deviceIds");
  const targetUser = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    : null;
  const role = await getAssignableRole(formData);

  if (!userId || !targetUser || !firstName || !lastName || !email) {
    throw new Error("Kullanici bilgileri eksik.");
  }

  if (userId === currentUser.id && role !== Role.SUPERADMIN) {
    throw new Error("Kendi super admin rolunuzu degistiremezsiniz.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      email,
      role,
      companyId: role === Role.COMPANY_ADMIN ? companyIds[0] ?? null : null,
      ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
    },
  });

  if (role === Role.COMPANY_ADMIN) {
    await syncUserAccess(userId, companyIds, deviceIds);
  } else {
    await syncUserAccess(userId, [], []);
  }

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

  if (user.role !== "COMPANY_ADMIN") {
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
}

export async function updateCompanyCategoryAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN") {
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
}

export async function createDepartmentAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const name = getString(formData, "name");

  if (!name) {
    throw new Error("Departman adi zorunludur.");
  }

  await prisma.department.create({
    data: {
      name,
      companyId: user.companyId,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/settings/departments");
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function updateDepartmentAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const departmentId = getId(formData, "departmentId");
  const name = getString(formData, "name");
  const isActive = formData.get("isActive") === "on";

  if (!departmentId || !name) {
    throw new Error("Departman bilgileri eksik.");
  }

  await prisma.department.updateMany({
    where: {
      id: departmentId,
      companyId: user.companyId,
    },
    data: { name, isActive },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/settings/departments");
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function createBranchAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = await getScopedCompanyId(formData, user.role === "COMPANY_ADMIN" ? user.companyId : null, user.id);
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
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const branchId = getId(formData, "branchId");
  const companyId = await getScopedCompanyId(formData, user.role === "COMPANY_ADMIN" ? user.companyId : null, user.id);
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

export async function createManagerAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const name = getString(formData, "name");
  const email = normalizeOptionalEmail(getString(formData, "email"));

  if (!name) {
    throw new Error("Yonetici adi zorunludur.");
  }

  await prisma.manager.create({
    data: {
      name,
      email,
      companyId: user.companyId,
    },
  });

  revalidatePath("/dashboard/settings/managers");
  revalidatePath("/dashboard/employees");
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function updateManagerAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

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
      companyId: user.companyId,
    },
    data: { name, email, isActive },
  });

  revalidatePath("/dashboard/settings/managers");
  revalidatePath("/dashboard/employees");
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function createEmployeeAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const firstName = getString(formData, "firstName");
  const lastName = getString(formData, "lastName");
  const companyId = await getScopedCompanyId(formData, user.companyId, user.id);
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

  await assertCompanyDepartment(companyId, department);

  await prisma.employee.create({
    data: {
      firstName,
      lastName,
      photoUrl,
      registrationNumber,
      email,
      password: password ? await bcrypt.hash(password, 10) : null,
      department,
      branch,
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
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const employeeId = getId(formData, "employeeId");
  const firstName = getString(formData, "firstName");
  const lastName = getString(formData, "lastName");
  const companyId = await getScopedCompanyId(formData, user.companyId, user.id);
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

  await assertCompanyDepartment(companyId, department);

  const accessRows = await prisma.userCompanyAccess.findMany({
    where: { userId: user.id },
    select: { companyId: true },
  });
  const accessibleCompanyIds = Array.from(
    new Set([user.companyId, ...accessRows.map((access) => access.companyId)].filter((value): value is number => value !== null)),
  );
  const currentEmployee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      companyId: { in: accessibleCompanyIds },
    },
    select: { photoUrl: true },
  });
  const photoUrl = await saveEmployeePhoto(formData, currentEmployee?.photoUrl);

  await prisma.employee.updateMany({
    where: {
      id: employeeId,
      companyId: { in: accessibleCompanyIds },
    },
    data: {
      firstName,
      lastName,
      photoUrl,
      registrationNumber,
      email,
      department,
      branch,
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
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const employeeId = getId(formData, "employeeId");

  if (!employeeId) {
    throw new Error("Personel bilgisi eksik.");
  }

  await prisma.employee.deleteMany({
    where: {
      id: employeeId,
      companyId: user.companyId,
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
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN") {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const deviceId = getId(formData, "deviceId");
  const companyId = getId(formData, "companyId");
  const name = getString(formData, "name");
  const branchLocation = getString(formData, "branchLocation") || null;

  if (!deviceId || !companyId || !name) {
    throw new Error("Cihaz adi ve firma bilgisi zorunludur.");
  }

  const accessibleCompanyIds = await prisma.userCompanyAccess.findMany({
    where: { userId: user.id },
    select: { companyId: true },
  });
  const companyIds = new Set(accessibleCompanyIds.map((access) => access.companyId));
  if (user.companyId) companyIds.add(user.companyId);

  if (!companyIds.has(companyId)) {
    throw new Error("Bu firma icin yetkiniz yok.");
  }

  const assignedDevice = await prisma.userDeviceAccess.findFirst({
    where: { userId: user.id, deviceId },
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
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const logId = getId(formData, "logId");
  const type = getString(formData, "type") as AttendanceType;
  const scannedAtValue = getString(formData, "scannedAt");
  const allowedTypes = new Set<string>(Object.values(AttendanceType));

  if (!logId || !allowedTypes.has(type) || !scannedAtValue) {
    throw new Error("Hareket bilgileri gecersiz.");
  }

  const scannedAt = new Date(scannedAtValue);

  if (Number.isNaN(scannedAt.getTime())) {
    throw new Error("Hareket tarihi gecersiz.");
  }

  await prisma.attendanceLog.updateMany({
    where: {
      id: logId,
      employee: {
        companyId: user.companyId,
      },
    },
    data: {
      type,
      scannedAt,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/movements");
}

export async function createAttendanceLogAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const employeeId = getId(formData, "employeeId");
  const deviceId = getOptionalId(formData, "deviceId");
  const type = getString(formData, "type") as AttendanceType;
  const scannedAtValue = getString(formData, "scannedAt");
  const rfidCardId = normalizeOptionalRfidCardId(getString(formData, "rfidCardId"));
  const allowedTypes = new Set<string>(Object.values(AttendanceType));

  if (!employeeId || !allowedTypes.has(type) || !scannedAtValue) {
    throw new Error("Hareket bilgileri gecersiz.");
  }

  const scannedAt = new Date(scannedAtValue);

  if (Number.isNaN(scannedAt.getTime())) {
    throw new Error("Hareket tarihi gecersiz.");
  }

  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      companyId: user.companyId,
    },
    select: {
      id: true,
      rfidCardId: true,
    },
  });

  if (!employee) {
    throw new Error("Personel bulunamadi.");
  }

  if (deviceId) {
    const device = await prisma.device.findFirst({
      where: {
        id: deviceId,
        companyId: user.companyId,
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

  await prisma.attendanceLog.create({
    data: {
      employeeId: employee.id,
      deviceId,
      type,
      scannedAt,
      rfidCardId: rfidCardId ?? employee.rfidCardId,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/movements");
  revalidatePath("/dashboard/reports");
  redirectToReturnPath(formData, "/dashboard/movements");
}

export async function deleteAttendanceLogAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const logId = getId(formData, "logId");

  if (!logId) {
    throw new Error("Hareket bilgisi eksik.");
  }

  await prisma.attendanceLog.deleteMany({
    where: {
      id: logId,
      employee: {
        companyId: user.companyId,
      },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/movements");
}

export async function createLeaveRequestAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

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

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId: user.companyId },
    select: { id: true },
  });

  if (!employee) {
    throw new Error("Personel bulunamadi.");
  }

  await prisma.leaveRequest.create({
    data: {
      employeeId,
      companyId: user.companyId,
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
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

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

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId: user.companyId },
    select: { id: true },
  });

  if (!employee) {
    throw new Error("Personel bulunamadi.");
  }

  await prisma.leaveRequest.updateMany({
    where: { id: leaveId, companyId: user.companyId },
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
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const leaveId = getId(formData, "leaveId");

  if (!leaveId) {
    throw new Error("Izin bilgisi eksik.");
  }

  await prisma.leaveRequest.deleteMany({
    where: { id: leaveId, companyId: user.companyId },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard/reports");
  if (getReturnTo(formData)) redirectToReturnPath(formData);
}

export async function createWorkCalendarTemplateAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = user.companyId;
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
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = user.companyId;
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
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = user.companyId;
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
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = user.companyId;
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
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = user.companyId;
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
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = user.companyId;
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
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = await getScopedCompanyId(formData, user.role === "COMPANY_ADMIN" ? user.companyId : null, user.id);
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
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = await getScopedCompanyId(formData, user.role === "COMPANY_ADMIN" ? user.companyId : null, user.id);
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
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = await getScopedCompanyId(formData, user.role === "COMPANY_ADMIN" ? user.companyId : null, user.id);
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
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = user.companyId;
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
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = user.companyId;
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
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = user.companyId;
  const fromDate = getRequiredDate(formData, "fromDate");
  const toDate = getRequiredDate(formData, "toDate");
  const employeeId = getId(formData, "employeeId");
  const department = getString(formData, "department");

  const employees = await prisma.employee.findMany({
    where: {
      companyId,
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

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  revalidatePath("/login");
}
