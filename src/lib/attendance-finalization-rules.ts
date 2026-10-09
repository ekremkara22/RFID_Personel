import type { AttendanceType } from "@/generated/prisma/client";
import { getAppDayRange, getDateOnlyKey } from "@/lib/app-time";
import { timeToMinutes } from "@/lib/work-calendar-rules";

export const DEFAULT_ATTENDANCE_FINALIZATION_DELAY_MINUTES = 120;
export const DUPLICATE_SCAN_WINDOW_MS = 10_000;
const EARLY_SCAN_WINDOW_MINUTES = 6 * 60;

export type ScheduledCalendar = {
  workDate: Date;
  plannedStart: string | null;
  plannedEnd: string | null;
  crossesMidnight: boolean;
};

export type FinalizationMovement = {
  id: number;
  type: AttendanceType;
  scannedAt: Date;
  deviceId?: number | null;
  rfidCardId?: string | null;
};

export function getScheduledShiftBounds(
  calendar: ScheduledCalendar,
  delayMinutes = DEFAULT_ATTENDANCE_FINALIZATION_DELAY_MINUTES,
) {
  const startMinutes = timeToMinutes(calendar.plannedStart);
  const endMinutes = timeToMinutes(calendar.plannedEnd);
  if (startMinutes === null || endMinutes === null) return null;

  const day = getAppDayRange(getDateOnlyKey(calendar.workDate));
  const shiftStart = new Date(day.start.getTime() + startMinutes * 60_000);
  const endDayOffset = calendar.crossesMidnight && endMinutes <= startMinutes ? 24 * 60 * 60_000 : 0;
  const shiftEnd = new Date(day.start.getTime() + endDayOffset + endMinutes * 60_000);
  const safeDelayMinutes = Number.isFinite(delayMinutes) ? Math.max(0, delayMinutes) : DEFAULT_ATTENDANCE_FINALIZATION_DELAY_MINUTES;

  return {
    workDateKey: day.dayKey,
    shiftStart,
    shiftEnd,
    dueAt: new Date(shiftEnd.getTime() + safeDelayMinutes * 60_000),
    collectionStart: calendar.crossesMidnight
      ? new Date(shiftStart.getTime() - EARLY_SCAN_WINDOW_MINUTES * 60_000)
      : day.start,
  };
}

export function findDuplicateScanIds(logs: FinalizationMovement[]) {
  const sorted = [...logs].sort((first, second) => first.scannedAt.getTime() - second.scannedAt.getTime());
  const duplicateIds: number[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    const sameDevice = previous.deviceId === current.deviceId;
    const sameCard = !previous.rfidCardId || !current.rfidCardId || previous.rfidCardId === current.rfidCardId;
    if (sameDevice && sameCard && current.scannedAt.getTime() - previous.scannedAt.getTime() <= DUPLICATE_SCAN_WINDOW_MS) {
      duplicateIds.push(current.id);
    }
  }
  return duplicateIds;
}

export function buildFinalizedMovementTypes(logs: FinalizationMovement[]) {
  const sorted = [...logs].sort(
    (first, second) => first.scannedAt.getTime() - second.scannedAt.getTime() || first.id - second.id,
  );
  if (sorted.length === 0) {
    return { status: "EMPTY" as const, decisions: [] as Array<{ id: number; type: AttendanceType }>, duplicateIds: [] as number[] };
  }

  const duplicateIds = findDuplicateScanIds(sorted);
  const firstDecision = { id: sorted[0].id, type: "ENTRY" as AttendanceType };
  if (duplicateIds.length > 0 || sorted.length === 1 || sorted.length % 2 === 1) {
    return {
      status: "REVIEW" as const,
      decisions: [firstDecision],
      duplicateIds,
    };
  }

  const decisions = sorted.map((log, index) => {
    if (index === 0) return firstDecision;
    if (index === sorted.length - 1) return { id: log.id, type: "EXIT" as AttendanceType };
    return { id: log.id, type: (index % 2 === 1 ? "BREAK_START" : "BREAK_END") as AttendanceType };
  });

  return { status: "FINALIZED" as const, decisions, duplicateIds };
}
