"use server";

import { revalidatePath } from "next/cache";
import { AttendanceType, DevicePurpose } from "@/generated/prisma/client";
import { ActionError, type ActionResult } from "@/lib/action-error";
import { APP_TIME_ZONE } from "@/lib/app-time";
import { DUPLICATE_SCAN_WINDOW_MS } from "@/lib/attendance-finalization-rules";
import { ATTENDANCE_TYPE_LABELS } from "@/lib/attendance-labels";
import { inferAttendanceType } from "@/lib/attendance-type-inference";
import { isTrialActive } from "@/lib/module-license-policy";
import { runFormAction } from "@/lib/run-form-action";
import { getSessionLicense } from "@/modules/licensing/repository";
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

const DEMO_SCAN_REASON = "Deneme süresinde demo kart okutma";

/**
 * Trial-only stand-in for an RFID reader: records "now" for the chosen employee with the same type
 * inference as a real bidirectional device, so a company without hardware can see the whole flow.
 * It leaves an audit trail like any manual movement and is closed once the trial ends.
 */
export async function simulateDemoCardScanAction(formData: FormData): Promise<ActionResult> {
  let message = "";
  const result = await runFormAction(async () => {
    const { user, authorization } = await requireSessionUser();
    assertPermission(authorization, PERMISSIONS.MOVEMENT_CREATE);
    const license = authorization.companyId ? await getSessionLicense(user.id, authorization.companyId) : null;
    if (!license || !isTrialActive(license.holder)) throw new ActionError("Demo kart okutma yalnız deneme süresinde kullanılabilir.");

    const employee = await prisma.employee.findFirst({
      where: { id: getId(formData, "employeeId"), isActive: true, ...employeeScopeWhere(authorization) },
      select: { id: true, firstName: true, lastName: true, rfidCardId: true, companyId: true, company: { select: { attendanceFinalizationDelayMinutes: true } } },
    });
    if (!employee) throw new ActionError("Personel bulunamadı.");

    const scannedAt = new Date();
    await assertPayrollPeriodUnlocked(employee.companyId, scannedAt);
    // Same rule as a real reader: a repeated read inside the window is the same movement.
    const recent = await prisma.attendanceLog.findFirst({ where: { employeeId: employee.id, scannedAt: { gte: new Date(scannedAt.getTime() - DUPLICATE_SCAN_WINDOW_MS) } }, select: { id: true } });
    if (recent) throw new ActionError("Bu personel az önce okutuldu; tekrar okutma aynı hareket sayılır. Biraz bekleyip yeniden deneyin.");
    const type = await inferAttendanceType({
      employeeId: employee.id,
      devicePurpose: DevicePurpose.BIDIRECTIONAL,
      scannedAt,
      finalizationDelayMinutes: employee.company.attendanceFinalizationDelayMinutes,
    });
    await saveResolvedEmployeeWorkCalendar(employee.id, scannedAt);
    await prisma.$transaction(async (tx) => {
      const log = await tx.attendanceLog.create({ data: { employeeId: employee.id, type, scannedAt, receivedAt: scannedAt, rfidCardId: employee.rfidCardId } });
      await tx.attendanceMovementAudit.create({ data: { sourceLogId: log.id, employeeId: employee.id, movementDateTime: scannedAt, newType: type, newScannedAt: scannedAt, operation: "INSERT", changedById: user.id, correctionReason: DEMO_SCAN_REASON } });
    });

    const time = new Intl.DateTimeFormat("tr-TR", { timeStyle: "short", timeZone: APP_TIME_ZONE }).format(scannedAt);
    message = `${employee.firstName} ${employee.lastName}: ${ATTENDANCE_TYPE_LABELS[type]} kaydedildi (${time}).`;
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/movements");
    revalidatePath("/dashboard/reports");
  });
  return result.ok ? { ok: true, message } : result;
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
