import type { AttendanceTrackingMode, BreakDeductionMode, LeaveType, Prisma } from "@/generated/prisma/client";
import { calculateAttendanceDay, type PuantajDayCode } from "@/lib/attendance-day-calculation";
import { getScheduledShiftBounds } from "@/lib/attendance-finalization-rules";
import { ATTENDANCE_TYPE_LABELS } from "@/lib/attendance-labels";
import { APP_TIME_ZONE, dateOnlyFromKey, getAppDayKey, getAppDayRange, getDateOnlyKey } from "@/lib/app-time";
import { prisma } from "@/lib/prisma";

/** Bir personelin bir günlük puantaj satırı. Aylık puantaj snapshot'ında da bu biçimde saklanır. */
export type AttendanceDayRow = {
  employeeId: number;
  employee: string;
  registrationNumber: string;
  company: string;
  branch: string;
  department: string;
  date: string;
  dayType: string;
  plannedStart: string;
  plannedEnd: string;
  firstEntry: string;
  lastExit: string;
  code: PuantajDayCode;
  leaveType: string;
  plannedMinutes: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  breakMinutes: number;
  actualBreakMinutes: number;
  excessBreakMinutes: number;
  workedMinutes: number;
  overtimeMinutes: number;
  holidayWorkMinutes: number;
  missingMinutes: number;
  movementCount: number;
  movements: string;
  issues: string;
};

/** Bir personelin seçilen aralıktaki puantaj toplamları. */
export type AttendanceSummaryRow = {
  employeeId: number;
  employee: string;
  registrationNumber: string;
  company: string;
  branch: string;
  department: string;
  plannedDays: number;
  attendedDays: number;
  missingDays: number;
  lateDays: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  breakMinutes: number;
  actualBreakMinutes: number;
  excessBreakMinutes: number;
  plannedMinutes: number;
  workedMinutes: number;
  overtimeMinutes: number;
  holidayWorkMinutes: number;
  missingMinutes: number;
  leaveDays: number;
  errorDays: number;
  codeCounts: Partial<Record<PuantajDayCode, number>>;
};

export type AttendanceEmployee = {
  id: number;
  firstName: string;
  lastName: string;
  registrationNumber: string | null;
  branch: string | null;
  department: string;
  isActive: boolean;
};

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  ANNUAL: "Yıllık izin",
  EXCUSE: "Mazeret izni",
  UNPAID: "Ücretsiz izin",
  MEDICAL: "Rapor",
  ADMINISTRATIVE: "İdari izin",
  HOURLY: "Saatlik izin",
  HALF_DAY: "Yarım gün izin",
};
const LEAVE_CODES = new Set<PuantajDayCode>(["Y", "R", "Üİ", "İ"]);
const ONE_DAY_MS = 24 * 60 * 60_000;

function formatTime(date?: Date | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: APP_TIME_ZONE }).format(date);
}

/**
 * Seçilen gün aralığındaki (iki uç dahil) her personel-gün için puantaj satırı üretir.
 * Bugünden sonraki günler atlanır. Tüm puantaj ve İK raporları bu fonksiyonu kullanır.
 */
