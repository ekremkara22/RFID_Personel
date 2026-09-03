import { AlertTriangle, Clock3, Coffee, LogIn } from "lucide-react";
import { redirect } from "next/navigation";
import { ExportButton } from "@/app/dashboard/export-button";
import { calculateBreakMinutes } from "@/lib/attendance-sequence";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import { timeToMinutes } from "@/lib/work-calendar-rules";
import styles from "../../page.module.css";

type SearchParams = { date?: string; branch?: string };

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function nextDay(date: Date) {
  const result = new Date(date);
  result.setDate(result.getDate() + 1);
  return result;
}

function minutesOf(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function formatTime(date?: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function durationText(minutes: number) {
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} sa ${rest} dk` : `${hours} sa`;
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toLocaleUpperCase("tr-TR");
}

export default async function DailyAttendanceReportPage(props: { searchParams?: Promise<SearchParams> }) {
  const { user } = await requireSessionUser();
  if (user.role !== "COMPANY_ADMIN" || !user.companyId) redirect("/dashboard");

  const searchParams = (await props.searchParams) ?? {};
  const today = new Date();
  const selectedDate = parseDate(searchParams.date) ?? new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endExclusive = nextDay(selectedDate);
  const selectedBranch = searchParams.branch?.trim() ?? "";

  const [employees, branches, calendars, logs] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId: user.companyId, isActive: true, ...(selectedBranch ? { branch: selectedBranch } : {}) },
      orderBy: [{ department: "asc" }, { firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.branch.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.employeeDailyCalendar.findMany({
      where: {
        workDate: { gte: selectedDate, lt: endExclusive },
        employee: { companyId: user.companyId, ...(selectedBranch ? { branch: selectedBranch } : {}) },
      },
    }),
    prisma.attendanceLog.findMany({
      where: {
        scannedAt: { gte: selectedDate, lt: endExclusive },
        employee: { companyId: user.companyId, ...(selectedBranch ? { branch: selectedBranch } : {}) },
      },
      orderBy: { scannedAt: "asc" },
    }),
  ]);

  const calendarByEmployee = new Map(calendars.map((calendar) => [calendar.employeeId, calendar]));
  const logsByEmployee = new Map<number, typeof logs>();
  for (const log of logs) {
    const list = logsByEmployee.get(log.employeeId) ?? [];
    list.push(log);
    logsByEmployee.set(log.employeeId, list);
  }

  const isToday = dayKey(selectedDate) === dayKey(today);
  const rows = employees.map((employee) => {
    const employeeLogs = logsByEmployee.get(employee.id) ?? [];
    const calendar = calendarByEmployee.get(employee.id);
    const entry = employeeLogs.find((log) => log.type === "ENTRY")?.scannedAt ?? null;
    const exit = [...employeeLogs].reverse().find((log) => log.type === "EXIT")?.scannedAt ?? null;
    const breakReference = isToday ? today : employeeLogs.at(-1)?.scannedAt ?? selectedDate;
    const breakResult = calculateBreakMinutes(employeeLogs, breakReference);
    const plannedStart = timeToMinutes(calendar?.plannedStart);
    const plannedEnd = timeToMinutes(calendar?.plannedEnd);
    const lateMinutes = entry && plannedStart !== null && calendar?.checkLateArrival
      ? Math.max(0, minutesOf(entry) - plannedStart)
      : 0;
    const earlyMinutes = exit && plannedEnd !== null && calendar?.checkEarlyDeparture
      ? Math.max(0, plannedEnd - minutesOf(exit))
      : 0;
    const movementStatus = breakResult.isOnBreak
      ? "Molada"
      : exit
        ? "Çıkış yaptı"
        : entry
          ? "İş yerinde"
          : "Hareket yok";

    return {
      employeeId: employee.id,
      employee: `${employee.firstName} ${employee.lastName}`.trim(),
      initials: initials(employee.firstName, employee.lastName),
      registrationNumber: employee.registrationNumber ?? "—",
      department: employee.department || "Departmansız",
      branch: employee.branch ?? "—",
      plannedStartText: calendar?.plannedStart ?? "—",
      entryText: formatTime(entry),
      lateMinutes,
      breakMinutes: breakResult.totalMinutes,
      isOnBreak: breakResult.isOnBreak,
      exitText: formatTime(exit),
      earlyMinutes,
      movementStatus,
      movementCount: employeeLogs.length,
      timeline: employeeLogs.map((log) => ({ type: log.type, time: formatTime(log.scannedAt) })),
    };
  });

  const presentCount = rows.filter((row) => row.entryText !== "—").length;
  const onBreakCount = rows.filter((row) => row.isOnBreak).length;
  const lateCount = rows.filter((row) => row.lateMinutes > 0).length;
  const earlyCount = rows.filter((row) => row.earlyMinutes > 0).length;
  const totalBreakMinutes = rows.reduce((total, row) => total + row.breakMinutes, 0);
  const exportRows = rows.map((row) => ({
    personel: row.employee,
    sicilNo: row.registrationNumber,
    departman: row.department,
    sube: row.branch,
    planlananGiris: row.plannedStartText,
    giris: row.entryText,
    gecDakika: row.lateMinutes,
    molaDakika: row.breakMinutes,
    cikis: row.exitText,
    erkenCikisDakika: row.earlyMinutes,
    durum: row.movementStatus,
  }));

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Günlük Operasyon</p>
          <h1 className={styles.title}>Mola ve Mesai Raporu</h1>
          <p className={styles.subtitle}>Her personelin ilk girişi, gerçek mola süresi, son çıkışı ve mesai uygunluğu tek satırda.</p>
        </div>
        <ExportButton
          rows={exportRows}
          columns={[
            { key: "personel", label: "Personel" }, { key: "sicilNo", label: "Sicil No" },
            { key: "departman", label: "Departman" }, { key: "sube", label: "Şube" },
            { key: "planlananGiris", label: "Planlanan Giriş" }, { key: "giris", label: "İlk Giriş" },
            { key: "gecDakika", label: "Geç Dakika" }, { key: "molaDakika", label: "Toplam Mola Dakika" },
            { key: "cikis", label: "Son Çıkış" }, { key: "erkenCikisDakika", label: "Erken Çıkış Dakika" },
            { key: "durum", label: "Anlık Durum" },
          ]}
          filename={`gunluk-mola-mesai-${dayKey(selectedDate)}`}
          className={styles.primaryLinkButton}
        />
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <form className={styles.dailyReportFilters}>
          <label className={styles.field}><span>Rapor tarihi</span><input type="date" name="date" defaultValue={dayKey(selectedDate)} /></label>
          <label className={styles.field}>
            <span>Şube</span>
            <select name="branch" defaultValue={selectedBranch}>
              <option value="">Tüm şubeler</option>
              {branches.map((branch) => <option key={branch.id} value={branch.name}>{branch.name}</option>)}
            </select>
          </label>
          <button className={styles.primaryButton} type="submit">Raporu Getir</button>
        </form>
      </section>

      <section className={styles.metricsGrid}>
        <article className={`glass-panel ${styles.metricCard}`}><span className={styles.metricIcon}><LogIn size={18} /></span><p className={styles.metricLabel}>Giriş Yapan</p><p className={styles.metricValue}>{presentCount}/{rows.length}</p></article>
        <article className={`glass-panel ${styles.metricCard}`}><span className={styles.metricIcon}><Coffee size={18} /></span><p className={styles.metricLabel}>Şu An Molada</p><p className={styles.metricValue}>{onBreakCount}</p></article>
        <article className={`glass-panel ${styles.metricCard}`}><span className={styles.metricIcon}><Clock3 size={18} /></span><p className={styles.metricLabel}>Toplam Mola</p><p className={styles.metricValue}>{durationText(totalBreakMinutes)}</p></article>
        <article className={`glass-panel ${styles.metricCard}`}><span className={styles.metricIcon}><AlertTriangle size={18} /></span><p className={styles.metricLabel}>Dikkat Gerektiren</p><p className={styles.metricValue}>{lateCount + earlyCount}</p></article>
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <div className={styles.sectionHeader}>
          <div><p className={styles.sectionEyebrow}>{dayKey(selectedDate)}</p><h2 className={styles.sectionTitle}>Personel Durumları</h2></div>
          <p className={styles.helperText}>Çıkış, planlanan mesai bitimine ±30 dakikadaki son basımdır.</p>
        </div>
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.dailyAttendanceTable}`}>
            <thead><tr><th>Personel</th><th>İlk Giriş</th><th>Geç Kalma</th><th>Mola Hareketleri</th><th>Toplam Mola</th><th>Son Çıkış</th><th>Erken Çıkış</th><th>Durum</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.employeeId}>
                  <td><div className={styles.reportPerson}><span>{row.initials}</span><div><strong>{row.employee}</strong><small>{row.department} · {row.branch}<br />Sicil: {row.registrationNumber}</small></div></div></td>
                  <td><strong>{row.entryText}</strong><small className={styles.cellHint}>Plan: {row.plannedStartText}</small></td>
                  <td><span className={row.lateMinutes > 0 ? styles.reportBadgeDanger : styles.reportBadgeSuccess}>{row.lateMinutes > 0 ? `${row.lateMinutes} dk geç` : row.entryText === "—" ? "—" : "Zamanında"}</span></td>
                  <td><div className={styles.movementTimeline}>{row.timeline.length ? row.timeline.map((item, index) => <span key={`${item.type}-${index}`} title={item.type}>{item.time}</span>) : <small>Hareket yok</small>}</div></td>
                  <td><strong>{durationText(row.breakMinutes)}</strong>{row.isOnBreak ? <small className={styles.liveBreak}>● Mola sürüyor</small> : null}</td>
                  <td><strong>{row.exitText}</strong></td>
                  <td><span className={row.earlyMinutes > 0 ? styles.reportBadgeWarning : styles.reportBadgeSuccess}>{row.earlyMinutes > 0 ? `${row.earlyMinutes} dk erken` : row.exitText === "—" ? "—" : "Normal"}</span></td>
                  <td><span className={`${styles.reportState} ${row.isOnBreak ? styles.reportStateBreak : ""}`}>{row.movementStatus}</span><small className={styles.cellHint}>{row.movementCount} kart basımı</small></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <p className={styles.reportEmpty}>Seçilen şubede aktif personel bulunamadı.</p> : null}
        </div>
      </section>
    </div>
  );
}
