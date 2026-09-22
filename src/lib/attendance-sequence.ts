import type { AttendanceType } from "@/generated/prisma/client";

export const EXIT_TOLERANCE_MINUTES = 10;

type Movement = { id?: number; type: AttendanceType; scannedAt?: Date };

const BREAK_START_TYPES = new Set<AttendanceType>(["BREAK_START", "MEAL_START"]);
const BREAK_END_TYPES = new Set<AttendanceType>(["BREAK_END", "MEAL_END"]);

export function inferBidirectionalMovement(params: {
  logs: Movement[];
  isNearPlannedEnd: boolean;
}): AttendanceType {
  const { logs, isNearPlannedEnd } = params;
  if (logs.length === 0) return "ENTRY";
  if (isNearPlannedEnd) return "EXIT";

  // Geçici EXIT kaydı aynı gün yapılacak yeni okutmayı kilitlemez.
  const breakMovementCount = logs.filter(
    (log) => BREAK_START_TYPES.has(log.type) || BREAK_END_TYPES.has(log.type),
  ).length;
  return breakMovementCount % 2 === 0 ? "BREAK_START" : "BREAK_END";
}

export type AttendanceSequenceAnalysis = {
  totalMinutes: number;
  isOnBreak: boolean;
  isValid: boolean;
  unmatchedLogIds: number[];
};

export function analyzeAttendanceSequence(
  logs: Movement[],
  options: { requireExit?: boolean; allowOpenBreak?: boolean } = {},
): AttendanceSequenceAnalysis {
  const sorted = [...logs].sort(
    (a, b) => (a.scannedAt?.getTime() ?? 0) - (b.scannedAt?.getTime() ?? 0),
  );
  const unmatchedLogIds: number[] = [];
  let totalMinutes = 0;

  if (sorted.length === 0) {
    return { totalMinutes, isOnBreak: false, isValid: true, unmatchedLogIds };
  }

  if (sorted[0].type !== "ENTRY" && sorted[0].id !== undefined) {
    unmatchedLogIds.push(sorted[0].id);
  }

  const hasFinalExit = sorted.length > 1 && sorted.at(-1)?.type === "EXIT";
  if (options.requireExit && !hasFinalExit && sorted.at(-1)?.id !== undefined) {
    unmatchedLogIds.push(sorted.at(-1)!.id!);
  }

  const middle = sorted.slice(1, hasFinalExit ? -1 : undefined).filter((log) => log.type !== "EXIT");
  for (let index = 0; index < middle.length;) {
    const start = middle[index];
    const end = middle[index + 1];
    if (!end && options.allowOpenBreak && BREAK_START_TYPES.has(start.type)) break;
    if (
      BREAK_START_TYPES.has(start.type) && end && BREAK_END_TYPES.has(end.type) &&
      start.scannedAt && end.scannedAt && end.scannedAt > start.scannedAt
    ) {
      totalMinutes += Math.floor((end.scannedAt.getTime() - start.scannedAt.getTime()) / 60_000);
      index += 2;
      continue;
    }
    if (start.id !== undefined) unmatchedLogIds.push(start.id);
    index += 1;
  }

  const lastNonExit = [...sorted].reverse().find((log) => log.type !== "EXIT");
  const isOnBreak = Boolean(lastNonExit && BREAK_START_TYPES.has(lastNonExit.type));
  const uniqueUnmatchedIds = [...new Set(unmatchedLogIds)];
  return {
    totalMinutes,
    isOnBreak,
    isValid: uniqueUnmatchedIds.length === 0,
    unmatchedLogIds: uniqueUnmatchedIds,
  };
}

export function calculateBreakMinutes(logs: Movement[], _now?: Date) {
  void _now;
  const analysis = analyzeAttendanceSequence(logs, { allowOpenBreak: true });
  return { totalMinutes: analysis.totalMinutes, isOnBreak: analysis.isOnBreak };
}
