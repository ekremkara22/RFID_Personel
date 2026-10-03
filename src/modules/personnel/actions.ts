"use server";

import { ActionError } from "@/lib/action-error";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertPermission, employeeScopeWhere } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { getString, getId, normalizeOptionalEmail, normalizeOptionalRfidCardId, getOptionalDate } from "@/modules/shared/action-helpers";
import { saveEmployeePhoto } from "@/modules/personnel/employee-photo";

async function assertCompanyDepartment(companyId: number, department: string) {
  const existingDepartment = await prisma.department.findFirst({
    where: {
      companyId,
      name: department,
      isActive: true,
    },
  });

  if (!existingDepartment) {
    throw new ActionError("Secilen departman firma tanimlarinda aktif degil.");
  }
  return existingDepartment;
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
