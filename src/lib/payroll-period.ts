import { AttendanceType, PayrollPeriodStatus } from "@/generated/prisma/client";
import { analyzeAttendanceSequence } from "@/lib/attendance-sequence";
import { dateOnlyFromKey, getAppDayKey, getAppMinutes, getDateOnlyKey } from "@/lib/app-time";
import { prisma } from "@/lib/prisma";
import { timeToMinutes } from "@/lib/work-calendar-rules";

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
  lateMinutes: number;
  breakMinutes: number;
  workedMinutes: number;
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
  breakMinutes: number;
  workedMinutes: number;
  errorDays: number;
};

export type PayrollSnapshot = {
  version: 1;
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

function formatTime(date?: Date | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

const movementLabels: Record<AttendanceType, string> = {
  ENTRY: "Giriş",
  EXIT: "Çıkış",
  BREAK_START: "Mola çıkış",
  BREAK_END: "Mola giriş",
  MEAL_START: "Yemek çıkış",
  MEAL_END: "Yemek giriş",
};

export async function buildPayrollSnapshot(companyId: number, monthKey: string): Promise<PayrollSnapshot> {
  const range = getPayrollMonthRange(monthKey);
  const [company, employees, calendars, logs] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true } }),
    prisma.employee.findMany({
      where: { companyId },
      orderBy: [{ department: "asc" }, { firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.employeeDailyCalendar.findMany({
      where: { employee: { companyId }, workDate: { gte: range.start, lt: range.end } },
      orderBy: [{ workDate: "asc" }, { employeeId: "asc" }],
    }),
    prisma.attendanceLog.findMany({
      where: { employee: { companyId }, scannedAt: { gte: range.start, lt: range.end } },
      orderBy: [{ scannedAt: "asc" }, { id: "asc" }],
    }),
  ]);

  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const calendarByKey = new Map(calendars.map((calendar) => [
    `${calendar.employeeId}-${getDateOnlyKey(calendar.workDate)}`,
    calendar,
  ]));
  const logsByKey = new Map<string, typeof logs>();
  for (const log of logs) {
    const key = `${log.employeeId}-${getAppDayKey(log.scannedAt)}`;
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
    const entry = dayLogs.find((log) => log.type === AttendanceType.ENTRY)?.scannedAt ?? null;
    const exit = [...dayLogs].reverse().find((log) => log.type === AttendanceType.EXIT)?.scannedAt ?? null;
    const analysis = analyzeAttendanceSequence(dayLogs, {
      requireExit: dayKey < todayKey && dayLogs.length > 0,
      allowOpenBreak: dayKey === todayKey,
    });
    const plannedStart = timeToMinutes(calendar?.plannedStart);
    const lateMinutes = entry && plannedStart !== null && calendar?.checkLateArrival
      ? Math.max(0, getAppMinutes(entry) - plannedStart)
      : 0;
    const workedMinutes = entry && exit
      ? Math.max(0, Math.floor((exit.getTime() - entry.getTime()) / 60_000) - analysis.totalMinutes)
      : 0;
    const issues: string[] = [];
    if (calendar?.checkAbsence && dayLogs.length === 0) issues.push("Hareket yok");
    if (dayLogs.length > 0 && !exit && dayKey < todayKey) issues.push("Eksik çıkış");
    if (!analysis.isValid) issues.push("Eşleşmeyen hareket");
    if (dayLogs.some((log) => log.receivedAt && log.receivedAt.getTime() - log.scannedAt.getTime() > 5 * 60_000)) {
      issues.push("Gecikmeli aktarım");
    }

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
      firstEntry: formatTime(entry),
      lastExit: formatTime(exit),
      lateMinutes,
      breakMinutes: analysis.totalMinutes,
      workedMinutes,
      movementCount: dayLogs.length,
      movements: dayLogs.map((log) => `${formatTime(log.scannedAt)} ${movementLabels[log.type]}`).join(" | "),
      issues: issues.join(", ") || "Normal",
    });
  }

  const summaryRows = employees.map<PayrollSummaryRow>((employee) => {
    const rows = detailRows.filter((row) => row.employeeId === employee.id);
    const plannedRows = rows.filter((row) => row.dayType !== "TAKVİM YOK" && row.dayType !== "NON_WORKING" && row.dayType !== "WEEKLY_REST");
    return {
      employeeId: employee.id,
      employee: `${employee.firstName} ${employee.lastName}`.trim(),
      registrationNumber: employee.registrationNumber ?? "-",
      company: company.name,
      branch: employee.branch ?? "-",
      department: employee.department || "Departmansız",
      plannedDays: plannedRows.length,
      attendedDays: rows.filter((row) => row.firstEntry !== "-").length,
      missingDays: rows.filter((row) => row.issues.includes("Hareket yok")).length,
      lateDays: rows.filter((row) => row.lateMinutes > 0).length,
      lateMinutes: rows.reduce((total, row) => total + row.lateMinutes, 0),
      breakMinutes: rows.reduce((total, row) => total + row.breakMinutes, 0),
      workedMinutes: rows.reduce((total, row) => total + row.workedMinutes, 0),
      errorDays: rows.filter((row) => row.issues !== "Normal").length,
    };
  });

  return { version: 1, monthKey, generatedAt: new Date().toISOString(), summaryRows, detailRows };
}

export function parsePayrollSnapshot(value?: string | null): PayrollSnapshot | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as PayrollSnapshot;
    return parsed.version === 1 && Array.isArray(parsed.summaryRows) && Array.isArray(parsed.detailRows)
      ? parsed
      : null;
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
