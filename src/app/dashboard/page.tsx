import Link from "next/link";
import {
  Building2,
  CalendarDays,
  CalendarRange,
  DoorOpen,
  AlertTriangle,
  MonitorSmartphone,
  ShieldCheck,
  Users,
} from "lucide-react";
import { ExportButton } from "@/app/dashboard/export-button";
import { LeaveApprovalStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { timeToMinutes } from "@/lib/work-calendar-rules";
import styles from "./page.module.css";

const attendanceLabels = {
  ENTRY: "Giriş",
  EXIT: "Çıkış",
  BREAK_START: "Mola Giriş",
  BREAK_END: "Mola Çıkış",
  MEAL_START: "Yemek Giriş",
  MEAL_END: "Yemek Çıkış",
} as const;

const leaveTypeLabels = {
  ANNUAL: "Yillik izin",
  EXCUSE: "Mazeret izni",
  UNPAID: "Ucretsiz izin",
  MEDICAL: "Saglik raporu",
  ADMINISTRATIVE: "Idari izin",
  HOURLY: "Saatlik izin",
  HALF_DAY: "Yarim gun izin",
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
  }).format(date);
}

function getWeekStart(date: Date) {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function getDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateParam(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  parsed.setHours(0, 0, 0, 0);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getLogMinutes(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function isLateEntry(scannedAt: Date, plannedStart?: string | null) {
  const plannedStartMinutes = timeToMinutes(plannedStart);
  return plannedStartMinutes !== null && getLogMinutes(scannedAt) > plannedStartMinutes;
}

export default async function DashboardPage(props: { searchParams?: Promise<{ date?: string; latePeriod?: string }> }) {
  const { user } = await requireSessionUser();
  const isSuperadmin = user.role === "SUPERADMIN";
  const searchParams = (await props.searchParams) ?? {};
  const latePeriod = searchParams.latePeriod === "month" ? "month" : "week";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDate = parseDateParam(searchParams.date) ?? today;
  const selectedDateEnd = new Date(selectedDate);
  selectedDateEnd.setDate(selectedDateEnd.getDate() + 1);
  const todayEnd = new Date(today);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekStart = getWeekStart(new Date());
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const attendanceWhere = isSuperadmin
    ? undefined
    : {
        employee: {
          companyId: user.companyId ?? undefined,
        },
      };

  const employeeWhere = isSuperadmin
    ? undefined
    : {
        companyId: user.companyId ?? undefined,
      };

  const deviceWhere = isSuperadmin
    ? undefined
    : {
        companyId: user.companyId ?? undefined,
      };

  const companyWhere = isSuperadmin ? undefined : { id: user.companyId ?? undefined };

  const [
    companyCount,
    companyAdminCount,
    employeeCount,
    deviceCount,
    highlightedCompanies,
    scopedEmployees,
    todayEntryCount,
    todayExitCount,
    todayMovementCount,
    weekMovementCount,
    monthMovementCount,
    monthlyLogsForReport,
    monthlyDailyCalendarsForReport,
    todayLogsForDashboard,
    todayDailyCalendarsForDashboard,
    todayApprovedLeaves,
    selectedLogsForCritical,
    selectedDailyCalendarsForCritical,
    selectedApprovedLeaves,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.user.count({ where: { role: "COMPANY_ADMIN" } }),
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
      take: 8,
    }),
    prisma.attendanceLog.count({
      where: {
        scannedAt: { gte: today },
        type: "ENTRY",
        ...attendanceWhere,
      },
    }),
    prisma.attendanceLog.count({
      where: {
        scannedAt: { gte: today },
        type: "EXIT",
        ...attendanceWhere,
      },
    }),
    prisma.attendanceLog.count({
      where: {
        scannedAt: { gte: today },
        ...attendanceWhere,
      },
    }),
    prisma.attendanceLog.count({
      where: {
        scannedAt: { gte: weekStart },
        ...attendanceWhere,
      },
    }),
    prisma.attendanceLog.count({
      where: {
        scannedAt: { gte: monthStart },
        ...attendanceWhere,
      },
    }),
    prisma.attendanceLog.findMany({
      where: {
        scannedAt: { gte: monthStart },
        ...attendanceWhere,
      },
      include: {
        employee: true,
      },
      orderBy: { scannedAt: "desc" },
      take: 1000,
    }),
    prisma.employeeDailyCalendar.findMany({
      where: {
        workDate: { gte: monthStart },
        employee: {
          companyId: user.companyId ?? undefined,
        },
      },
      include: { employee: true },
      take: 3000,
    }),
    prisma.attendanceLog.findMany({
      where: {
        scannedAt: { gte: today },
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
        workDate: today,
        employee: {
          companyId: user.companyId ?? undefined,
        },
      },
      include: { employee: true },
      take: 500,
    }),
    prisma.leaveRequest.findMany({
      where: {
        companyId: user.companyId ?? undefined,
        approvalStatus: LeaveApprovalStatus.APPROVED,
        startDate: { lte: new Date() },
        endDate: { gte: today },
      },
      include: { employee: true },
    }),
    prisma.attendanceLog.findMany({
      where: {
        scannedAt: { gte: selectedDate, lt: selectedDateEnd },
        ...attendanceWhere,
      },
      include: {
        employee: true,
      },
      orderBy: { scannedAt: "asc" },
      take: 500,
    }),
    prisma.employeeDailyCalendar.findMany({
      where: {
        workDate: selectedDate,
        employee: {
          companyId: user.companyId ?? undefined,
        },
      },
      include: { employee: true },
      take: 500,
    }),
    prisma.leaveRequest.findMany({
      where: {
        companyId: user.companyId ?? undefined,
        approvalStatus: LeaveApprovalStatus.APPROVED,
        startDate: { lt: selectedDateEnd },
        endDate: { gte: selectedDate },
      },
      include: { employee: true },
    }),
  ]);

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
        { label: "Bugün Giriş", value: todayEntryCount, icon: DoorOpen },
      ];

  const periodCards = [
    { label: "Bugün PDKS", value: todayMovementCount, icon: CalendarDays },
    { label: "Haftalık PDKS", value: weekMovementCount, icon: CalendarRange },
    { label: "Aylık PDKS", value: monthMovementCount, icon: CalendarRange },
  ];

  const currentlyInside = Math.max(todayEntryCount - todayExitCount, 0);
  const leaveEmployeeIds = new Set(todayApprovedLeaves.map((leave) => leave.employeeId));
  const lateTodayCount = todayDailyCalendarsForDashboard.filter((day) => {
    if (!day.checkLateArrival || !day.plannedStart || day.plannedNetMinutes <= 0) return false;

    const firstEntry = todayLogsForDashboard
      .filter((log) => log.employeeId === day.employeeId && log.type === "ENTRY")
      .sort((first, second) => first.scannedAt.getTime() - second.scannedAt.getTime())[0];

    return firstEntry ? isLateEntry(firstEntry.scannedAt, day.plannedStart) : false;
  }).length;
  const monthlyLateRecords = monthlyDailyCalendarsForReport.flatMap((day) => {
    if (!day.checkLateArrival || !day.plannedStart || day.plannedNetMinutes <= 0) return [];

    const firstEntry = monthlyLogsForReport
      .filter((log) => log.employeeId === day.employeeId && log.type === "ENTRY" && getDayKey(log.scannedAt) === getDayKey(day.workDate))
      .sort((first, second) => first.scannedAt.getTime() - second.scannedAt.getTime())[0];

    if (!firstEntry) return [];

    const plannedStartMinutes = timeToMinutes(day.plannedStart);
    if (plannedStartMinutes === null) return [];

    const lateMinutes = getLogMinutes(firstEntry.scannedAt) - plannedStartMinutes;
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

    const lateMinutes = getLogMinutes(firstEntry.scannedAt) - plannedStartMinutes;
    if (lateMinutes <= 0) return [];

    return [{
      employeeId: day.employeeId,
      employeeName: `${day.employee.firstName} ${day.employee.lastName}`.trim(),
      department: day.employee.department || "Departmansiz",
      lateMinutes,
    }];
  }).sort((first, second) => second.lateMinutes - first.lateMinutes);
  const selectedLeaveEmployeeIds = new Set(selectedApprovedLeaves.map((leave) => leave.employeeId));
  const selectedLeaveSummaries = selectedApprovedLeaves
    .map((leave) => ({
      employeeName: `${leave.employee.firstName} ${leave.employee.lastName}`.trim(),
      department: leave.employee.department || "Departmansiz",
      type: leave.type,
    }))
    .sort((first, second) => first.employeeName.localeCompare(second.employeeName, "tr"));
  const selectedLateRecords = monthlyLateRecords.filter((record) => (
    latePeriod === "week" ? record.workDate >= weekStart : record.workDate >= monthStart
  ));
  const topLateEmployees = Array.from(
    selectedLateRecords.reduce((summary, record) => {
      const current = summary.get(record.employeeId) ?? {
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        department: record.department,
        count: 0,
        totalMinutes: 0,
      };
      current.count += 1;
      current.totalMinutes += record.lateMinutes;
      summary.set(record.employeeId, current);
      return summary;
    }, new Map<string, { employeeId: string; employeeName: string; department: string; count: number; totalMinutes: number }>()),
  )
    .map(([, value]) => value)
    .sort((first, second) => second.count - first.count || second.totalMinutes - first.totalMinutes)
    .slice(0, 8);
  const onTimeTodayCount = Math.max(todayEntryCount - lateTodayCount, 0);
  const statusTotal = Math.max(employeeCount, 1);
  const statusCards = [
    { label: "Su An Iceride", value: currentlyInside, color: "blue" },
    { label: "Zamaninda", value: onTimeTodayCount, color: "green" },
    { label: "Gec", value: lateTodayCount, color: "orange" },
    { label: "Izinli", value: leaveEmployeeIds.size, color: "blue" },
  ];
  const dashboardExportRows = todayLogsForDashboard.map((log) => ({
    employee: `${log.employee.firstName} ${log.employee.lastName}`.trim(),
    department: log.employee.department,
    type: attendanceLabels[log.type],
    scannedAt: formatDate(log.scannedAt),
    rfidCardId: log.rfidCardId ?? log.employee.rfidCardId ?? "-",
    device: log.device?.name ?? "-",
  }));
  const attentionEmployees = scopedEmployees
    .filter((employee) => {
      const hasEntry = selectedLogsForCritical.some(
        (log) => log.employeeId === employee.id && log.type === "ENTRY",
      );
      return employee.isActive && !hasEntry && !selectedLeaveEmployeeIds.has(employee.id);
    })
    .slice(0, 8);

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
            <span className={styles.quickButton}>
              <CalendarDays size={18} />
              Bugun
            </span>
            <span className={styles.quickButton}>Departman: Tumu</span>
            <ExportButton
              rows={dashboardExportRows}
              columns={[
                { key: "employee", label: "Personel" },
                { key: "department", label: "Departman" },
                { key: "type", label: "Hareket" },
                { key: "scannedAt", label: "Tarih" },
                { key: "rfidCardId", label: "RFID Kart" },
                { key: "device", label: "Cihaz" },
              ]}
              filename="bugun-personel-hareketleri"
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

      <section className={styles.metricsGrid}>
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
      </section>

      {!isSuperadmin ? (
        <section className={styles.metricsGrid}>
          {periodCards.map((card) => {
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
          <article className={`glass-panel ${styles.metricCard}`}>
            <div className={styles.metricIcon}>
              <Users size={18} />
            </div>
            <p className={styles.metricLabel}>Aktif Personel</p>
            <p className={styles.metricValue}>{employeeCount}</p>
          </article>
        </section>
      ) : null}

      {!isSuperadmin ? (
        <section className={`glass-panel ${styles.operationInsightPanel}`}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Operasyon ozeti</p>
              <h2 className={styles.sectionTitle}>Kritik Personel Durumu</h2>
            </div>
            <form className={styles.dateFilterForm}>
              <input type="hidden" name="latePeriod" value={latePeriod} />
              <label>
                <span>Tarih</span>
                <input name="date" type="date" defaultValue={getDayKey(selectedDate)} />
              </label>
              <button type="submit">Goster</button>
            </form>
          </div>

          <div className={styles.operationInsightGrid}>
            <div className={styles.attendanceBrief}>
              <div>
                <h3 className={styles.miniTitle}>Gec Kalanlar</h3>
                <div className={styles.personBriefList}>
                  {selectedLateEmployees.length === 0 ? (
                    <p className={styles.emptyState}>Secili tarihte gec kalan personel yok.</p>
                  ) : selectedLateEmployees.slice(0, 8).map((record) => (
                    <article key={record.employeeId} className={styles.personBriefItem}>
                      <div>
                        <strong>{record.employeeName}</strong>
                        <span>{record.department}</span>
                      </div>
                      <b>{record.lateMinutes} dk</b>
                    </article>
                  ))}
                </div>
              </div>

              <div>
                <h3 className={styles.miniTitle}>Izinli Personel</h3>
                <div className={styles.personBriefList}>
                  {selectedLeaveSummaries.length === 0 ? (
                    <p className={styles.emptyState}>Secili tarihte izinli personel yok.</p>
                  ) : selectedLeaveSummaries.slice(0, 8).map((leave) => (
                    <article key={`${leave.employeeName}-${leave.type}`} className={styles.personBriefItem}>
                      <div>
                        <strong>{leave.employeeName}</strong>
                        <span>{leave.department}</span>
                      </div>
                      <b>{leaveTypeLabels[leave.type]}</b>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.topLateBlock}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Puantaj dikkati</p>
                <h2 className={styles.sectionTitle}>En Cok Gec Kalan Personel</h2>
              </div>
              <div className={styles.segmentedControl}>
                <Link href={`/dashboard?date=${getDayKey(selectedDate)}&latePeriod=week`} className={latePeriod === "week" ? styles.segmentActive : styles.segmentLink}>Haftalik</Link>
                <Link href={`/dashboard?date=${getDayKey(selectedDate)}&latePeriod=month`} className={latePeriod === "month" ? styles.segmentActive : styles.segmentLink}>Aylik</Link>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Personel</th>
                    <th>Departman</th>
                    <th>Gec Kalma Sayisi</th>
                    <th>Toplam Gecikme</th>
                  </tr>
                </thead>
                <tbody>
                  {topLateEmployees.length === 0 ? (
                    <tr><td colSpan={4} className={styles.emptyCell}>Secili donemde gec kalma kaydi yok.</td></tr>
                  ) : topLateEmployees.map((employee) => (
                    <tr key={employee.employeeId}>
                      <td>{employee.employeeName}</td>
                      <td>{employee.department}</td>
                      <td>{employee.count}</td>
                      <td>{employee.totalMinutes} dk</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {!isSuperadmin ? (
        <section className={styles.statusOverviewGrid}>
          <article className={`glass-panel ${styles.statusPanel}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Bugunku durum</p>
                <h2 className={styles.sectionTitle}>Personel Ozeti</h2>
              </div>
            </div>
            <div className={styles.donutSummary}>
              <div className={styles.donutCircle}>
                <strong>{employeeCount}</strong>
                <span>Toplam</span>
              </div>
              <div className={styles.statusList}>
                {statusCards.map((item) => (
                  <p key={item.label}>
                    <span className={`${styles.statusDot} ${styles[`statusDot${item.color}`]}`} />
                    {item.label}
                    <strong>{item.value} (%{Math.round((item.value / statusTotal) * 100)})</strong>
                  </p>
                ))}
              </div>
            </div>
          </article>
        </section>
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
            <section className={`glass-panel ${styles.sectionCard}`}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionEyebrow}>Dikkat</p>
                  <h2 className={styles.sectionTitle}>Dikkat Gerektiren Personel</h2>
                </div>
                <AlertTriangle size={18} />
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Personel</th>
                      <th>Departman</th>
                      <th>Sube</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attentionEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={styles.emptyCell}>
                          Bugun dikkat gerektiren kayit yok.
                        </td>
                      </tr>
                    ) : (
                      attentionEmployees.map((employee) => (
                        <tr key={employee.id}>
                          <td>
                            {employee.firstName} {employee.lastName}
                          </td>
                          <td>{employee.department}</td>
                          <td>{employee.branch ?? "-"}</td>
                          <td>Giris hareketi yok</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

      </section>
    </div>
  );
}
