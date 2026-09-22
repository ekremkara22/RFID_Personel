import Link from "next/link";
import { getAccessibleCompanyIds, scopedCompanyFilter } from "@/lib/access";
import {
  Building2,
  Clock3,
  Coffee,
  CalendarDays,
  DoorOpen,
  AlertTriangle,
  MonitorSmartphone,
  ShieldCheck,
  Users,
} from "lucide-react";
import { ExportButton } from "@/app/dashboard/export-button";
import { LeaveApprovalStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  APP_TIME_ZONE,
  dateOnlyFromKey,
  getAppDayKey,
  getAppDayRange,
  getAppMinutes,
  getDateOnlyKey,
} from "@/lib/app-time";
import { requireSessionUser } from "@/lib/session";
import { timeToMinutes } from "@/lib/work-calendar-rules";
import styles from "./page.module.css";
import { PersonnelChart } from "./personnel-chart";
import { OperationFilters } from "./operation-filters";
import { analyzeAttendanceSequence } from "@/lib/attendance-sequence";

const attendanceLabels = {
  ENTRY: "Giriş",
  EXIT: "Çıkış",
  BREAK_START: "Mola Çıkış",
  BREAK_END: "Mola Giriş",
  MEAL_START: "Yemek Çıkış",
  MEAL_END: "Yemek Giriş",
} as const;

function getRoleLabel(role: string) {
  return role === "SUPERADMIN" ? "Super Admin" : "Firma Admin";
}

