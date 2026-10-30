import "server-only";

import { AttendanceTrackingMode, AttendanceType, DevicePurpose } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAppDayRange } from "@/lib/app-time";
import { resolveEmployeeAttendanceCalendar } from "@/lib/work-calendar";
import { inferBidirectionalMovement } from "@/lib/attendance-sequence";

/** Movement type of a card read: shared by the device scan API and the trial demo reader. */
export async function inferAttendanceType(params: {
  employeeId: number;
  devicePurpose: DevicePurpose;
  scannedAt: Date;
  finalizationDelayMinutes: number;
  trackingMode: AttendanceTrackingMode;
}) {
  const day = getAppDayRange(params.scannedAt);
  const resolved = await resolveEmployeeAttendanceCalendar(
    params.employeeId,
    params.scannedAt,
    params.finalizationDelayMinutes,
  );
  const todayLogs = await prisma.attendanceLog.findMany({
    where: {
      employeeId: params.employeeId,
      scannedAt: resolved.bounds
        ? { gte: resolved.bounds.collectionStart, lte: params.scannedAt }
        : { gte: day.start, lt: day.end },
    },
    orderBy: { scannedAt: "asc" },
  });

  if (todayLogs.length === 0) {
    return AttendanceType.ENTRY;
  }

  if (params.devicePurpose === DevicePurpose.ENTRY) return AttendanceType.ENTRY;
  if (params.devicePurpose === DevicePurpose.EXIT) return AttendanceType.EXIT;
  if (params.trackingMode === AttendanceTrackingMode.ENTRY_EXIT_ONLY) return AttendanceType.INTERMEDIATE;
  if (params.devicePurpose === DevicePurpose.BREAK_START) return AttendanceType.BREAK_START;
  if (params.devicePurpose === DevicePurpose.BREAK_END) return AttendanceType.BREAK_END;

  return inferBidirectionalMovement({ logs: todayLogs, trackingMode: params.trackingMode });
}
