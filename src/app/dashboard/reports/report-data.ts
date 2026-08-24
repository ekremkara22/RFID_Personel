import { LeaveApprovalStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

function getMonthStart() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function getPdksReportData(companyId: string) {
  const monthStart = getMonthStart();
  const [employees, logs, leaves] = await Promise.all([
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
  ]);

  const employeeRows = employees.map((employee) => {
    const employeeLogs = logs.filter((log) => log.employeeId === employee.id);
    const entryCount = employeeLogs.filter((log) => log.type === "ENTRY").length;
    const exitCount = employeeLogs.filter((log) => log.type === "EXIT").length;
    const leaveCount = leaves.filter((leave) => leave.employeeId === employee.id).length;

    return {
      employee: `${employee.firstName} ${employee.lastName}`.trim(),
      department: employee.department,
      branch: employee.branch ?? "-",
      entryCount,
      exitCount,
      leaveCount,
      lateRate: "0%",
      attention: entryCount === 0 && leaveCount === 0 ? "Hareket yok" : "Normal",
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
        lateRate: "0%",
      };

      current.employeeCount += 1;
      current.entryCount += row.entryCount;
      current.leaveCount += row.leaveCount;
      if (row.attention === "Hareket yok") current.noMovementCount += 1;
      map.set(row.department, current);
      return map;
    }, new Map<string, { department: string; employeeCount: number; entryCount: number; leaveCount: number; noMovementCount: number; lateRate: string }>()),
  ).map(([, row]) => row);

  return { employeeRows, departmentRows };
}