function getUserFullName(user: {
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string;
}) {
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.name || user.email;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

function parseDateParam(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = dateOnlyFromKey(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours} sa ${remaining} dk` : `${hours} sa`;
}

function getEmployeeBreakSummary(
  logs: Array<{ id: number; type: keyof typeof attendanceLabels; scannedAt: Date }>,
  rangeEnd: Date | null,
) {
  void rangeEnd;
  const analysis = analyzeAttendanceSequence(logs);
  return { totalMinutes: analysis.totalMinutes, isActive: analysis.isOnBreak, activeMinutes: 0 };
}

function isLateEntry(scannedAt: Date, plannedStart?: string | null) {
  const plannedStartMinutes = timeToMinutes(plannedStart);
  return plannedStartMinutes !== null && getAppMinutes(scannedAt) > plannedStartMinutes;
}

export default async function DashboardPage(props: { searchParams?: Promise<{ date?: string; companyId?: string; branch?: string; department?: string }> }) {
  const { user } = await requireSessionUser();
  const isSuperadmin = user.role === "SUPERADMIN";
  const companyIds = await getAccessibleCompanyIds(user);
  const companyScope = scopedCompanyFilter(companyIds);
  if (companyIds !== null && companyIds.length === 0) {
    return (
      <div className={styles.page}>
        <section className={styles.operationReportPanel}>
          <h1 className={styles.sectionTitle}>Firmanızı tanımlayarak başlayın</h1>
          <p className={styles.subtitle}>Henüz erişiminize tanımlı bir firma bulunmuyor. Kendi firmanızı oluşturduktan sonra iş yerlerinizi ve personellerinizi ekleyebilirsiniz. Mevcut bir firmaya erişmeniz gerekiyorsa sistem yöneticinizden yetki isteyin.</p>
          {user.role === "COMPANY_ADMIN" && <Link href="/dashboard/companies/new" className={styles.primaryLinkButton}>Firma oluştur</Link>}
        </section>
      </div>
    );
  }
  const searchParams = (await props.searchParams) ?? {};

  const currentDayRange = getAppDayRange(new Date());
  const today = currentDayRange.dateOnly;
  const requestedDate = parseDateParam(searchParams.date);
  const selectedDate = requestedDate && getDateOnlyKey(requestedDate) <= currentDayRange.dayKey ? requestedDate : today;
  const selectedRange = getAppDayRange(getDateOnlyKey(selectedDate));
  const todayRange = selectedRange;
  const selectedDateEnd = new Date(selectedDate);
  selectedDateEnd.setUTCDate(selectedDateEnd.getUTCDate() + 1);
  const monthStartKey = `${selectedRange.dayKey.slice(0, 8)}01`;
  const monthStart = dateOnlyFromKey(monthStartKey);
  const monthAttendanceStart = getAppDayRange(monthStartKey).start;
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  const monthAttendanceEnd = getAppDayRange(getDateOnlyKey(monthEnd)).start;

  const allowedCompanyWhere = companyIds === null ? {} : { id: { in: companyIds } };
  const [filterCompanies, filterScopes] = await Promise.all([
    prisma.company.findMany({ where: allowedCompanyWhere, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: companyScope,
      select: { companyId: true, branch: true, department: true },
      distinct: ["companyId", "branch", "department"],
    }),
  ]);
  const requestedCompanyId = Number(searchParams.companyId);
  const selectedCompanyId = Number.isSafeInteger(requestedCompanyId) && filterCompanies.some((company) => company.id === requestedCompanyId)
    ? requestedCompanyId
    : null;
  const companyIdFilter = selectedCompanyId ? [selectedCompanyId] : filterCompanies.map((company) => company.id);
  const companyFilteredScopes = filterScopes.filter((scope) => companyIdFilter.includes(scope.companyId));
  const requestedBranch = typeof searchParams.branch === "string" ? searchParams.branch.trim() : "";
  const selectedBranch = requestedBranch && companyFilteredScopes.some((scope) => scope.branch === requestedBranch) ? requestedBranch : "";
  const branchFilteredScopes = companyFilteredScopes.filter((scope) => !selectedBranch || scope.branch === selectedBranch);
  const requestedDepartment = typeof searchParams.department === "string" ? searchParams.department.trim() : "";
  const selectedDepartment = requestedDepartment && branchFilteredScopes.some((scope) => scope.department === requestedDepartment)
    ? requestedDepartment
    : "";

  const employeeWhere = {
    companyId: { in: companyIdFilter },
    ...(selectedBranch ? { branch: selectedBranch } : {}),
    ...(selectedDepartment ? { department: selectedDepartment } : {}),
  };
  const attendanceWhere = { employee: employeeWhere };
  const deviceWhere = { companyId: { in: companyIdFilter }, ...(selectedBranch ? { branchLocation: selectedBranch } : {}) };
  const companyWhere = { id: { in: companyIdFilter } };

  const [
    companyCount,
    companyAdminCount,
    employeeCount,
    deviceCount,
    highlightedCompanies,
    scopedEmployees,
    todayEntryCount,
    monthlyLogsForReport,
    monthlyDailyCalendarsForReport,
    todayLogsForDashboard,
    todayDailyCalendarsForDashboard,
    todayApprovedLeaves,
    selectedLogsForCritical,
    selectedDailyCalendarsForCritical,
    selectedApprovedLeaves,
    selectedAudits,
  ] = await Promise.all([
    prisma.company.count({ where: companyWhere }),
    prisma.user.count({ where: { role: "COMPANY_ADMIN", companyId: { in: companyIdFilter } } }),
    prisma.employee.count({ where: employeeWhere }),
    prisma.device.count({ where: deviceWhere }),
    prisma.company.findMany({
      where: companyWhere,
      include: {
        users: {
          where: { role: "COMPANY_ADMIN" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: {
            employees: true,
            devices: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: isSuperadmin ? 6 : 1,
    }),
    prisma.employee.findMany({
      where: employeeWhere,
      include: {
        company: true,
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.attendanceLog.count({
      where: {
        scannedAt: { gte: todayRange.start, lt: todayRange.end },
        type: "ENTRY",
        ...attendanceWhere,
      },
    }),
    prisma.attendanceLog.findMany({
      where: {
        scannedAt: { gte: monthAttendanceStart, lt: monthAttendanceEnd },
        ...attendanceWhere,
      },
      include: {
        employee: true,
      },
      orderBy: { scannedAt: "desc" },
      take: 10000,
    }),
    prisma.employeeDailyCalendar.findMany({
      where: {
        workDate: { gte: monthStart, lt: monthEnd },
        employee: employeeWhere,
      },
      include: { employee: true },
      take: 3000,
    }),
    prisma.attendanceLog.findMany({
      where: {
        scannedAt: { gte: todayRange.start, lt: todayRange.end },
        ...attendanceWhere,
      },
      include: {
        employee: true,
        device: true,
      },
      orderBy: { scannedAt: "desc" },
      take: 500,
    }),
    prisma.employeeDailyCalendar.findMany({
      where: {
        workDate: selectedDate,
        employee: employeeWhere,
      },
      include: { employee: true },
      take: 500,
    }),
    prisma.leaveRequest.findMany({
      where: {
        employee: employeeWhere,
        approvalStatus: LeaveApprovalStatus.APPROVED,
        startDate: { lt: selectedDateEnd },
        endDate: { gte: selectedDate },
      },
      include: { employee: true },
    }),
    prisma.attendanceLog.findMany({
      where: {
        scannedAt: { gte: selectedRange.start, lt: selectedRange.end },
        ...attendanceWhere,
      },
      include: {
        employee: true,
      },
      orderBy: { scannedAt: "asc" },
    }),
    prisma.employeeDailyCalendar.findMany({
      where: {
        workDate: selectedDate,
        employee: employeeWhere,
      },
      include: { employee: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        employee: employeeWhere,
        approvalStatus: LeaveApprovalStatus.APPROVED,
        startDate: { lt: selectedDateEnd },
        endDate: { gte: selectedDate },
      },
      include: { employee: true },
    }),
    prisma.attendanceMovementAudit.findMany({
      where: {
        movementDateTime: { gte: selectedRange.start, lt: selectedRange.end },
        employee: employeeWhere,
      },
      select: { employeeId: true },
    }),
  ]);

  const latestEntryExitByEmployee = new Map<number, (typeof todayLogsForDashboard)[number]>();
  todayLogsForDashboard
    .filter((log) => log.type === "ENTRY" || log.type === "EXIT")
    .sort((first, second) => second.scannedAt.getTime() - first.scannedAt.getTime())
    .forEach((log) => {
      if (!latestEntryExitByEmployee.has(log.employeeId)) {
        latestEntryExitByEmployee.set(log.employeeId, log);
      }
    });
  const currentlyInside = Array.from(latestEntryExitByEmployee.values()).filter((log) => log.type === "ENTRY").length;
  const leaveEmployeeIds = new Set(todayApprovedLeaves.map((leave) => leave.employeeId));
  const firstTodayEntryByEmployee = new Map<number, (typeof todayLogsForDashboard)[number]>();
  todayLogsForDashboard
    .filter((log) => log.type === "ENTRY")
    .sort((first, second) => first.scannedAt.getTime() - second.scannedAt.getTime())
    .forEach((log) => {
      if (!firstTodayEntryByEmployee.has(log.employeeId)) {
        firstTodayEntryByEmployee.set(log.employeeId, log);
      }
    });
  const lateTodayCount = todayDailyCalendarsForDashboard.filter((day) => {
    if (!day.checkLateArrival || !day.plannedStart || day.plannedNetMinutes <= 0) return false;

    const firstEntry = firstTodayEntryByEmployee.get(day.employeeId);

    return firstEntry ? isLateEntry(firstEntry.scannedAt, day.plannedStart) : false;
  }).length;
  const monthlyLateRecords = monthlyDailyCalendarsForReport.flatMap((day) => {
    if (!day.checkLateArrival || !day.plannedStart || day.plannedNetMinutes <= 0) return [];

    const firstEntry = monthlyLogsForReport
      .filter((log) => log.employeeId === day.employeeId && log.type === "ENTRY" && getAppDayKey(log.scannedAt) === getDateOnlyKey(day.workDate))
      .sort((first, second) => first.scannedAt.getTime() - second.scannedAt.getTime())[0];

    if (!firstEntry) return [];

    const plannedStartMinutes = timeToMinutes(day.plannedStart);
    if (plannedStartMinutes === null) return [];

    const lateMinutes = getAppMinutes(firstEntry.scannedAt) - plannedStartMinutes;
    if (lateMinutes <= 0) return [];

    return [{
      employeeId: day.employeeId,
      employeeName: `${day.employee.firstName} ${day.employee.lastName}`.trim(),
      department: day.employee.department || "Departmansiz",
      workDate: day.workDate,
      scannedAt: firstEntry.scannedAt,
      lateMinutes,
    }];
  });
  const selectedLateEmployees = selectedDailyCalendarsForCritical.flatMap((day) => {
    if (!day.checkLateArrival || !day.plannedStart || day.plannedNetMinutes <= 0) return [];

    const firstEntry = selectedLogsForCritical
      .filter((log) => log.employeeId === day.employeeId && log.type === "ENTRY")
      .sort((first, second) => first.scannedAt.getTime() - second.scannedAt.getTime())[0];

    if (!firstEntry) return [];

    const plannedStartMinutes = timeToMinutes(day.plannedStart);
    if (plannedStartMinutes === null) return [];

    const lateMinutes = getAppMinutes(firstEntry.scannedAt) - plannedStartMinutes;
    if (lateMinutes <= 0) return [];

    return [{
      employeeId: day.employeeId,
      employeeName: `${day.employee.firstName} ${day.employee.lastName}`.trim(),
      department: day.employee.department || "Departmansiz",
      firstName: day.employee.firstName,
      lastName: day.employee.lastName,
      photoUrl: day.employee.photoUrl,
      lateMinutes,
    }];
  }).sort((first, second) => second.lateMinutes - first.lateMinutes);
  const isSelectedToday = getDateOnlyKey(selectedDate) === getDateOnlyKey(today);
  const selectedBreakRangeEnd = isSelectedToday ? new Date() : null;
  const selectedLateByEmployee = new Map(selectedLateEmployees.map((record) => [record.employeeId, record]));
  const selectedCalendarByEmployee = new Map(
    selectedDailyCalendarsForCritical.map((calendar) => [calendar.employeeId, calendar]),
  );
  const selectedLogsByEmployee = selectedLogsForCritical.reduce((map, log) => {
    const employeeLogs = map.get(log.employeeId) ?? [];
    employeeLogs.push(log);
    map.set(log.employeeId, employeeLogs);
    return map;
  }, new Map<number, typeof selectedLogsForCritical>());
  const auditedEmployeeIds = new Set(selectedAudits.map((audit) => audit.employeeId));
  const selectedOperationalRows = scopedEmployees
    .map((employee) => {
      const employeeId = employee.id;
      const calendar = selectedCalendarByEmployee.get(employeeId);
      const employeeLogs = selectedLogsByEmployee.get(employeeId) ?? [];
      const lateRecord = selectedLateByEmployee.get(employeeId);
      const sequence = analyzeAttendanceSequence(employeeLogs, {
        requireExit: !isSelectedToday,
        allowOpenBreak: isSelectedToday,
      });
      const breakSummary = getEmployeeBreakSummary(employeeLogs, selectedBreakRangeEnd);
      const plannedBreakMinutes = calendar?.plannedBreakMinutes ?? 0;

      if (!employee) return null;

      return {
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
        firstName: employee.firstName,
        lastName: employee.lastName,
        photoUrl: employee.photoUrl,
        department: employee.department || "Departmansız",
        lateMinutes: lateRecord?.lateMinutes ?? 0,
        breakMinutes: breakSummary.totalMinutes,
        breakOverMinutes: Math.max(0, breakSummary.totalMinutes - plannedBreakMinutes),
        isOnBreak: isSelectedToday && breakSummary.isActive,
        activeBreakMinutes: isSelectedToday ? breakSummary.activeMinutes : 0,
        plannedStart: calendar?.plannedStart ?? null,
        firstEntry: employeeLogs
          .filter((log) => log.type === "ENTRY")
          .sort((first, second) => first.scannedAt.getTime() - second.scannedAt.getTime())[0]?.scannedAt ?? null,
        plannedBreakMinutes,
        movementStatus: sequence.isValid
          ? (auditedEmployeeIds.has(employeeId) ? "DÜZELTİLDİ" : "NORMAL")
          : "HATALI HAREKET / KONTROL GEREKİYOR",
        unmatchedMovements: employeeLogs.filter((log) => sequence.unmatchedLogIds.includes(log.id)),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort(
      (first, second) =>
        Number(second.isOnBreak) - Number(first.isOnBreak) ||
        second.lateMinutes + second.breakOverMinutes - (first.lateMinutes + first.breakOverMinutes),
    );
  const selectedLateTotalMinutes = selectedLateEmployees.reduce((sum, row) => sum + row.lateMinutes, 0);
  const selectedLateAverageMinutes = selectedLateEmployees.length > 0
    ? Math.round(selectedLateTotalMinutes / selectedLateEmployees.length)
    : 0;
  const selectedBreakTotalMinutes = selectedOperationalRows.reduce((sum, row) => sum + row.breakMinutes, 0);
  const selectedBreakOverRows = selectedOperationalRows.filter((row) => row.breakOverMinutes > 0);
  const selectedAttentionRows = selectedOperationalRows.filter((row) => row.movementStatus.includes("HATALI"));
  const selectedLeaveEmployeeIds = new Set(selectedApprovedLeaves.map((leave) => leave.employeeId));
  const monthlyLateDepartmentRows = Array.from(
    monthlyLateRecords.reduce((map, record) => {
      const current = map.get(record.department) ?? { department: record.department, count: 0, totalMinutes: 0 };
      current.count += 1;
      current.totalMinutes += record.lateMinutes;
      map.set(record.department, current);
      return map;
    }, new Map<string, { department: string; count: number; totalMinutes: number }>()),
  )
    .map(([, row]) => row)
    .sort((first, second) => second.count - first.count || second.totalMinutes - first.totalMinutes)
    .slice(0, 6);
  const monthlyLogsByEmployeeDay = monthlyLogsForReport.reduce((map, log) => {
    const key = `${log.employeeId}-${getAppDayKey(log.scannedAt)}`;
    const current = map.get(key) ?? { department: log.employee.department || "Departmansız", logs: [] as typeof monthlyLogsForReport };
    current.logs.push(log);
    map.set(key, current);
    return map;
  }, new Map<string, { department: string; logs: typeof monthlyLogsForReport }>());
  const monthlyBreakDepartmentRows = Array.from(monthlyLogsByEmployeeDay.values()).reduce((map, group) => {
    const sortedLogs = group.logs.sort((first, second) => first.scannedAt.getTime() - second.scannedAt.getTime());
    const dayKey = getAppDayKey(sortedLogs[0].scannedAt);
    const rangeEnd = dayKey === currentDayRange.dayKey ? new Date() : sortedLogs.at(-1)?.scannedAt ?? null;
    const minutes = getEmployeeBreakSummary(sortedLogs, rangeEnd).totalMinutes;
    if (minutes <= 0) return map;
    map.set(group.department, (map.get(group.department) ?? 0) + minutes);
    return map;
  }, new Map<string, number>());
  const monthlyBreakRows = Array.from(monthlyBreakDepartmentRows, ([department, totalMinutes]) => ({ department, totalMinutes }))
    .sort((first, second) => second.totalMinutes - first.totalMinutes)
    .slice(0, 6);
  const maxDepartmentLateMinutes = Math.max(...monthlyLateDepartmentRows.map((row) => row.totalMinutes), 1);
  const maxDepartmentBreakMinutes = Math.max(...monthlyBreakRows.map((row) => row.totalMinutes), 1);
  const latestSelectedLogByEmployee = new Map<number, (typeof selectedLogsForCritical)[number]>();
  selectedLogsForCritical.forEach((log) => latestSelectedLogByEmployee.set(log.employeeId, log));
  const selectedWorkingEmployees = scopedEmployees.filter((employee) => {
    if (!employee.isActive || selectedLeaveEmployeeIds.has(employee.id)) return false;
    const latest = latestSelectedLogByEmployee.get(employee.id);
    return latest?.type === "ENTRY" || latest?.type === "BREAK_END" || latest?.type === "MEAL_END";
  });
  const selectedOnBreakEmployees = scopedEmployees.filter((employee) => {
    if (!employee.isActive || selectedLeaveEmployeeIds.has(employee.id)) return false;
    const latest = latestSelectedLogByEmployee.get(employee.id);
    return latest?.type === "BREAK_START" || latest?.type === "MEAL_START";
  });
  const selectedLeaveEmployees = Array.from(
    new Map(selectedApprovedLeaves.map((leave) => [leave.employeeId, leave.employee])).values(),
  );
  const onTimeTodayCount = todayDailyCalendarsForDashboard.filter((day) => {
    if (!day.checkLateArrival || !day.plannedStart || day.plannedNetMinutes <= 0) return false;

    const firstEntry = firstTodayEntryByEmployee.get(day.employeeId);
    return firstEntry ? !isLateEntry(firstEntry.scannedAt, day.plannedStart) : false;
  }).length;
  const statusCards = [
    { label: "Su An Iceride", value: currentlyInside, color: "blue" },
    { label: "Zamaninda", value: onTimeTodayCount, color: "green" },
    { label: "Gec", value: lateTodayCount, color: "orange" },
    { label: "Izinli", value: leaveEmployeeIds.size, color: "blue" },
  ];
  const summaryCards = isSuperadmin
    ? [
        { label: "Toplam Firma", value: companyCount, icon: Building2 },
        { label: "Firma Yöneticisi", value: companyAdminCount, icon: ShieldCheck },
        { label: "Toplam Personel", value: employeeCount, icon: Users },
        { label: "Toplam Cihaz", value: deviceCount, icon: MonitorSmartphone },
      ]
    : [
        { label: "Firma", value: user.company?.name ?? "-", icon: Building2 },
        { label: "Kayıtlı Personel", value: employeeCount, icon: Users },
        { label: "RFID Cihazı", value: deviceCount, icon: MonitorSmartphone },
        { label: "Giriş Sayısı", value: todayEntryCount, icon: DoorOpen },
        { label: "Geç Kalan Sayısı", value: lateTodayCount, icon: AlertTriangle },
        { label: "İzinli Sayısı", value: leaveEmployeeIds.size, icon: CalendarDays },
      ];
  const dashboardExportRows = todayLogsForDashboard.map((log) => ({
    employee: `${log.employee.firstName} ${log.employee.lastName}`.trim(),
    department: log.employee.department,
    type: attendanceLabels[log.type],
    scannedAt: formatDate(log.scannedAt),
    rfidCardId: log.rfidCardId ?? log.employee.rfidCardId ?? "-",
    device: log.device?.name ?? "-",
    reviewStatus: selectedOperationalRows.find((row) => row.employeeId === log.employeeId)?.movementStatus ?? "NORMAL",
  }));
  return (
    <div className={styles.page}>
      {!isSuperadmin ? (
        <section className={styles.operationTopbar}>
          <div>
            <h1 className={styles.dashboardTitle}>Giris-Cikis Dashboard</h1>
            <p className={styles.dashboardDate}>
              {new Intl.DateTimeFormat("tr-TR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              }).format(new Date())}
            </p>
          </div>
          <div className={styles.quickActions}>
            <ExportButton
              rows={dashboardExportRows}
              columns={[
                { key: "employee", label: "Personel" },
                { key: "department", label: "Departman" },
                { key: "type", label: "Hareket" },
                { key: "scannedAt", label: "Tarih" },
                { key: "rfidCardId", label: "RFID Kart" },
                { key: "device", label: "Cihaz" },
                { key: "reviewStatus", label: "Hareket Kontrol Durumu" },
              ]}
              filename={`${getDateOnlyKey(selectedDate)}-personel-hareketleri`}
              className={styles.quickButton}
              label="Rapor Indir"
            />
          </div>
        </section>
      ) : null}

      {isSuperadmin ? (
        <section className={`glass-panel ${styles.heroCard}`}>
          <div>
            <p className={styles.eyebrow}>Admin veri merkezi</p>
            <h1 className={styles.title}>{getUserFullName(user)}</h1>
            <p className={styles.subtitle}>
              Tüm firmalar, yöneticiler, cihazlar ve personel hareketleri için yoğun veri izleme ve raporlama ekranı.
            </p>
          </div>

          <div className={styles.heroMeta}>
            <div className={styles.rolePill}>{getRoleLabel(user.role)}</div>
            <div className={styles.helperText}>Canlı kayıt, tablo ve rapor öncelikli panel düzeni.</div>
          </div>
        </section>
      ) : null}

      {isSuperadmin ? <section className={styles.metricsGrid}>
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className={`glass-panel ${styles.metricCard}`}>
              <div className={styles.metricIcon}>
                <Icon size={18} />
              </div>
              <p className={styles.metricLabel}>{card.label}</p>
              <p className={styles.metricValue}>{card.value}</p>
            </article>
          );
        })}
      </section> : null}

      {!isSuperadmin ? (
        <>
          <section className={`${styles.operationReportPanel} ${styles.filterPanel}`}>
            <OperationFilters
              todayKey={currentDayRange.dayKey}
              selectedDate={getDateOnlyKey(selectedDate)}
              selectedCompanyId={selectedCompanyId?.toString() ?? ""}
              selectedBranch={selectedBranch}
              selectedDepartment={selectedDepartment}
              companies={filterCompanies}
              scopes={filterScopes}
              className={styles.operationFilterForm}
            />
          </section>
          <section className={styles.operationKpiGrid}>
            <article className={`${styles.operationReportPanel} ${styles.distributionCard}`}>
              <div className={styles.operationReportHeader}><div><p className={styles.sectionEyebrow}>Günlük dağılım</p><h2 className={styles.sectionTitle}>Personel Durumu</h2></div></div>
              <div className={styles.donutSummary}>
                <div className={styles.donutCircle}><strong>{employeeCount}</strong><span>Toplam</span></div>
                <div className={styles.statusList}>
                  {statusCards.map((item) => (
                    <p key={item.label}><span className={`${styles.statusDot} ${styles[`statusDot${item.color}`]}`} />{item.label}<strong>{item.value}</strong></p>
                  ))}
                </div>
              </div>
            </article>
            <article className={`${styles.operationKpiCard} ${styles.operationKpiLate}`}>
              <div className={styles.kpiHeader}><span>Geç kalan personel</span><div className={styles.kpiIcon}><Users size={21} aria-hidden="true" /></div></div>
              <div className={styles.kpiValue}><strong>{selectedLateEmployees.length}</strong><span>kişi</span></div>
              <small>Seçili günde geç giriş yapanlar</small>
            </article>
            <article className={`${styles.operationKpiCard} ${styles.operationKpiDelay}`}>
              <div className={styles.kpiHeader}><span>Ortalama gecikme</span><div className={styles.kpiIcon}><Clock3 size={21} aria-hidden="true" /></div></div>
              <div className={styles.kpiValue}><strong>{selectedLateAverageMinutes}</strong><span>dk</span></div>
              <small>Seçili gündeki kişi başı ortalama</small>
            </article>
            <article className={`${styles.operationKpiCard} ${styles.operationKpiBreak}`}>
              <div className={styles.kpiHeader}><span>Toplam mola</span><div className={styles.kpiIcon}><Coffee size={21} aria-hidden="true" /></div></div>
              <div className={styles.kpiValue}><strong>{selectedBreakTotalMinutes}</strong><span>dk</span></div>
              <small>Seçili gün · Mola ve yemek süreleri</small>
            </article>
          </section>

          <section className={styles.operationReportGrid}>
            <article className={styles.operationReportPanel}>
              <div className={styles.operationReportHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>Operasyon özeti</p>
                  <h2 className={styles.sectionTitle}>Personel Geç Kalma ve Mola Süreleri</h2>
                </div>
              </div>
              <div className={styles.operationLegend}>
                <span><i className={styles.operationLegendLate} />Geç kalma</span>
                <span><i className={styles.operationLegendBreak} />Mola</span>
              </div>
              <PersonnelChart
                key={getDateOnlyKey(selectedDate)}
                rows={selectedOperationalRows.map((row) => ({
                  employeeId: row.employeeId,
                  employeeName: row.employeeName,
                  department: row.department,
                  lateMinutes: row.lateMinutes,
                  breakMinutes: row.breakMinutes,
                }))}
              />
            </article>
          </section>

          <section className={`${styles.operationReportPanel} ${styles.staffStatusPanel}`}>
            <div className={styles.operationReportHeader}><div><p className={styles.sectionEyebrow}>Anlık durum</p><h2 className={styles.sectionTitle}>Personel Durum Özeti</h2></div></div>
            <div className={styles.staffStatusGrid}>
              {[
                { title: "Çalışıyor", employees: selectedWorkingEmployees, tone: "working" },
                { title: "Molada", employees: selectedOnBreakEmployees, tone: "break" },
                { title: "İzinli", employees: selectedLeaveEmployees, tone: "leave" },
              ].map((group) => (
                <section key={group.title} className={`${styles.staffStatusColumn} ${styles[`staffStatus${group.tone}`]}`}>
                  <div className={styles.staffStatusHeading}><h3>{group.title}</h3><span>{group.employees.length}</span></div>
                  <div className={styles.staffNameList}>
                    {group.employees.length === 0 ? <p>Personel yok</p> : group.employees.map((employee) => (
                      <strong key={employee.id}>{employee.firstName} {employee.lastName}</strong>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <section className={styles.singleColumnGrid}>
        <div className={styles.primaryColumn}>
          {isSuperadmin ? (
            <section className={`glass-panel ${styles.sectionCard}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>Firma genel görünüm</p>
                  <h2 className={styles.sectionTitle}>Müşteri Firmalar</h2>
                </div>
              </div>

              <div className={styles.cardGrid}>
                {highlightedCompanies.map((company) => (
                  <article key={company.id} className={styles.infoCard}>
                    <div className={styles.infoCardTop}>
                      <div>
                        <p className={styles.infoCardTitle}>{company.name}</p>
                        <p className={styles.infoCardMeta}>
                          {company.users[0]
                            ? getUserFullName(company.users[0])
                            : "Firma admini tanımlanmadı"}
                        </p>
                      </div>
                      <div className={styles.countPill}>{company._count.employees} personel</div>
                    </div>

                    <p className={styles.infoCardBody}>
                      {company.address ?? "Adres bilgisi henüz girilmedi."}
                    </p>

                    <div className={styles.infoCardFooter}>
                      <span>İletişim: {company.contactEmail ?? company.contactPhone ?? "-"}</span>
                      <span>{company._count.devices} cihaz</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <div className={styles.operationDetailStack}>
              <section className={styles.operationNamePanels}>
                <article className={styles.operationNamePanel}>
                  <div className={styles.sectionHeader}><div><p className={styles.sectionEyebrow}>Mola takibi</p><h2 className={styles.sectionTitle}>Mola Limitini Aşan Personeller</h2></div><span className={styles.countPill}>{selectedBreakOverRows.length}</span></div>
                  <div className={styles.alertNameList}>
                    {selectedBreakOverRows.length === 0 ? <p className={styles.emptyState}>Seçili tarihte mola limitini aşan personel yok.</p> : selectedBreakOverRows.map((row) => (
                      <div key={row.employeeId}><strong>{row.employeeName}</strong><span>+{formatMinutes(row.breakOverMinutes)}</span></div>
                    ))}
                  </div>
                </article>
                <article className={styles.operationNamePanel}>
                  <div className={styles.sectionHeader}><div><p className={styles.sectionEyebrow}>Giriş takibi</p><h2 className={styles.sectionTitle}>Geç Kalan Personeller</h2></div><span className={styles.countPill}>{selectedLateEmployees.length}</span></div>
                  <div className={styles.alertNameList}>
                    {selectedLateEmployees.length === 0 ? <p className={styles.emptyState}>Seçili tarihte geç kalan personel yok.</p> : selectedLateEmployees.map((row) => (
                      <div key={row.employeeId}><strong>{row.employeeName}</strong><span>+{formatMinutes(row.lateMinutes)}</span></div>
                    ))}
                  </div>
                </article>
              </section>

              <section className={styles.operationReportPanel}>
                <div className={styles.sectionHeader}>
                  <div><p className={styles.sectionEyebrow}>Hareket kontrolü</p><h2 className={styles.sectionTitle}>Dikkat Edilmesi Gereken Kayıtlar</h2></div>
                  <span className={styles.countPill}>{selectedAttentionRows.length}</span>
                </div>
                <div className={styles.alertNameList}>
                  {selectedAttentionRows.length === 0 ? (
                    <p className={styles.emptyState}>Seçili tarihte hatalı hareket bulunmuyor.</p>
                  ) : selectedAttentionRows.map((row) => (
                    <div key={row.employeeId}>
                      <strong>{row.employeeName}</strong>
                      <span>{row.movementStatus} · {row.unmatchedMovements.map((log) => formatDate(log.scannedAt)).join(", ")}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className={styles.departmentChartGrid}>
                <article className={styles.compactChartPanel}>
                  <div className={styles.sectionHeader}><div><p className={styles.sectionEyebrow}>Bu ay</p><h3 className={styles.sectionTitle}>Departman Bazlı Geç Kalma Süresi</h3></div></div>
                  <div className={styles.verticalBars}>
                    {monthlyLateDepartmentRows.length === 0 ? <p className={styles.emptyState}>Geç kalma verisi yok.</p> : monthlyLateDepartmentRows.map((row) => (
                      <div key={row.department} className={styles.verticalBarColumn}><span>{formatMinutes(row.totalMinutes)}</span><div className={styles.verticalBarTrack}><i className={styles.lateDepartmentBar} style={{ height: `${Math.max((row.totalMinutes / maxDepartmentLateMinutes) * 100, 6)}%` }} /></div><strong>{row.department}</strong></div>
                    ))}
                  </div>
                </article>
                <article className={styles.compactChartPanel}>
                  <div className={styles.sectionHeader}><div><p className={styles.sectionEyebrow}>Bu ay</p><h3 className={styles.sectionTitle}>Departman Bazlı Mola Süresi</h3></div></div>
                  <div className={styles.verticalBars}>
                    {monthlyBreakRows.length === 0 ? <p className={styles.emptyState}>Mola verisi yok.</p> : monthlyBreakRows.map((row) => (
                      <div key={row.department} className={styles.verticalBarColumn}><span>{formatMinutes(row.totalMinutes)}</span><div className={styles.verticalBarTrack}><i className={styles.breakDepartmentBar} style={{ height: `${Math.max((row.totalMinutes / maxDepartmentBreakMinutes) * 100, 6)}%` }} /></div><strong>{row.department}</strong></div>
                    ))}
                  </div>
                </article>
              </section>
            </div>
          )}
        </div>

      </section>
    </div>
  );
}
