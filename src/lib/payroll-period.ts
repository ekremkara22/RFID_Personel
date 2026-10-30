import { type AttendanceTrackingMode, type LeaveType, PayrollPeriodStatus } from "@/generated/prisma/client";
import { calculateAttendanceDay, type PuantajDayCode } from "@/lib/attendance-day-calculation";
import { getScheduledShiftBounds } from "@/lib/attendance-finalization-rules";
import { ATTENDANCE_TYPE_LABELS } from "@/lib/attendance-labels";
import { dateOnlyFromKey, getAppDayKey, getDateOnlyKey } from "@/lib/app-time";
import { prisma } from "@/lib/prisma";

export const PAYROLL_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export type PayrollDetailRow = {
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
  workedMinutes: number;
  overtimeMinutes: number;
  holidayWorkMinutes: number;
  missingMinutes: number;
  movementCount: number;
  movements: string;
  issues: string;
};

export type PayrollSummaryRow = {
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
  plannedMinutes: number;
  workedMinutes: number;
  overtimeMinutes: number;
  holidayWorkMinutes: number;
  missingMinutes: number;
  leaveDays: number;
  errorDays: number;
  codeCounts: Partial<Record<PuantajDayCode, number>>;
};

export type PayrollSnapshot = {
  version: 2;
  trackingMode: AttendanceTrackingMode | null;
  monthKey: string;
  generatedAt: string;
  summaryRows: PayrollSummaryRow[];
  detailRows: PayrollDetailRow[];
};

export function getDefaultPayrollMonth(now = new Date()) {
  return getAppDayKey(now).slice(0, 7);
}

export function normalizePayrollMonth(value?: string) {
  const currentMonth = getDefaultPayrollMonth();
  return value && PAYROLL_MONTH_PATTERN.test(value) && value <= currentMonth ? value : currentMonth;
}

