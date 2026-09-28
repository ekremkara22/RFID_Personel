import Link from "next/link";
import { redirect } from "next/navigation";
import { CirclePlus, Filter } from "lucide-react";
import { AttendanceType } from "@/generated/prisma/client";
import {
  deleteAttendanceLogAction,
  updateAttendanceLogAction,
} from "@/app/dashboard/actions";
import { ExportButton } from "@/app/dashboard/export-button";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { can, employeeScopeWhere } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { APP_TIME_ZONE, dateOnlyFromKey, getAppDayKey, getAppMinutes, getDateOnlyKey } from "@/lib/app-time";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { timeToMinutes } from "@/lib/work-calendar-rules";
import { analyzeAttendanceSequence } from "@/lib/attendance-sequence";
import styles from "../page.module.css";

const attendanceLabels = {
  ENTRY: "Giris",
  EXIT: "Cikis",
  BREAK_START: "Mola Çıkış",
  BREAK_END: "Mola Giriş",
  MEAL_START: "Yemek Çıkış",
  MEAL_END: "Yemek Giriş",
} as const;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

function formatInputDate(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function getDateValue(value?: string) {
  if (!value) return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function MovementsPage(props: {
  searchParams: Promise<{
    q?: string;
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
  const query = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  if (!authorization.companyId) redirect("/dashboard");
  const requestedBranchId = Number(searchParams.branchId); const requestedDepartmentId = Number(searchParams.departmentId);
  const type =
    typeof searchParams.type === "string" &&
    Object.values(AttendanceType).includes(searchParams.type as AttendanceType)
      ? (searchParams.type as AttendanceType)
      : "";
  const fromDate = getDateValue(searchParams.from);
  const toDate = getDateValue(searchParams.to);

  const [company, branches, departments] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: authorization.companyId } }),
    prisma.branch.findMany({
      where: { companyId: authorization.companyId, isActive: true }, orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      where: { companyId: authorization.companyId, isActive: true }, orderBy: { name: "asc" },
    }),
  ]);
  const branchId = branches.some((item)=>item.id === requestedBranchId) ? requestedBranchId : null; const departmentId = departments.some((item)=>item.id === requestedDepartmentId) ? requestedDepartmentId : null;
  const [logs, auditMarkers] = await Promise.all([
    prisma.attendanceLog.findMany({
      where: {
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
          ...(query
            ? {
                OR: [
                  { firstName: { contains: query } },
                  { lastName: { contains: query } },
                  { email: { contains: query } },
                  { rfidCardId: { contains: query } },
                ],
              }
            : {}),
        },
      },
      include: {
        employee: { include: { company: true } },
        device: true,
      },
      orderBy: { scannedAt: "desc" },
      take: 500,
    }),
    prisma.attendanceMovementAudit.findMany({
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
    ? await prisma.employeeDailyCalendar.findMany({
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

  const exportRows = logs.map((log) => ({
    employee: `${log.employee.firstName} ${log.employee.lastName}`.trim(),
    company: log.employee.company.name,
    branch: log.employee.branch ?? "-",
    department: log.employee.department,
    type: attendanceLabels[log.type],
    status: getAttendanceStatus(log),
    scannedAt: formatDate(log.scannedAt),
    rfidCardId: log.rfidCardId ?? log.employee.rfidCardId ?? "-",
    device: log.device?.name ?? "-",
  }));

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Personel Hareketleri</p>
          <h1 className={styles.title}>Giris-Cikis Hareketleri</h1>
          <p className={styles.subtitle}>
            RFID kart okutmalarini filtrele, hareket tipini veya zamanini duzenle ve listeyi Excel olarak indir.
          </p>
        </div>

        <div className={styles.heroMeta}>
          {can(authorization, PERMISSIONS.MOVEMENT_CREATE) ? <Link href="/dashboard/movements/new" className={styles.primaryLinkButton}>
            <CirclePlus size={18} />
            <span>Hareket Ekle</span>
          </Link> : null}
          {can(authorization, PERMISSIONS.REPORT_EXPORT) ? <ExportButton
            rows={exportRows}
            columns={[
              { key: "employee", label: "Personel" },
              { key: "company", label: "Firma" },
              { key: "branch", label: "Şube" },
              { key: "department", label: "Departman" },
              { key: "type", label: "Hareket Tipi" },
              { key: "status", label: "Durum" },
              { key: "scannedAt", label: "Tarih" },
              { key: "rfidCardId", label: "RFID Kart" },
              { key: "device", label: "Cihaz" },
            ]}
            filename="personel-hareketleri"
            className={styles.primaryLinkButton}
          /> : null}
        </div>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <form className={styles.filterGrid}>
          <label className={styles.field}>
            <span>Personel / RFID</span>
            <input name="q" defaultValue={query} placeholder="Ad, soyad, e-posta veya kart ID" />
          </label>

          <label className={styles.field}>
            <span>Firma</span>
            <input value={company.name} readOnly />
          </label>

          <label className={styles.field}>
            <span>Şube</span>
            <select name="branchId" defaultValue={branchId ?? ""}>
              <option value="">Tum Şubeler</option>
              {branches.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Departman</span>
            <select name="departmentId" defaultValue={departmentId ?? ""}>
              <option value="">Tum Departmanlar</option>
              {departments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Hareket Tipi</span>
            <select name="type" defaultValue={type}>
              <option value="">Tum Hareketler</option>
              {Object.values(AttendanceType).map((item) => (
                <option key={item} value={item}>
                  {attendanceLabels[item]}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Baslangic</span>
            <input name="from" type="datetime-local" defaultValue={searchParams.from ?? ""} />
          </label>

          <label className={styles.field}>
            <span>Bitis</span>
            <input name="to" type="datetime-local" defaultValue={searchParams.to ?? ""} />
          </label>

          <button type="submit" className={styles.primaryButton}>
            <Filter size={16} />
            <span>Filtrele</span>
          </button>
        </form>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Kayitlar</p>
            <h2 className={styles.sectionTitle}>Filtrelenen Hareketler</h2>
          </div>
          <div className={styles.countPill}>{logs.length} kayit</div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Personel</th>
                <th>Firma</th>
                <th>Şube</th>
                <th>Departman</th>
                <th>Hareket / Zaman</th>
                <th>Durum</th>
                <th>RFID Kart</th>
                <th>Cihaz</th>
                <th>Sil</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className={styles.emptyCell}>
                    Filtreye uygun hareket bulunamadi.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <strong>
                        {log.employee.firstName} {log.employee.lastName}
                      </strong>
                      <p className={styles.tableSubText}>{log.employee.email ?? "-"}</p>
                    </td>
                    <td>{log.employee.company.name}</td>
                    <td>{log.employee.branch ?? "-"}</td>
                    <td>{log.employee.department}</td>
                    <td>
                      {can(authorization, PERMISSIONS.MOVEMENT_UPDATE) ? <form action={updateAttendanceLogAction} className={styles.inlineEditForm}>
                        <input type="hidden" name="logId" value={log.id} />
                        <select name="type" defaultValue={log.type}>
                          {Object.values(AttendanceType).map((item) => (
                            <option key={item} value={item}>
                              {attendanceLabels[item]}
                            </option>
                          ))}
                        </select>
                        <input
                          name="scannedAt"
                          type="datetime-local"
                          defaultValue={formatInputDate(log.scannedAt)}
                        />
                        <input name="correctionReason" required placeholder="Düzeltme açıklaması" />
                        <SubmitButton
                          idleLabel="Kaydet"
                          pendingLabel="..."
                          className={styles.smallButton}
                        />
                      </form> : <span>{attendanceLabels[log.type]} · {formatDate(log.scannedAt)}</span>}
                    </td>
                    <td>{getAttendanceStatus(log)}<p className={styles.tableSubText}>{reviewStatusByLogId.get(log.id)}</p></td>
                    <td className={styles.monoCell}>{log.rfidCardId ?? log.employee.rfidCardId ?? "-"}</td>
                    <td>{log.device?.name ?? "-"}</td>
                    <td>
                      {can(authorization, PERMISSIONS.MOVEMENT_DELETE) ? <form action={deleteAttendanceLogAction} className={styles.auditDeleteForm}>
                        <input type="hidden" name="logId" value={log.id} />
                        <input name="correctionReason" required placeholder="Silme nedeni" aria-label="Silme nedeni" />
                        <SubmitButton
                          idleLabel="Sil"
                          pendingLabel="..."
                          className={styles.dangerMiniButton}
                        />
                      </form> : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
