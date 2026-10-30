import type { AttendanceDayRow, AttendanceSummaryRow } from "@/lib/attendance-days";

const LEAVE_CODES = new Set(["Y", "R", "Üİ", "İ"]);

/** Planlı iş günlerinden işe gelinen günlerin oranı için pay ve payda. İzinli günler paydaya girmez. */
export function attendanceRatio(rows: AttendanceDayRow[]) {
  const workDays = rows.filter((row) => row.plannedMinutes > 0 && !LEAVE_CODES.has(row.code));
  return { attended: workDays.filter((row) => row.firstEntry !== "-").length, planned: workDays.length };
}

export function totals(rows: AttendanceSummaryRow[]) {
  const sum = (pick: (row: AttendanceSummaryRow) => number) => rows.reduce((total, row) => total + pick(row), 0);
  return {
    employees: rows.length,
    plannedDays: sum((row) => row.plannedDays),
    attendedDays: sum((row) => row.attendedDays),
    plannedMinutes: sum((row) => row.plannedMinutes),
    workedMinutes: sum((row) => row.workedMinutes),
    overtimeMinutes: sum((row) => row.overtimeMinutes),
    holidayWorkMinutes: sum((row) => row.holidayWorkMinutes),
    missingMinutes: sum((row) => row.missingMinutes),
    lateDays: sum((row) => row.lateDays),
    lateMinutes: sum((row) => row.lateMinutes),
    earlyLeaveMinutes: sum((row) => row.earlyLeaveMinutes),
    excessBreakMinutes: sum((row) => row.excessBreakMinutes),
    leaveDays: sum((row) => row.leaveDays),
    absentDays: sum((row) => row.missingDays),
    errorDays: sum((row) => row.errorDays),
  };
}

export function groupByDepartment(summaryRows: AttendanceSummaryRow[], dayRows: AttendanceDayRow[]) {
  const departments = new Map<string, { department: string; summaries: AttendanceSummaryRow[]; days: AttendanceDayRow[] }>();
  for (const row of summaryRows) {
    const group = departments.get(row.department) ?? { department: row.department, summaries: [], days: [] };
    group.summaries.push(row);
    departments.set(row.department, group);
  }
  for (const row of dayRows) departments.get(row.department)?.days.push(row);
  return [...departments.values()].map((group) => ({ department: group.department, totals: totals(group.summaries), ratio: attendanceRatio(group.days) }));
}

/** Gün bazında planlı personel ve işe gelen personel sayısı. */
export function dailyPresence(dayKeys: string[], rows: AttendanceDayRow[]) {
  const byDay = new Map<string, { planned: number; present: number }>();
  for (const key of dayKeys) byDay.set(key, { planned: 0, present: 0 });
  for (const row of rows) {
    const day = byDay.get(row.date);
    if (!day) continue;
    if (row.plannedMinutes > 0 && !LEAVE_CODES.has(row.code)) day.planned += 1;
    if (row.firstEntry !== "-") day.present += 1;
  }
  return dayKeys.map((dayKey) => ({ dayKey, ...byDay.get(dayKey)! }));
}
