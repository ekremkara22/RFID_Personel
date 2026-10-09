import { getAppDayRange } from "@/lib/app-time";
import {
  buildFinalizedMovementTypes,
  getScheduledShiftBounds,
} from "@/lib/attendance-finalization-rules";
import { assertPayrollPeriodUnlocked } from "@/lib/payroll-period";
import { prisma } from "@/lib/prisma";
import { saveResolvedEmployeeWorkCalendar } from "@/lib/work-calendar";

export type AttendanceFinalizerSummary = {
  considered: number;
  finalized: number;
  reviewRequired: number;
  noMovements: number;
  manualDaysSkipped: number;
  lockedDaysSkipped: number;
  changedMovements: number;
};

export async function runAttendanceFinalizer(now = new Date(), lookbackDays = 4) {
  const today = getAppDayRange(now);
  const lookbackStart = new Date(today.start.getTime() - lookbackDays * 24 * 60 * 60_000);
  const candidates = await prisma.employeeDailyCalendar.findMany({
    where: {
      workDate: { gte: lookbackStart, lte: today.dateOnly },
      plannedStart: { not: null },
      plannedEnd: { not: null },
      plannedNetMinutes: { gt: 0 },
    },
    include: {
      employee: {
        select: {
          companyId: true,
          company: { select: { attendanceFinalizationDelayMinutes: true } },
        },
      },
    },
    orderBy: [{ workDate: "asc" }, { employeeId: "asc" }],
  });

  const summary: AttendanceFinalizerSummary = {
    considered: 0,
    finalized: 0,
    reviewRequired: 0,
    noMovements: 0,
    manualDaysSkipped: 0,
    lockedDaysSkipped: 0,
    changedMovements: 0,
  };

  for (const candidate of candidates) {
    const delayMinutes = candidate.employee.company.attendanceFinalizationDelayMinutes;
    const refreshed = await saveResolvedEmployeeWorkCalendar(candidate.employeeId, candidate.workDate);
    const bounds = getScheduledShiftBounds(refreshed, delayMinutes);
    if (!bounds || now < bounds.dueAt) continue;
    summary.considered += 1;

    const logs = await prisma.attendanceLog.findMany({
      where: {
        employeeId: candidate.employeeId,
        scannedAt: { gte: bounds.collectionStart, lte: bounds.dueAt },
      },
      orderBy: [{ scannedAt: "asc" }, { id: "asc" }],
    });
    const latestReceipt = logs.reduce<Date | null>((latest, log) => {
      const receipt = log.receivedAt ?? log.scannedAt;
      return !latest || receipt > latest ? receipt : latest;
    }, null);
    if (
      refreshed.attendanceFinalizedAt &&
      (!latestReceipt || latestReceipt <= refreshed.attendanceFinalizedAt)
    ) {
      continue;
    }

    try {
      await assertPayrollPeriodUnlocked(candidate.employee.companyId, candidate.workDate);
    } catch {
      summary.lockedDaysSkipped += 1;
      continue;
    }

    const manualAuditCount = await prisma.attendanceMovementAudit.count({
      where: {
        employeeId: candidate.employeeId,
        movementDateTime: { gte: bounds.collectionStart, lte: bounds.dueAt },
        changedById: { not: null },
      },
    });
    if (manualAuditCount > 0) {
      await prisma.employeeDailyCalendar.update({
        where: { id: refreshed.id },
        data: {
          attendanceFinalizedAt: now,
          attendanceFinalizationStatus: "MANUAL_CONTROL",
          attendanceFinalizationNote: "Manuel işlem bulunan gün otomatik olarak değiştirilmedi.",
        },
      });
      summary.manualDaysSkipped += 1;
      continue;
    }

    const result = buildFinalizedMovementTypes(logs);
    if (result.status === "EMPTY") {
      await prisma.employeeDailyCalendar.update({
        where: { id: refreshed.id },
        data: {
          attendanceFinalizedAt: now,
          attendanceFinalizationStatus: "NO_MOVEMENTS",
          attendanceFinalizationNote: "Takvimde çalışma günü olmasına rağmen hareket bulunamadı.",
        },
      });
      summary.noMovements += 1;
      continue;
    }

    const decisionById = new Map(result.decisions.map((decision) => [decision.id, decision.type]));
    const changedLogs = logs.filter((log) => {
      const nextType = decisionById.get(log.id);
      return nextType && nextType !== log.type;
    });
    const calendarDescription = `${refreshed.plannedStart}-${refreshed.plannedEnd} vardiyası, ${delayMinutes} dakika tolerans, ${refreshed.ruleSourceType}`;
    const status = result.status === "FINALIZED" ? "FINALIZED" : "REVIEW_REQUIRED";
    const note = result.status === "FINALIZED"
      ? `Hareketler ${calendarDescription} kullanılarak otomatik kesinleştirildi.`
      : result.duplicateIds.length > 0
        ? `Tekrarlı okutma şüphesi nedeniyle otomatik kesinleştirme yapılmadı. Kayıtlar: ${result.duplicateIds.join(", ")}.`
        : "Çıkış veya mola eşleşmesi kesin belirlenemedi; yönetici incelemesi gerekiyor.";

    await prisma.$transaction(async (tx) => {
      for (const log of changedLogs) {
        const nextType = decisionById.get(log.id)!;
        await tx.attendanceLog.update({ where: { id: log.id }, data: { type: nextType } });
        await tx.attendanceMovementAudit.create({
          data: {
            sourceLogId: log.id,
            employeeId: log.employeeId,
            movementDateTime: log.scannedAt,
            oldType: log.type,
            newType: nextType,
            oldScannedAt: log.scannedAt,
            newScannedAt: log.scannedAt,
            operation: "UPDATE",
            correctionReason: `Sistem tarafından otomatik kesinleştirildi: ${calendarDescription}.`,
          },
        });
      }
      await tx.employeeDailyCalendar.update({
        where: { id: refreshed.id },
        data: {
          attendanceFinalizedAt: now,
          attendanceFinalizationStatus: status,
          attendanceFinalizationNote: note,
        },
      });
    });

    summary.changedMovements += changedLogs.length;
    if (result.status === "FINALIZED") summary.finalized += 1;
    else summary.reviewRequired += 1;
  }

  return summary;
}
