import Link from "next/link";
import { redirect } from "next/navigation";
import { CirclePlus, Filter } from "lucide-react";
import { AttendanceType } from "@/generated/prisma/client";
import { ReorderableDataTable, type DataTableColumn } from "@/app/dashboard/reorderable-data-table";
import { can, employeeScopeWhere } from "@/lib/authorization";
import { ATTENDANCE_TYPE_LABELS } from "@/lib/attendance-labels";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { APP_TIME_ZONE, dateOnlyFromKey, getAppDayKey, getAppDayRange, getAppMinutes, getDateOnlyKey, parseAppDateTimeInput } from "@/lib/app-time";
import { queryRepository } from "@/modules/shared/query-repository";
import { requireSessionUser } from "@/lib/session";
import { timeToMinutes } from "@/lib/work-calendar-rules";
import { analyzeAttendanceSequence } from "@/lib/attendance-sequence";
import styles from "../page.module.css";
import ui from "../management.module.css";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

export default async function MovementsPage(props: {
  searchParams: Promise<{
    employeeId?: string;
    branchId?: string;
    departmentId?: string;
    type?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { user, authorization } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN") {
    redirect("/dashboard");
  }

  const searchParams = await props.searchParams;
  if (!authorization.companyId) redirect("/dashboard");
  const todayRange = getAppDayRange(new Date());
  const defaultFromValue = `${todayRange.dayKey}T00:01`;
  const defaultToValue = `${todayRange.dayKey}T23:59`;
  const fromValue = parseAppDateTimeInput(searchParams.from) ? searchParams.from! : defaultFromValue;
  const toValue = parseAppDateTimeInput(searchParams.to) ? searchParams.to! : defaultToValue;
  const requestedEmployeeId = Number(searchParams.employeeId); const requestedBranchId = Number(searchParams.branchId); const requestedDepartmentId = Number(searchParams.departmentId);
  const type =
    typeof searchParams.type === "string" &&
    Object.values(AttendanceType).includes(searchParams.type as AttendanceType)
      ? (searchParams.type as AttendanceType)
      : "";
  const fromDate = parseAppDateTimeInput(fromValue);
  const toDate = parseAppDateTimeInput(toValue, { endOfMinute: true });

  const [company, employees, branches, departments] = await Promise.all([
    queryRepository.company.findUniqueOrThrow({ where: { id: authorization.companyId } }),
    queryRepository.employee.findMany({
      where: employeeScopeWhere(authorization),
      select: { id: true, firstName: true, lastName: true, registrationNumber: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    queryRepository.branch.findMany({
      where: { companyId: authorization.companyId, isActive: true }, orderBy: { name: "asc" },
    }),
    queryRepository.department.findMany({
      where: { companyId: authorization.companyId, isActive: true }, orderBy: { name: "asc" },
    }),
  ]);
  const employeeId = employees.some((item) => item.id === requestedEmployeeId) ? requestedEmployeeId : null;
  const branchId = branches.some((item)=>item.id === requestedBranchId) ? requestedBranchId : null; const departmentId = departments.some((item)=>item.id === requestedDepartmentId) ? requestedDepartmentId : null;
  const [logs, auditMarkers] = await Promise.all([
    queryRepository.attendanceLog.findMany({
      where: {
        ...(employeeId ? { employeeId } : {}),
        ...(type ? { type } : {}),
        ...(fromDate || toDate
          ? {
              scannedAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
        employee: {
          ...employeeScopeWhere(authorization),
          ...(branchId ? { branchId } : {}),
          ...(departmentId ? { departmentId } : {}),
        },
      },
      include: {
        employee: { include: { company: true } },
        device: true,
      },
      orderBy: { scannedAt: "desc" },
      take: 500,
    }),
    queryRepository.attendanceMovementAudit.findMany({
      where: { employee: employeeScopeWhere(authorization) },
      select: { employeeId: true, movementDateTime: true },
    }),
  ]);

  const calendarKeys = new Map<string, { employeeId: number; workDate: Date }>();
  logs.forEach((log) => {
    const dayKey = getAppDayKey(log.scannedAt);
    const workDate = dateOnlyFromKey(dayKey);
    calendarKeys.set(`${log.employeeId}-${dayKey}`, { employeeId: log.employeeId, workDate });
  });
  const dailyCalendars = calendarKeys.size
    ? await queryRepository.employeeDailyCalendar.findMany({
        where: {
          OR: Array.from(calendarKeys.values()).map((item) => ({
            employeeId: item.employeeId,
            workDate: item.workDate,
          })),
        },
      })
    : [];
  const calendarByLogDay = new Map(
    dailyCalendars.map((calendar) => [`${calendar.employeeId}-${getDateOnlyKey(calendar.workDate)}`, calendar]),
  );

  function getAttendanceStatus(log: (typeof logs)[number]) {
    if (log.type !== AttendanceType.ENTRY) return "-";

    const calendar = calendarByLogDay.get(`${log.employeeId}-${getAppDayKey(log.scannedAt)}`);
    const plannedStartMinutes = timeToMinutes(calendar?.plannedStart ?? null);

    if (!calendar?.checkLateArrival || plannedStartMinutes === null || calendar.plannedNetMinutes <= 0) {
      return "-";
    }

    return getAppMinutes(log.scannedAt) > plannedStartMinutes ? "Gec kalmis" : "Zamaninda";
  }

  const logsByEmployeeDay = logs.reduce((map, log) => {
    const key = `${log.employeeId}-${getAppDayKey(log.scannedAt)}`;
    const dayLogs = map.get(key) ?? [];
    dayLogs.push(log);
    map.set(key, dayLogs);
    return map;
  }, new Map<string, typeof logs>());
  const auditDayKeys = new Set(auditMarkers.map((audit) => `${audit.employeeId}-${getAppDayKey(audit.movementDateTime)}`));
  const reviewStatusByLogId = new Map<number, string>();
  logsByEmployeeDay.forEach((dayLogs, key) => {
    const dayKey = getAppDayKey(dayLogs[0].scannedAt);
    const analysis = analyzeAttendanceSequence(dayLogs, {
      requireExit: dayKey < getAppDayKey(new Date()),
      allowOpenBreak: dayKey === getAppDayKey(new Date()),
    });
    const status = analysis.isValid ? (auditDayKeys.has(key) ? "DÜZELTİLDİ" : "NORMAL") : "HATALI HAREKET";
    dayLogs.forEach((log) => reviewStatusByLogId.set(log.id, status));
  });

  const columns: DataTableColumn[] = [
    { id: "employee", label: "Personel", valueKey: "employee", secondaryKey: "employeeDetail", kind: "stack" },
    { id: "organization", label: "Organizasyon", valueKey: "department", secondaryKey: "organizationDetail", kind: "stack" },
    { id: "movement", label: "Hareket", valueKey: "type", secondaryKey: "scannedAt", kind: "stack" },
    { id: "arrival", label: "Giriş durumu", valueKey: "status", secondaryKey: "reviewStatus", kind: "stack" },
    { id: "rfid", label: "RFID Kart", valueKey: "rfidCardId", kind: "mono" },
    { id: "device", label: "Cihaz", valueKey: "device" },
    { id: "action", label: "İşlem", valueKey: "actionLabel", hrefKey: "actionHref", kind: "link", exportable: false },
  ];
  const tableRows = logs.map((log) => ({
    id: log.id,
    employee: `${log.employee.firstName} ${log.employee.lastName}`.trim(),
    employeeDetail: log.employee.email ?? "E-posta yok",
    department: log.employee.department,
    organizationDetail: `${log.employee.company.name} · ${log.employee.branch ?? "Şubesiz"}`,
    type: ATTENDANCE_TYPE_LABELS[log.type],
    scannedAt: formatDate(log.scannedAt),
    status: getAttendanceStatus(log),
    reviewStatus: reviewStatusByLogId.get(log.id) ?? "NORMAL",
    rfidCardId: log.rfidCardId ?? log.employee.rfidCardId ?? "-",
    device: log.device?.name ?? "-",
    actionLabel: "İncele",
    actionHref: `/dashboard/movements/${log.id}`,
  }));

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}><p className={ui.kicker}>Personel hareketleri</p><h1 className={ui.pageTitle}>Giriş–Çıkış Hareketleri</h1><p className={ui.pageDescription}>RFID hareketlerini filtreleyin; düzeltme ve silme işlemleri için kaydı inceleyin.</p></div>
        {can(authorization, PERMISSIONS.MOVEMENT_CREATE) ? <div className={ui.headerActions}><Link href="/dashboard/movements/new" className={ui.primaryAction}><CirclePlus size={16} />Hareket Ekle</Link></div> : null}
      </header>

      <section className={ui.surface} aria-label="Hareket filtreleri">
        <form className={ui.formGridThree}>
          <label className={ui.field}><span className={ui.fieldLabel}>Personel</span><select className={ui.control} name="employeeId" defaultValue={employeeId ?? ""}><option value="">Tüm personeller</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.firstName} {employee.lastName}{employee.registrationNumber ? ` · ${employee.registrationNumber}` : ""}</option>)}</select></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Şube</span><select className={ui.control} name="branchId" defaultValue={branchId ?? ""}><option value="">Tüm şubeler</option>{branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Departman</span><select className={ui.control} name="departmentId" defaultValue={departmentId ?? ""}><option value="">Tüm departmanlar</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Hareket tipi</span><select className={ui.control} name="type" defaultValue={type}><option value="">Tüm hareketler</option>{Object.values(AttendanceType).map((item) => <option key={item} value={item}>{ATTENDANCE_TYPE_LABELS[item]}</option>)}</select></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Başlangıç</span><input className={ui.control} name="from" type="datetime-local" defaultValue={fromValue} /></label>
          <label className={ui.field}><span className={ui.fieldLabel}>Bitiş</span><input className={ui.control} name="to" type="datetime-local" defaultValue={toValue} /></label>
          <button type="submit" className={ui.filterButton}><Filter size={15} />Filtrele</button>
        </form>
      </section>

      <section className={ui.surface}>
        <div className={ui.sectionHeading}><div><h2>Filtrelenen hareketler</h2><p>{company.name} · Sonuçlar en yeni hareketten başlar</p></div><span className={ui.countBadge}>{logs.length} kayıt</span></div>
        <ReorderableDataTable rows={tableRows} columns={columns} storageKey="rfid-personel-columns-movements-v2" filename="personel-hareketleri" emptyMessage="Filtrelere uygun hareket bulunamadı." canExport={can(authorization, PERMISSIONS.REPORT_EXPORT)} minWidth={940} />
      </section>
    </div>
  );
}
