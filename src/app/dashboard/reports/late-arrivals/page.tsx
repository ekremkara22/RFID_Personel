import { redirect } from "next/navigation";
import { ExportButton } from "@/app/dashboard/export-button";
import { LeaveApprovalStatus } from "@/generated/prisma/client";
import { getAccessibleCompanyIds } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { timeToMinutes } from "@/lib/work-calendar-rules";
import styles from "../../page.module.css";

type SearchParams = {
  from?: string;
  to?: string;
  companyId?: string;
  branch?: string;
};

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

function getDefaultFromDate(today: Date) {
  const date = new Date(today);
  date.setDate(date.getDate() - 6);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getEndExclusive(date: Date) {
  const end = new Date(date);
  end.setDate(end.getDate() + 1);
  return end;
}

function getLogMinutes(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function parseId(value?: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours} sa ${remaining} dk` : `${hours} sa`;
}

export default async function LateArrivalsReportPage(props: { searchParams?: Promise<SearchParams> }) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN") {
    redirect("/dashboard");
  }

  const accessibleCompanyIds = await getAccessibleCompanyIds(user);

  if (!accessibleCompanyIds || accessibleCompanyIds.length === 0) {
    redirect("/dashboard");
  }

  const searchParams = (await props.searchParams) ?? {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fromDate = parseDateParam(searchParams.from) ?? getDefaultFromDate(today);
  const toDate = parseDateParam(searchParams.to) ?? today;
  const safeToDate = toDate < fromDate ? fromDate : toDate;
  const endExclusive = getEndExclusive(safeToDate);
  const selectedCompanyId = parseId(searchParams.companyId);
  const companyIdFilter =
    selectedCompanyId && accessibleCompanyIds.includes(selectedCompanyId)
      ? [selectedCompanyId]
      : accessibleCompanyIds;
  const selectedBranch = searchParams.branch?.trim() || "";

  const [companies, branches, employees, dailyCalendars, logs, approvedLeaves] = await Promise.all([
    prisma.company.findMany({
      where: { id: { in: accessibleCompanyIds } },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where: { companyId: { in: companyIdFilter } },
      include: { company: true },
      orderBy: [{ companyId: "asc" }, { name: "asc" }],
    }),
    prisma.employee.findMany({
      where: {
        companyId: { in: companyIdFilter },
        ...(selectedBranch ? { branch: selectedBranch } : {}),
      },
      include: { company: true },
      orderBy: [{ companyId: "asc" }, { branch: "asc" }, { department: "asc" }, { firstName: "asc" }],
    }),
    prisma.employeeDailyCalendar.findMany({
      where: {
        workDate: { gte: fromDate, lt: endExclusive },
        employee: {
          companyId: { in: companyIdFilter },
          ...(selectedBranch ? { branch: selectedBranch } : {}),
        },
      },
      include: { employee: { include: { company: true } } },
      orderBy: [{ workDate: "asc" }],
      take: 10000,
    }),
    prisma.attendanceLog.findMany({
      where: {
        type: "ENTRY",
        scannedAt: { gte: fromDate, lt: endExclusive },
        employee: {
          companyId: { in: companyIdFilter },
          ...(selectedBranch ? { branch: selectedBranch } : {}),
        },
      },
      include: { employee: { include: { company: true } } },
      orderBy: [{ scannedAt: "asc" }],
      take: 10000,
    }),
    prisma.leaveRequest.findMany({
      where: {
        companyId: { in: companyIdFilter },
        approvalStatus: LeaveApprovalStatus.APPROVED,
        startDate: { lt: endExclusive },
        endDate: { gte: fromDate },
        employee: selectedBranch ? { branch: selectedBranch } : undefined,
      },
      select: { employeeId: true, startDate: true, endDate: true },
      take: 5000,
    }),
  ]);

  const employeeIds = new Set(employees.map((employee) => employee.id));
  const firstEntryByEmployeeDay = new Map<number, Map<string, (typeof logs)[number]>>();

  logs.forEach((log) => {
    const dayKey = getDayKey(log.scannedAt);
    const employeeMap = firstEntryByEmployeeDay.get(log.employeeId) ?? new Map<string, (typeof logs)[number]>();
    if (!employeeMap.has(dayKey)) {
      employeeMap.set(dayKey, log);
    }
    firstEntryByEmployeeDay.set(log.employeeId, employeeMap);
  });

  const leaveKeys = new Set<string>();
  approvedLeaves.forEach((leave) => {
    const cursor = new Date(leave.startDate);
    cursor.setHours(0, 0, 0, 0);
    const leaveEnd = new Date(leave.endDate);
    leaveEnd.setHours(0, 0, 0, 0);

    while (cursor <= leaveEnd) {
      leaveKeys.add(`${leave.employeeId}-${getDayKey(cursor)}`);
      cursor.setDate(cursor.getDate() + 1);
    }
  });

  const lateDetails = dailyCalendars.flatMap((day) => {
    if (!employeeIds.has(day.employeeId)) return [];
    if (!day.checkLateArrival || !day.plannedStart || day.plannedNetMinutes <= 0) return [];
    if (leaveKeys.has(`${day.employeeId}-${getDayKey(day.workDate)}`)) return [];

    const plannedStartMinutes = timeToMinutes(day.plannedStart);
    if (plannedStartMinutes === null) return [];

    const firstEntry = firstEntryByEmployeeDay.get(day.employeeId)?.get(getDayKey(day.workDate));
    if (!firstEntry) return [];

    const lateMinutes = getLogMinutes(firstEntry.scannedAt) - plannedStartMinutes;
    if (lateMinutes <= 0) return [];

    return [
      {
        employeeId: day.employeeId,
        employee: `${day.employee.firstName} ${day.employee.lastName}`.trim(),
        registrationNumber: day.employee.registrationNumber ?? "-",
        company: day.employee.company.name,
        branch: day.employee.branch ?? "-",
        department: day.employee.department || "Departmansiz",
        workDate: day.workDate,
        plannedStart: day.plannedStart,
        firstEntry: firstEntry.scannedAt,
        lateMinutes,
      },
    ];
  });

  const reportRows = Array.from(
    lateDetails.reduce((summary, detail) => {
      const current = summary.get(detail.employeeId) ?? {
        employeeId: detail.employeeId,
        employee: detail.employee,
        registrationNumber: detail.registrationNumber,
        company: detail.company,
        branch: detail.branch,
        department: detail.department,
        lateCount: 0,
        totalLateMinutes: 0,
        averageLateMinutes: 0,
        lastLateDate: "",
      };

      current.lateCount += 1;
      current.totalLateMinutes += detail.lateMinutes;
      current.averageLateMinutes = Math.round(current.totalLateMinutes / current.lateCount);
      current.lastLateDate = formatDate(detail.workDate);
      summary.set(detail.employeeId, current);
      return summary;
    }, new Map<number, { employeeId: number; employee: string; registrationNumber: string; company: string; branch: string; department: string; lateCount: number; totalLateMinutes: number; averageLateMinutes: number; lastLateDate: string }>()),
  )
    .map(([, row]) => ({
      ...row,
      totalLateText: formatMinutes(row.totalLateMinutes),
      averageLateText: formatMinutes(row.averageLateMinutes),
    }))
    .sort((first, second) => second.lateCount - first.lateCount || second.totalLateMinutes - first.totalLateMinutes);

  const exportRows = reportRows.map((row) => ({
    employee: row.employee,
    registrationNumber: row.registrationNumber,
    company: row.company,
    branch: row.branch,
    department: row.department,
    lateCount: row.lateCount,
    totalLateMinutes: row.totalLateMinutes,
    averageLateMinutes: row.averageLateMinutes,
    lastLateDate: row.lastLateDate,
  }));
  const detailExportRows = lateDetails.map((detail) => ({
    employee: detail.employee,
    company: detail.company,
    branch: detail.branch,
    department: detail.department,
    workDate: formatDate(detail.workDate),
    plannedStart: detail.plannedStart,
    firstEntry: formatTime(detail.firstEntry),
    lateMinutes: detail.lateMinutes,
  }));

  const totalLateCount = reportRows.reduce((sum, row) => sum + row.lateCount, 0);
  const totalLateMinutes = reportRows.reduce((sum, row) => sum + row.totalLateMinutes, 0);
  const topRow = reportRows[0];

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Geç Kalma</p>
          <h1 className={styles.title}>Geç Kalma Raporu</h1>
          <p className={styles.subtitle}>
            Seçilen tarih, firma ve şube aralığında sadece geç kalan personeli; geç kalma adedi ve toplam dakika ile listeler.
          </p>
        </div>
        <ExportButton
          rows={exportRows}
          columns={[
            { key: "employee", label: "Personel" },
            { key: "registrationNumber", label: "Sicil No" },
            { key: "company", label: "Firma" },
            { key: "branch", label: "Şube" },
            { key: "department", label: "Departman" },
            { key: "lateCount", label: "Geç Kalma Sayısı" },
            { key: "totalLateMinutes", label: "Toplam Geç Dakika" },
            { key: "averageLateMinutes", label: "Ortalama Geç Dakika" },
            { key: "lastLateDate", label: "Son Geç Kalma" },
          ]}
          filename="gec-kalma-raporu"
          className={styles.primaryLinkButton}
        />
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <form className={styles.filterGrid}>
          <label className={styles.field}>
            <span>Başlangıç</span>
            <input type="date" name="from" defaultValue={getDayKey(fromDate)} />
          </label>
          <label className={styles.field}>
            <span>Bitiş</span>
            <input type="date" name="to" defaultValue={getDayKey(safeToDate)} />
          </label>
          <label className={styles.field}>
            <span>Firma</span>
            <select name="companyId" defaultValue={selectedCompanyId ?? ""}>
              <option value="">Tüm firmalar</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Şube</span>
            <select name="branch" defaultValue={selectedBranch}>
              <option value="">Tüm şubeler</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.name}>
                  {branch.company.name} / {branch.name}
                </option>
              ))}
            </select>
          </label>
          <button className={styles.primaryButton} type="submit">Raporu Getir</button>
        </form>
      </section>

      <section className={styles.metricsGrid}>
        <article className={`glass-panel ${styles.metricCard}`}>
          <p className={styles.metricLabel}>Geç Kalan Personel</p>
          <p className={styles.metricValue}>{reportRows.length}</p>
        </article>
        <article className={`glass-panel ${styles.metricCard}`}>
          <p className={styles.metricLabel}>Geç Kalma Adedi</p>
          <p className={styles.metricValue}>{totalLateCount}</p>
        </article>
        <article className={`glass-panel ${styles.metricCard}`}>
          <p className={styles.metricLabel}>Toplam Geç Süre</p>
          <p className={styles.metricValue}>{formatMinutes(totalLateMinutes)}</p>
        </article>
        <article className={`glass-panel ${styles.metricCard}`}>
          <p className={styles.metricLabel}>En Çok Geç Kalan</p>
          <p className={styles.metricValue}>{topRow ? topRow.employee : "-"}</p>
        </article>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Personel</th>
                <th>Firma</th>
                <th>Şube</th>
                <th>Departman</th>
                <th>Geç Kalma</th>
                <th>Toplam Süre</th>
                <th>Ortalama</th>
                <th>Son Geç Kalma</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyCell}>Seçilen aralıkta geç kalma kaydı bulunamadı.</td>
                </tr>
              ) : (
                reportRows.map((row) => (
                  <tr key={row.employeeId}>
                    <td>
                      {row.employee}
                      <p className={styles.tableSubText}>Sicil: {row.registrationNumber}</p>
                    </td>
                    <td>{row.company}</td>
                    <td>{row.branch}</td>
                    <td>{row.department}</td>
                    <td>{row.lateCount}</td>
                    <td>{row.totalLateText}</td>
                    <td>{row.averageLateText}</td>
                    <td>{row.lastLateDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Detay</p>
            <h2 className={styles.sectionTitle}>Geç Kalma Hareketleri</h2>
          </div>
          <ExportButton
            rows={detailExportRows}
            columns={[
              { key: "employee", label: "Personel" },
              { key: "company", label: "Firma" },
              { key: "branch", label: "Şube" },
              { key: "department", label: "Departman" },
              { key: "workDate", label: "Tarih" },
              { key: "plannedStart", label: "Planlanan Giriş" },
              { key: "firstEntry", label: "İlk Giriş" },
              { key: "lateMinutes", label: "Geç Dakika" },
            ]}
            filename="gec-kalma-hareket-detayi"
            className={styles.primaryLinkButton}
          />
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Personel</th>
                <th>Planlanan</th>
                <th>İlk Giriş</th>
                <th>Geç Süre</th>
              </tr>
            </thead>
            <tbody>
              {lateDetails.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>Detay kaydı yok.</td>
                </tr>
              ) : (
                lateDetails.map((detail) => (
                  <tr key={`${detail.employeeId}-${getDayKey(detail.workDate)}`}>
                    <td>{formatDate(detail.workDate)}</td>
                    <td>{detail.employee}</td>
                    <td>{detail.plannedStart}</td>
                    <td>{formatTime(detail.firstEntry)}</td>
                    <td>{formatMinutes(detail.lateMinutes)}</td>
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
