"use server";

import { revalidatePath } from "next/cache";
import { getAppDayKey, getAppDayRange } from "@/lib/app-time";
import { findProbableExitLogId, getScheduledShiftBounds } from "@/lib/attendance-finalization-rules";
import { assertPermission, employeeScopeWhere } from "@/lib/authorization";
import { assertPayrollPeriodUnlocked } from "@/lib/payroll-period";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { getString, getId, redirectToReturnPath } from "@/modules/shared/action-helpers";

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

export async function confirmProbableExitAction(formData: FormData) {
  const { user, authorization } = await requireSessionUser(); assertPermission(authorization, PERMISSIONS.MOVEMENT_UPDATE);
  const logId = getId(formData, "logId");
  const log = await prisma.attendanceLog.findFirst({
    where: { id: logId, employee: employeeScopeWhere(authorization) },
    include: { employee: { select: { companyId: true } } },
  });
  if (!log) throw new Error("Hareket bulunamadi veya bu kayit icin yetkiniz yok.");
  const day = getAppDayRange(log.scannedAt);
  if (day.dayKey >= getAppDayKey(new Date())) throw new Error("Bugunun hareketi cikis olarak onaylanamaz.");
  await assertPayrollPeriodUnlocked(log.employee.companyId, log.scannedAt);

  const [dayLogs, calendar] = await Promise.all([
    prisma.attendanceLog.findMany({ where: { employeeId: log.employeeId, scannedAt: { gte: day.start, lt: day.end } } }),
    prisma.employeeDailyCalendar.findUnique({ where: { employeeId_workDate: { employeeId: log.employeeId, workDate: day.dateOnly } } }),
  ]);
  const shiftEnd = calendar ? getScheduledShiftBounds(calendar)?.shiftEnd ?? null : null;
  if (findProbableExitLogId(dayLogs, shiftEnd) !== log.id) throw new Error("Bu hareket artik muhtemel cikis kosullarini saglamiyor.");

  await prisma.$transaction(async (tx) => {
    await tx.attendanceLog.update({ where: { id: log.id }, data: { type: "EXIT" } });
    await tx.attendanceMovementAudit.create({
      data: {
        sourceLogId: log.id,
        employeeId: log.employeeId,
        movementDateTime: log.scannedAt,
        oldType: log.type,
        newType: "EXIT",
        oldScannedAt: log.scannedAt,
        newScannedAt: log.scannedAt,
        operation: "UPDATE",
        changedById: user.id,
        correctionReason: `İnceleme ekranında vardiya bitişine (${calendar?.plannedEnd}) yakın son okutma çıkış olarak onaylandı.`,
      },
    });
  });

  revalidatePath("/dashboard/movements");
  revalidatePath("/dashboard/movement-reviews");
  revalidatePath("/dashboard/reports/payroll");
  redirectToReturnPath(formData, "/dashboard/movement-reviews");
}
