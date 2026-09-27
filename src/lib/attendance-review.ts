import { createHash } from "node:crypto";
import type { AttendanceLog, Employee } from "@/generated/prisma/client";
import { analyzeAttendanceSequence } from "@/lib/attendance-sequence";
import { dateOnlyFromKey, getAppDayKey } from "@/lib/app-time";

export const DELAYED_UPLOAD_THRESHOLD_MS = 5 * 60_000;

export type AttendanceReviewCase = {
  employee: Employee;
  dayKey: string;
  workDate: Date;
  logs: AttendanceLog[];
  issueLabels: string[];
  unmatchedLogIds: number[];
  delayedLogIds: number[];
  fingerprint: string;
};

export function buildAttendanceReviewCases(
  logs: Array<AttendanceLog & { employee: Employee }>,
  todayKey = getAppDayKey(new Date()),
) {
  const grouped = new Map<string, Array<AttendanceLog & { employee: Employee }>>();
  for (const log of logs) {
    const key = `${log.employeeId}-${getAppDayKey(log.scannedAt)}`;
    const list = grouped.get(key) ?? [];
    list.push(log);
    grouped.set(key, list);
  }

  const cases: AttendanceReviewCase[] = [];
  for (const dayLogs of grouped.values()) {
    dayLogs.sort((first, second) => first.scannedAt.getTime() - second.scannedAt.getTime());
    const dayKey = getAppDayKey(dayLogs[0].scannedAt);
    const analysis = analyzeAttendanceSequence(dayLogs, {
      requireExit: dayKey < todayKey,
      allowOpenBreak: dayKey === todayKey,
    });
    const hasExit = dayLogs.some((log) => log.type === "EXIT");
    const delayedLogIds = dayLogs
      .filter((log) => log.receivedAt && log.receivedAt.getTime() - log.scannedAt.getTime() > DELAYED_UPLOAD_THRESHOLD_MS)
      .map((log) => log.id);
    const issueLabels: string[] = [];
    if (dayKey < todayKey && dayLogs.length > 0 && !hasExit) issueLabels.push("Eksik çıkış");
    if (analysis.unmatchedLogIds.length > 0) issueLabels.push("Eşleşmeyen mola/hareket");
    if (delayedLogIds.length > 0) issueLabels.push("Gecikmeli kayıt");
    if (issueLabels.length === 0) continue;

    const fingerprint = createHash("sha256")
      .update(`${dayLogs[0].employeeId}|${dayKey}|${issueLabels.join("|")}|${analysis.unmatchedLogIds.join(",")}|${delayedLogIds.join(",")}`)
      .digest("hex");
    cases.push({
      employee: dayLogs[0].employee,
      dayKey,
      workDate: dateOnlyFromKey(dayKey),
      logs: dayLogs,
      issueLabels,
      unmatchedLogIds: analysis.unmatchedLogIds,
      delayedLogIds,
      fingerprint,
    });
  }

  return cases.sort((first, second) => second.dayKey.localeCompare(first.dayKey));
}
