import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { LeaveApprovalStatus } from "@/generated/prisma/client";
import { getAccessibleCompanyIds } from "@/lib/access";
import { analyzeAttendanceSequence } from "@/lib/attendance-sequence";
import type { AuthorizationContext } from "@/lib/authorization";
import { employeeScopeWhere } from "@/lib/authorization";
import { dateOnlyFromKey, getAppDayKey, getAppDayRange, getAppMinutes, getDateOnlyKey } from "@/lib/app-time";
import { timeToMinutes } from "@/lib/work-calendar-rules";
import { queryRepository } from "@/modules/shared/query-repository";
import { resolveOperationReportRange, shiftDayKey, type OperationReportPeriod } from "@/lib/operation-report-range";

export type { OperationReportPeriod } from "@/lib/operation-report-range";

export type OperationReportRow = {
  employeeId: number;
  employeeName: string;
  department: string;
  lateMinutes: number;
  breakMinutes: number;
  lateDays: number;
  absentDays: number;
  attendedDays: number;
};

export type OperationReportData = {
  title: string;
  period: OperationReportPeriod;
  periodLabel: string;
  selectedDateLabel: string;
  rangeLabel: string;
  generatedAtLabel: string;
  filters: { company: string; branch: string; department: string };
  rows: OperationReportRow[];
  topLate: OperationReportRow[];
  topBreak: OperationReportRow[];
  topAbsent: OperationReportRow[];
  metrics: {
    lateEmployeeCount: number;
    lateTotalMinutes: number;
    averageLateMinutes: number;
    averageBreakMinutes: number;
  };
};

const PERIOD_LABELS: Record<OperationReportPeriod, string> = {
  daily: "Günlük",
  weekly: "Haftalık",
  monthly: "Aylık",
};

function isDayKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function formatDay(dayKey: string) {
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${dayKey}T12:00:00Z`));
}

function cleanFilter(value: string | null) {
  return (value ?? "").trim().slice(0, 160);
}

export async function buildOperationReportData(params: {
  user: { id: number; role: string; companyId: number | null };
  authorization: AuthorizationContext;
  date: string | null;
  period: string | null;
  companyId: string | null;
  branch: string | null;
  department: string | null;
  now?: Date;
}): Promise<OperationReportData> {
  const now = params.now ?? new Date();
  const todayKey = getAppDayKey(now);
  const requestedDayKey = cleanFilter(params.date);
  const selectedDayKey = isDayKey(requestedDayKey) && requestedDayKey <= todayKey ? requestedDayKey : todayKey;
  const period: OperationReportPeriod = params.period === "weekly" || params.period === "monthly" ? params.period : "daily";
  const periodRange = resolveOperationReportRange(selectedDayKey, period);
  const effectiveEndExclusiveKey = periodRange.endExclusiveKey < shiftDayKey(todayKey, 1)
    ? periodRange.endExclusiveKey
    : shiftDayKey(todayKey, 1);
  const startDate = dateOnlyFromKey(periodRange.startKey);
  const endDate = dateOnlyFromKey(effectiveEndExclusiveKey);
  const attendanceStart = getAppDayRange(periodRange.startKey).start;
  const attendanceEnd = getAppDayRange(effectiveEndExclusiveKey).start;
  const requestedBranch = cleanFilter(params.branch);
  const requestedDepartment = cleanFilter(params.department);
  const accessibleCompanyIds = await getAccessibleCompanyIds(params.user);
  const requestedCompanyId = Number(params.companyId);
  const selectedCompanyId = Number.isSafeInteger(requestedCompanyId) && requestedCompanyId > 0
    && (accessibleCompanyIds === null || accessibleCompanyIds.includes(requestedCompanyId))
    ? requestedCompanyId
    : null;

  let employeeWhere: Prisma.EmployeeWhereInput;
  if (params.authorization.isPlatformAdmin) {
    employeeWhere = selectedCompanyId
      ? { companyId: selectedCompanyId }
      : accessibleCompanyIds === null ? {} : { companyId: { in: accessibleCompanyIds } };
  } else {
    employeeWhere = employeeScopeWhere(params.authorization);
  }
  employeeWhere = {
    ...employeeWhere,
    ...(requestedBranch ? { branch: requestedBranch } : {}),
    ...(requestedDepartment ? { department: requestedDepartment } : {}),
  };

  const [employees, logs, calendars, leaves] = await Promise.all([
    queryRepository.employee.findMany({
      where: employeeWhere,
      include: { company: { select: { name: true } } },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    queryRepository.attendanceLog.findMany({
      where: { employee: employeeWhere, scannedAt: { gte: attendanceStart, lt: attendanceEnd } },
      orderBy: [{ scannedAt: "asc" }, { id: "asc" }],
    }),
    queryRepository.employeeDailyCalendar.findMany({
      where: { employee: employeeWhere, workDate: { gte: startDate, lt: endDate } },
      include: { employee: true },
      orderBy: [{ workDate: "asc" }, { employeeId: "asc" }],
    }),
    queryRepository.leaveRequest.findMany({
      where: {
        employee: employeeWhere,
        approvalStatus: LeaveApprovalStatus.APPROVED,
        startDate: { lt: endDate },
        endDate: { gte: startDate },
      },
      select: { employeeId: true, startDate: true, endDate: true },
    }),
  ]);

  const logsByEmployeeDay = logs.reduce((map, log) => {
    const key = `${log.employeeId}-${getAppDayKey(log.scannedAt)}`;
    const current = map.get(key) ?? [];
    current.push(log);
    map.set(key, current);
    return map;
  }, new Map<string, typeof logs>());
  const rowsByEmployee = new Map<number, OperationReportRow>();
  for (const employee of employees) {
    rowsByEmployee.set(employee.id, {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
      department: employee.department || "Departmansız",
      lateMinutes: 0,
      breakMinutes: 0,
      lateDays: 0,
      absentDays: 0,
      attendedDays: 0,
    });
  }

  for (const calendar of calendars) {
    const row = rowsByEmployee.get(calendar.employeeId);
    if (!row || !calendar.employee.isActive || calendar.plannedNetMinutes <= 0) continue;
    const dayKey = getDateOnlyKey(calendar.workDate);
    const dayLogs = logsByEmployeeDay.get(`${calendar.employeeId}-${dayKey}`) ?? [];
    const firstEntry = dayLogs.find((log) => log.type === "ENTRY");
    if (firstEntry) {
      row.attendedDays += 1;
      row.breakMinutes += analyzeAttendanceSequence(dayLogs).totalMinutes;
      const plannedStart = timeToMinutes(calendar.plannedStart);
      const lateMinutes = calendar.checkLateArrival && plannedStart !== null
        ? getAppMinutes(firstEntry.scannedAt) - plannedStart
        : 0;
      if (lateMinutes > 0) {
        row.lateMinutes += lateMinutes;
        row.lateDays += 1;
      }
      continue;
    }
    const hasApprovedLeave = leaves.some((leave) => (
      leave.employeeId === calendar.employeeId
      && getDateOnlyKey(leave.startDate) <= dayKey
      && getDateOnlyKey(leave.endDate) >= dayKey
    ));
    const plannedStart = timeToMinutes(calendar.plannedStart);
    const absenceCheckTimeReached = dayKey < todayKey || (dayKey === todayKey && plannedStart !== null && getAppMinutes(now) >= plannedStart);
    if (calendar.checkAbsence && calendar.plannedStart && !hasApprovedLeave && absenceCheckTimeReached) row.absentDays += 1;
  }

  const rows = Array.from(rowsByEmployee.values()).sort(
    (first, second) => second.lateMinutes + second.breakMinutes - (first.lateMinutes + first.breakMinutes)
      || first.employeeName.localeCompare(second.employeeName, "tr"),
  );
  const lateTotalMinutes = rows.reduce((sum, row) => sum + row.lateMinutes, 0);
  const breakTotalMinutes = rows.reduce((sum, row) => sum + row.breakMinutes, 0);
  const lateEmployeeCount = rows.filter((row) => row.lateMinutes > 0).length;
  const attendedPersonDays = rows.reduce((sum, row) => sum + row.attendedDays, 0);
  const companyNames = [...new Set(employees.map((employee) => employee.company.name))];
  const shownEndKey = shiftDayKey(effectiveEndExclusiveKey, -1);

  return {
    title: "Operasyon Özeti",
    period,
    periodLabel: PERIOD_LABELS[period],
    selectedDateLabel: formatDay(selectedDayKey),
    rangeLabel: periodRange.startKey === shownEndKey ? formatDay(periodRange.startKey) : `${formatDay(periodRange.startKey)} - ${formatDay(shownEndKey)}`,
    generatedAtLabel: new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(now),
    filters: {
      company: companyNames.length === 1 ? companyNames[0] : companyNames.length > 1 ? `${companyNames.length} firma` : "Kayıt yok",
      branch: requestedBranch || "Tümü",
      department: requestedDepartment || "Tümü",
    },
    rows,
    topLate: rows.filter((row) => row.lateMinutes > 0).sort((a, b) => b.lateMinutes - a.lateMinutes).slice(0, 10),
    topBreak: rows.filter((row) => row.breakMinutes > 0).sort((a, b) => b.breakMinutes - a.breakMinutes).slice(0, 10),
    topAbsent: rows.filter((row) => row.absentDays > 0).sort((a, b) => b.absentDays - a.absentDays).slice(0, 10),
    metrics: {
      lateEmployeeCount,
      lateTotalMinutes,
      averageLateMinutes: lateEmployeeCount ? Math.round(lateTotalMinutes / lateEmployeeCount) : 0,
      averageBreakMinutes: attendedPersonDays ? Math.round(breakTotalMinutes / attendedPersonDays) : 0,
    },
  };
}