export async function loadAttendanceDays(params: {
  companyId: number;
  employeeWhere: Prisma.EmployeeWhereInput;
  fromKey: string;
  toKey: string;
}) {
  const { companyId, fromKey, toKey } = params;
  const employeeWhere: Prisma.EmployeeWhereInput = { AND: [{ companyId }, params.employeeWhere] };
  // Gece vardiyası aralık sınırını aşabilir: önceki günün vardiyası ve sonraki günün okutmaları da okunur.
  const calendarStart = new Date(dateOnlyFromKey(fromKey).getTime() - ONE_DAY_MS);
  const calendarEnd = new Date(dateOnlyFromKey(toKey).getTime() + ONE_DAY_MS);
  const logStart = new Date(getAppDayRange(fromKey).start.getTime() - ONE_DAY_MS);
  const logEnd = new Date(getAppDayRange(toKey).end.getTime() + ONE_DAY_MS);
  const [company, employees, calendars, logs] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { name: true, attendanceTrackingMode: true, breakDeductionMode: true, attendanceFinalizationDelayMinutes: true },
    }),
    prisma.employee.findMany({
      where: employeeWhere,
      select: { id: true, firstName: true, lastName: true, registrationNumber: true, branch: true, department: true, isActive: true },
      orderBy: [{ department: "asc" }, { firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.employeeDailyCalendar.findMany({
      where: { employee: employeeWhere, workDate: { gte: calendarStart, lt: calendarEnd } },
      include: { leave: { select: { type: true, durationType: true, startTime: true, endTime: true } } },
      orderBy: [{ workDate: "asc" }, { employeeId: "asc" }],
    }),
    prisma.attendanceLog.findMany({
      where: { employee: employeeWhere, scannedAt: { gte: logStart, lt: logEnd } },
      orderBy: [{ scannedAt: "asc" }, { id: "asc" }],
    }),
  ]);

  const todayKey = getAppDayKey(new Date());
  const isInRange = (dayKey: string) => dayKey >= fromKey && dayKey <= toKey && dayKey <= todayKey;
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const calendarByKey = new Map(calendars
    .filter((calendar) => isInRange(getDateOnlyKey(calendar.workDate)))
    .map((calendar) => [`${calendar.employeeId}|${getDateOnlyKey(calendar.workDate)}`, calendar]));
  // Gece vardiyasındaki okutmalar takvim gününe değil, kesinleştirmedeki gibi vardiya penceresine aittir.
  const nightWindows = calendars.flatMap((calendar) => {
    const bounds = calendar.crossesMidnight ? getScheduledShiftBounds(calendar, company.attendanceFinalizationDelayMinutes) : null;
    return bounds ? [{ employeeId: calendar.employeeId, dayKey: getDateOnlyKey(calendar.workDate), start: bounds.collectionStart, end: bounds.dueAt }] : [];
  });
  const logsByKey = new Map<string, typeof logs>();
  for (const log of logs) {
    const window = nightWindows.find((item) => item.employeeId === log.employeeId && log.scannedAt >= item.start && log.scannedAt <= item.end);
    const dayKey = window?.dayKey ?? getAppDayKey(log.scannedAt);
    if (!isInRange(dayKey)) continue;
    const key = `${log.employeeId}|${dayKey}`;
    const list = logsByKey.get(key) ?? [];
    list.push(log);
    logsByKey.set(key, list);
  }

  const rows: AttendanceDayRow[] = [];
  for (const key of [...new Set([...calendarByKey.keys(), ...logsByKey.keys()])].sort()) {
    const [employeeIdText, dayKey] = key.split("|");
    const employee = employeeById.get(Number(employeeIdText));
    if (!employee) continue;
    const calendar = calendarByKey.get(key);
    const dayLogs = logsByKey.get(key) ?? [];
    const leave = calendar?.leave ?? null;
    const day = calculateAttendanceDay({
      trackingMode: company.attendanceTrackingMode,
      breakDeductionMode: company.breakDeductionMode,
      calendar: calendar ?? null,
      leave,
      logs: dayLogs,
      isPast: dayKey < todayKey,
      isToday: dayKey === todayKey,
    });
    rows.push({
      employeeId: employee.id,
      employee: `${employee.firstName} ${employee.lastName}`.trim(),
      registrationNumber: employee.registrationNumber ?? "-",
      company: company.name,
      branch: employee.branch ?? "-",
      department: employee.department || "Departmansız",
      date: dayKey,
      dayType: calendar?.dayType ?? "TAKVİM YOK",
      plannedStart: calendar?.plannedStart ?? "-",
      plannedEnd: calendar?.plannedEnd ?? "-",
      firstEntry: formatTime(day.entry),
      lastExit: formatTime(day.exit),
      code: day.code,
      leaveType: leave ? LEAVE_TYPE_LABELS[leave.type] : "-",
      plannedMinutes: day.plannedMinutes,
      lateMinutes: day.lateMinutes,
      earlyLeaveMinutes: day.earlyLeaveMinutes,
      breakMinutes: day.breakMinutes,
      actualBreakMinutes: day.actualBreakMinutes,
      excessBreakMinutes: day.excessBreakMinutes,
      workedMinutes: day.workedMinutes,
      overtimeMinutes: day.overtimeMinutes,
      holidayWorkMinutes: day.holidayWorkMinutes,
      missingMinutes: day.missingMinutes,
      movementCount: dayLogs.length,
      movements: dayLogs.map((log) => `${formatTime(log.scannedAt)} ${ATTENDANCE_TYPE_LABELS[log.type]}`).join(" | "),
      issues: day.issues.join(", ") || "Normal",
    });
  }

  return {
    companyName: company.name,
    trackingMode: company.attendanceTrackingMode as AttendanceTrackingMode,
    breakDeductionMode: company.breakDeductionMode as BreakDeductionMode,
    employees: employees as AttendanceEmployee[],
    rows,
  };
}

/** Günlük satırları personel bazında toplar; satırı olmayan personel sıfır değerlerle döner. */
export function summarizeAttendanceDays(employees: AttendanceEmployee[], rows: AttendanceDayRow[], companyName: string) {
  const rowsByEmployee = new Map<number, AttendanceDayRow[]>();
  for (const row of rows) {
    const list = rowsByEmployee.get(row.employeeId) ?? [];
    list.push(row);
    rowsByEmployee.set(row.employeeId, list);
  }
  const sum = (list: AttendanceDayRow[], pick: (row: AttendanceDayRow) => number) => list.reduce((total, row) => total + pick(row), 0);
  return employees.map<AttendanceSummaryRow>((employee) => {
    const list = rowsByEmployee.get(employee.id) ?? [];
    const codeCounts: Partial<Record<PuantajDayCode, number>> = {};
    for (const row of list) if (row.code) codeCounts[row.code] = (codeCounts[row.code] ?? 0) + 1;
    return {
      employeeId: employee.id,
      employee: `${employee.firstName} ${employee.lastName}`.trim(),
      registrationNumber: employee.registrationNumber ?? "-",
      company: companyName,
      branch: employee.branch ?? "-",
      department: employee.department || "Departmansız",
      plannedDays: list.filter((row) => row.plannedMinutes > 0).length,
      attendedDays: list.filter((row) => row.firstEntry !== "-").length,
      missingDays: codeCounts["D"] ?? 0,
      lateDays: list.filter((row) => row.lateMinutes > 0).length,
      lateMinutes: sum(list, (row) => row.lateMinutes),
      earlyLeaveMinutes: sum(list, (row) => row.earlyLeaveMinutes),
      breakMinutes: sum(list, (row) => row.breakMinutes),
      actualBreakMinutes: sum(list, (row) => row.actualBreakMinutes),
      excessBreakMinutes: sum(list, (row) => row.excessBreakMinutes),
      plannedMinutes: sum(list, (row) => row.plannedMinutes),
      workedMinutes: sum(list, (row) => row.workedMinutes),
      overtimeMinutes: sum(list, (row) => row.overtimeMinutes),
      holidayWorkMinutes: sum(list, (row) => row.holidayWorkMinutes),
      missingMinutes: sum(list, (row) => row.missingMinutes),
      leaveDays: list.filter((row) => LEAVE_CODES.has(row.code)).length,
      errorDays: list.filter((row) => row.issues !== "Normal").length,
      codeCounts,
    };
  });
}
