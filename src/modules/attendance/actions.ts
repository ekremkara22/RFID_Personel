"use server";

import { revalidatePath } from "next/cache";
import { AttendanceType } from "@/generated/prisma/client";
import { assertPermission, deviceScopeWhere, employeeScopeWhere } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { assertPayrollPeriodUnlocked } from "@/lib/payroll-period";
import { requireSessionUser } from "@/lib/session";
import { saveResolvedEmployeeWorkCalendar } from "@/lib/work-calendar";
import { getString, getId, getOptionalId, normalizeOptionalRfidCardId, redirectToReturnPath } from "@/modules/shared/action-helpers";

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
