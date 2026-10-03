"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@/generated/prisma/client";
import { assertPermission } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { getString, getId, normalizeOptionalEmail, defaultRoleNames, getReturnTo, redirectToReturnPath, assertSuperadminUser } from "@/modules/shared/action-helpers";

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