export function getPayrollMonthRange(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    year,
    month,
    start: dateOnlyFromKey(`${monthKey}-01`),
    end: dateOnlyFromKey(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01`),
  };
}

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  ANNUAL: "Yıllık izin",
  EXCUSE: "Mazeret izni",
  UNPAID: "Ücretsiz izin",
  MEDICAL: "Rapor",
  ADMINISTRATIVE: "İdari izin",
  HOURLY: "Saatlik izin",
  HALF_DAY: "Yarım gün izin",
};
const LEAVE_CODES = new Set<PuantajDayCode>(["Y", "R", "Üİ", "İ"]);

function formatTime(date?: Date | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

export async function buildPayrollSnapshot(companyId: number, monthKey: string): Promise<PayrollSnapshot> {
  const range = getPayrollMonthRange(monthKey);
  const oneDay = 24 * 60 * 60_000;
  // Gece vardiyası ay sınırını aşabilir: önceki günün vardiyası ve sonraki günün okutmaları da okunur.
  const fetchStart = new Date(range.start.getTime() - oneDay);
  const fetchEnd = new Date(range.end.getTime() + oneDay);
  const [company, employees, calendars, logs] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true, attendanceTrackingMode: true, attendanceFinalizationDelayMinutes: true } }),
    prisma.employee.findMany({
      where: { companyId },
      orderBy: [{ department: "asc" }, { firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.employeeDailyCalendar.findMany({
      where: { employee: { companyId }, workDate: { gte: fetchStart, lt: range.end } },
      include: { leave: { select: { type: true, durationType: true, startTime: true, endTime: true } } },
      orderBy: [{ workDate: "asc" }, { employeeId: "asc" }],
    }),
    prisma.attendanceLog.findMany({
      where: { employee: { companyId }, scannedAt: { gte: fetchStart, lt: fetchEnd } },
      orderBy: [{ scannedAt: "asc" }, { id: "asc" }],
    }),
  ]);

  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const isInMonth = (dayKey: string) => dayKey.startsWith(`${monthKey}-`);
  const calendarByKey = new Map(calendars
    .filter((calendar) => isInMonth(getDateOnlyKey(calendar.workDate)))
    .map((calendar) => [`${calendar.employeeId}-${getDateOnlyKey(calendar.workDate)}`, calendar]));
  // Gece vardiyasındaki okutmalar takvim gününe değil, kesinleştirmedeki gibi vardiya penceresine aittir.
  const nightWindows = calendars.flatMap((calendar) => {
    const bounds = calendar.crossesMidnight ? getScheduledShiftBounds(calendar, company.attendanceFinalizationDelayMinutes) : null;
    return bounds ? [{ employeeId: calendar.employeeId, dayKey: getDateOnlyKey(calendar.workDate), start: bounds.collectionStart, end: bounds.dueAt }] : [];
  });
  const logsByKey = new Map<string, typeof logs>();
  for (const log of logs) {
    const window = nightWindows.find((item) => item.employeeId === log.employeeId && log.scannedAt >= item.start && log.scannedAt <= item.end);
    const dayKey = window?.dayKey ?? getAppDayKey(log.scannedAt);
    if (!isInMonth(dayKey)) continue;
    const key = `${log.employeeId}-${dayKey}`;
    const list = logsByKey.get(key) ?? [];
    list.push(log);
    logsByKey.set(key, list);
  }

  const allKeys = new Set([...calendarByKey.keys(), ...logsByKey.keys()]);
  const todayKey = getAppDayKey(new Date());
  const detailRows: PayrollDetailRow[] = [];

  for (const key of [...allKeys].sort()) {
    const separator = key.indexOf("-");
    const employeeId = Number(key.slice(0, separator));
    const dayKey = key.slice(separator + 1);
    if (dayKey > todayKey) continue;
    const employee = employeeById.get(employeeId);
    if (!employee) continue;
    const calendar = calendarByKey.get(key);
    const dayLogs = logsByKey.get(key) ?? [];
    const leave = calendar?.leave ?? null;
    const day = calculateAttendanceDay({
      trackingMode: company.attendanceTrackingMode,
      calendar: calendar ?? null,
      leave,
      logs: dayLogs,
      isPast: dayKey < todayKey,
      isToday: dayKey === todayKey,
    });

    detailRows.push({
      employeeId,
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
      workedMinutes: day.workedMinutes,
      overtimeMinutes: day.overtimeMinutes,
      holidayWorkMinutes: day.holidayWorkMinutes,
      missingMinutes: day.missingMinutes,
      movementCount: dayLogs.length,
      movements: dayLogs.map((log) => `${formatTime(log.scannedAt)} ${ATTENDANCE_TYPE_LABELS[log.type]}`).join(" | "),
      issues: day.issues.join(", ") || "Normal",
    });
  }

  const sumMinutes = (rows: PayrollDetailRow[], pick: (row: PayrollDetailRow) => number) =>
    rows.reduce((total, row) => total + pick(row), 0);
  const summaryRows = employees.map<PayrollSummaryRow>((employee) => {
    const rows = detailRows.filter((row) => row.employeeId === employee.id);
    const codeCounts: Partial<Record<PuantajDayCode, number>> = {};
    for (const row of rows) if (row.code) codeCounts[row.code] = (codeCounts[row.code] ?? 0) + 1;
    return {
      employeeId: employee.id,
      employee: `${employee.firstName} ${employee.lastName}`.trim(),
      registrationNumber: employee.registrationNumber ?? "-",
      company: company.name,
      branch: employee.branch ?? "-",
      department: employee.department || "Departmansız",
      plannedDays: rows.filter((row) => row.plannedMinutes > 0).length,
      attendedDays: rows.filter((row) => row.firstEntry !== "-").length,
      missingDays: codeCounts["D"] ?? 0,
      lateDays: rows.filter((row) => row.lateMinutes > 0).length,
      lateMinutes: sumMinutes(rows, (row) => row.lateMinutes),
      earlyLeaveMinutes: sumMinutes(rows, (row) => row.earlyLeaveMinutes),
      breakMinutes: sumMinutes(rows, (row) => row.breakMinutes),
      plannedMinutes: sumMinutes(rows, (row) => row.plannedMinutes),
      workedMinutes: sumMinutes(rows, (row) => row.workedMinutes),
      overtimeMinutes: sumMinutes(rows, (row) => row.overtimeMinutes),
      holidayWorkMinutes: sumMinutes(rows, (row) => row.holidayWorkMinutes),
      missingMinutes: sumMinutes(rows, (row) => row.missingMinutes),
      leaveDays: rows.filter((row) => LEAVE_CODES.has(row.code)).length,
      errorDays: rows.filter((row) => row.issues !== "Normal").length,
      codeCounts,
    };
  });

  return {
    version: 2,
    trackingMode: company.attendanceTrackingMode,
    monthKey,
    generatedAt: new Date().toISOString(),
    summaryRows,
    detailRows,
  };
}

export function parsePayrollSnapshot(value?: string | null): PayrollSnapshot | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Omit<PayrollSnapshot, "version"> & { version: number };
    if (!Array.isArray(parsed.summaryRows) || !Array.isArray(parsed.detailRows)) return null;
    if (parsed.version === 2) return parsed as PayrollSnapshot;
    if (parsed.version !== 1) return null;
    // Onaylanmış eski dönemler değişmez; eski snapshot'ta olmayan alanlar sıfır gösterilir.
    return {
      ...parsed,
      version: 2,
      trackingMode: null,
      summaryRows: parsed.summaryRows.map((row) => ({
        ...row,
        earlyLeaveMinutes: row.earlyLeaveMinutes ?? 0,
        plannedMinutes: row.plannedMinutes ?? 0,
        overtimeMinutes: row.overtimeMinutes ?? 0,
        holidayWorkMinutes: row.holidayWorkMinutes ?? 0,
        missingMinutes: row.missingMinutes ?? 0,
        leaveDays: row.leaveDays ?? 0,
        codeCounts: row.codeCounts ?? {},
      })),
      detailRows: parsed.detailRows.map((row) => ({
        ...row,
        code: row.code ?? "",
        leaveType: row.leaveType ?? "-",
        plannedMinutes: row.plannedMinutes ?? 0,
        earlyLeaveMinutes: row.earlyLeaveMinutes ?? 0,
        overtimeMinutes: row.overtimeMinutes ?? 0,
        holidayWorkMinutes: row.holidayWorkMinutes ?? 0,
        missingMinutes: row.missingMinutes ?? 0,
      })),
    };
  } catch {
    return null;
  }
}

export async function assertPayrollPeriodUnlocked(companyId: number, date: Date) {
  const [year, month] = getAppDayKey(date).slice(0, 7).split("-").map(Number);
  const locked = await prisma.payrollPeriod.findUnique({
    where: { companyId_year_month: { companyId, year, month } },
    select: { status: true },
  });
  if (locked?.status === PayrollPeriodStatus.LOCKED) {
    throw new Error(`${year}-${String(month).padStart(2, "0")} puantaj dönemi kilitli.`);
  }
}
