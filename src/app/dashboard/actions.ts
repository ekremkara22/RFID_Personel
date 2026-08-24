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
  DevicePurpose,
  LeaveApprovalStatus,
  LeaveDurationType,
  LeaveType,
} from "@/generated/prisma/client";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalEmail(email: string) {
  return email ? email.toLowerCase() : null;
}

function normalizeOptionalRfidCardId(cardId: string) {
  return cardId ? cardId.toUpperCase() : null;
}

function getOptionalDate(formData: FormData, key: string) {
  const value = getString(formData, key);
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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

  if (user.role !== "SUPERADMIN") {
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

  if (!companyName || !adminFirstName || !adminLastName || !adminEmail || !adminPassword) {
    throw new Error("Sirket ve firma yoneticisi bilgileri eksik.");
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

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

    await tx.user.create({
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
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/companies");
}

export async function updateCompanyAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = getString(formData, "companyId");
  const adminId = getString(formData, "adminId");
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
  const isActive = formData.get("isActive") === "on";

  if (!companyId || !companyName || !adminId || !adminFirstName || !adminLastName || !adminEmail) {
    throw new Error("Firma ve admin bilgileri eksik.");
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

  const companyId = getString(formData, "companyId");

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
}

export async function updateCompanyCategoryAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const categoryId = getString(formData, "categoryId");
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

async function assertCompanyDepartment(companyId: string, department: string) {
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
}

export async function updateDepartmentAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const departmentId = getString(formData, "departmentId");
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
}

export async function createBranchAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const name = getString(formData, "name");
  const location = getString(formData, "location");

  if (!name) {
    throw new Error("Sube adi zorunludur.");
  }

  await prisma.branch.create({
    data: {
      name,
      location: location || null,
      companyId: user.companyId,
    },
  });

  revalidatePath("/dashboard/settings/branches");
  revalidatePath("/dashboard/employees");
}

export async function updateBranchAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const branchId = getString(formData, "branchId");
  const name = getString(formData, "name");
  const location = getString(formData, "location");
  const isActive = formData.get("isActive") === "on";

  if (!branchId || !name) {
    throw new Error("Sube bilgileri eksik.");
  }

  await prisma.branch.updateMany({
    where: { id: branchId, companyId: user.companyId },
    data: { name, location: location || null, isActive },
  });

  revalidatePath("/dashboard/settings/branches");
  revalidatePath("/dashboard/employees");
}

export async function createEmployeeAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const firstName = getString(formData, "firstName");
  const lastName = getString(formData, "lastName");
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

  await assertCompanyDepartment(user.companyId, department);

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
      companyId: user.companyId,
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

  const employeeId = getString(formData, "employeeId");
  const firstName = getString(formData, "firstName");
  const lastName = getString(formData, "lastName");
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

  await assertCompanyDepartment(user.companyId, department);

  const currentEmployee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId: user.companyId },
    select: { photoUrl: true },
  });
  const photoUrl = await saveEmployeePhoto(formData, currentEmployee?.photoUrl);

  await prisma.employee.updateMany({
    where: {
      id: employeeId,
      companyId: user.companyId,
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

  const employeeId = getString(formData, "employeeId");

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

  const companyId = getString(formData, "companyId");
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
}

export async function updateCompanyDeviceAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "SUPERADMIN") {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const companyId = getString(formData, "companyId");
  const deviceId = getString(formData, "deviceId");
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

  const companyId = getString(formData, "companyId");
  const deviceId = getString(formData, "deviceId");

  if (!companyId || !deviceId) {
    throw new Error("Cihaz bilgisi eksik.");
  }

  await prisma.device.deleteMany({
    where: { id: deviceId, companyId },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/companies/${companyId}`);
}

export async function updateDeviceAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const deviceId = getString(formData, "deviceId");
  const name = getString(formData, "name");

  if (!deviceId || !name) {
    throw new Error("Cihaz adi zorunludur.");
  }

  await prisma.device.updateMany({
    where: {
      id: deviceId,
      companyId: user.companyId,
    },
    data: { name },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/devices");
}

export async function updateAttendanceLogAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const logId = getString(formData, "logId");
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

export async function deleteAttendanceLogAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const logId = getString(formData, "logId");

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

  const employeeId = getString(formData, "employeeId");
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
}

export async function updateLeaveRequestAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const leaveId = getString(formData, "leaveId");
  const approvalStatus = getString(formData, "approvalStatus") as LeaveApprovalStatus;
  const description = getString(formData, "description") || null;

  if (!leaveId || !Object.values(LeaveApprovalStatus).includes(approvalStatus)) {
    throw new Error("Izin bilgileri gecersiz.");
  }

  await prisma.leaveRequest.updateMany({
    where: { id: leaveId, companyId: user.companyId },
    data: { approvalStatus, description },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard/reports");
}

export async function deleteLeaveRequestAction(formData: FormData) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    throw new Error("Bu islem icin yetkiniz yok.");
  }

  const leaveId = getString(formData, "leaveId");

  if (!leaveId) {
    throw new Error("Izin bilgisi eksik.");
  }

  await prisma.leaveRequest.deleteMany({
    where: { id: leaveId, companyId: user.companyId },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard/reports");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  revalidatePath("/login");
}
