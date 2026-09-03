import type { AttendanceType } from "@/generated/prisma/client";

export const EXIT_TOLERANCE_MINUTES = 30;

type Movement = { type: AttendanceType };

export function inferBidirectionalMovement(params: {
  logs: Movement[];
  isNearPlannedEnd: boolean;
}): AttendanceType {
  const { logs, isNearPlannedEnd } = params;
  const lastLog = logs.at(-1);

  if (!lastLog) return "ENTRY";
  if (isNearPlannedEnd && lastLog.type !== "EXIT") return "EXIT";
  if (lastLog.type === "BREAK_START") return "BREAK_END";
  if (lastLog.type === "ENTRY") return "BREAK_START";
  if (lastLog.type === "BREAK_END") return "EXIT";
  if (lastLog.type === "EXIT") return "ENTRY";

  return "ENTRY";
}

export function calculateBreakMinutes(
  logs: Array<{ type: AttendanceType; scannedAt: Date }>,
  now = new Date(),
) {
  let openBreak: Date | null = null;
  let totalMinutes = 0;
  let isOnBreak = false;

  for (const log of [...logs].sort((a, b) => a.scannedAt.getTime() - b.scannedAt.getTime())) {
    if (log.type === "BREAK_START") {
      openBreak = log.scannedAt;
      isOnBreak = true;
    } else if (log.type === "BREAK_END" && openBreak) {
      totalMinutes += Math.max(0, Math.round((log.scannedAt.getTime() - openBreak.getTime()) / 60_000));
      openBreak = null;
      isOnBreak = false;
    }
  }

  if (openBreak) {
    totalMinutes += Math.max(0, Math.round((now.getTime() - openBreak.getTime()) / 60_000));
  }

  return { totalMinutes, isOnBreak };
}
