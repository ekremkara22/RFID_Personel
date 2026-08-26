import { LeaveApprovalStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { timeToMinutes } from "@/lib/work-calendar-rules";

function getMonthStart() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getLogMinutes(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function formatPercent(value: number, total: number) {
  if (total === 0) return "0%";
  return `%${Math.round((value / total) * 100)}`;
}

export async function getPdksReportData(companyId: number) {
  const monthStart = getMonthStart();
  const [employees, logs, leaves, dailyCalendars] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId },
      orderBy: [{ department: "asc" }, { firstName: "asc" }],
    }),
    prisma.attendanceLog.findMany({
      where: {
        scannedAt: { gte: monthStart },
        employee: { companyId },
      },
      include: { employee: true },
      take: 2000,
    }),
    prisma.leaveRequest.findMany({
      where: {
        companyId,
        approvalStatus: LeaveApprovalStatus.APPROVED,
        endDate: { gte: monthStart },
      },
      include: { employee: true },
    }),
    prisma.employeeDailyCalendar.findMany({
      where: {
        workDate: { gte: monthStart },
        employee: { companyId },
      },
      include: { employee: true },
      take: 3000,
    }),
  ]);

  const employeeRows = employees.map((employee) => {
    const employeeLogs = logs.filter((log) => log.employeeId === employee.id);
    const entryCount = employeeLogs.filter((log) => log.type === "ENTRY").length;
    const exitCount = employeeLogs.filter((log) => log.type === "EXIT").length;
    const leaveCount = leaves.filter((leave) => leave.employeeId === employee.id).length;
    const employeeCalendars = dailyCalendars.filter((day) => day.employeeId === employee.id);
    const lateEligibleDays = employeeCalendars.filter(
      (day) => day.checkLateArrival && day.plannedStart && day.plannedNetMinutes > 0,
    );
    const lateCount = lateEligibleDays.filter((day) => {
      const plannedStartMinutes = timeToMinutes(day.plannedStart);
      if (plannedStartMinutes === null) return false;

      const firstEntry = employeeLogs
        .filter((log) => log.type === "ENTRY" && getDayKey(log.scannedAt) === getDayKey(day.workDate))
        .sort((first, second) => first.scannedAt.getTime() - second.scannedAt.getTime())[0];

      return firstEntry ? getLogMinutes(firstEntry.scannedAt) > plannedStartMinutes : false;
    }).length;
    const noMovementCount = lateEligibleDays.filter((day) => {
      return !employeeLogs.some((log) => log.type === "ENTRY" && getDayKey(log.scannedAt) === getDayKey(day.workDate));
    }).length;

    return {
      employee: `${employee.firstName} ${employee.lastName}`.trim(),
      department: employee.department,
      branch: employee.branch ?? "-",
      entryCount,
      exitCount,
      leaveCount,
      lateCount,
      workDayCount: lateEligibleDays.length,
      noMovementCount,
      lateRate: formatPercent(lateCount, lateEligibleDays.length),
      attention: noMovementCount > 0 ? `${noMovementCount} gun hareket yok` : lateCount > 0 ? `${lateCount} gun gec` : "Normal",
    };
  });

  const departmentRows = Array.from(
    employeeRows.reduce((map, row) => {
      const current = map.get(row.department) ?? {
        department: row.department,
        employeeCount: 0,
        entryCount: 0,
        leaveCount: 0,
        noMovementCount: 0,
        lateCount: 0,
        workDayCount: 0,
        lateRate: "0%",
      };

      current.employeeCount += 1;
      current.entryCount += row.entryCount;
      current.leaveCount += row.leaveCount;
      current.noMovementCount += row.noMovementCount;
      current.lateCount += row.lateCount;
      current.workDayCount += row.workDayCount;
      current.lateRate = formatPercent(current.lateCount, current.workDayCount);
      map.set(row.department, current);
      return map;
    }, new Map<string, { department: string; employeeCount: number; entryCount: number; leaveCount: number; noMovementCount: number; lateCount: number; workDayCount: number; lateRate: string }>()),
  ).map(([, row]) => row);

  return { employeeRows, departmentRows };
}
