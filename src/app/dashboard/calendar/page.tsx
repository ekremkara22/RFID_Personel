import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkDayType } from "@/generated/prisma/client";
import { generateEmployeeDailyCalendarAction } from "@/app/dashboard/actions";
import { ExportButton } from "@/app/dashboard/export-button";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../page.module.css";
import {
  calculationStatusLabels,
  dayTypeLabels,
  employmentStatusLabels,
  formatDate,
  formatPlannedDuration,
} from "./calendar-labels";

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function formatInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function CalendarOverviewPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const searchParams = (await props.searchParams) ?? {};
  const now = new Date();
  const year = Number(searchParams.year ?? now.getFullYear());
  const month = Number(searchParams.month ?? now.getMonth() + 1);
  const view = String(searchParams.view ?? "calendar");
  const department = String(searchParams.department ?? "");
  const employeeId = String(searchParams.employeeId ?? "");
  const dayType = String(searchParams.dayType ?? "");
  const selectedDate = String(searchParams.selected ?? "");
  const { start, end } = getMonthRange(year, month);

  const [employees, departments, templates, dailyCalendars] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId: user.companyId },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.department.findMany({ where: { companyId: user.companyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.workCalendarTemplate.findMany({
      where: { companyId: user.companyId, isActive: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
    prisma.employeeDailyCalendar.findMany({
      where: {
        employee: {
          companyId: user.companyId,
          ...(department ? { department } : {}),
          ...(employeeId ? { id: employeeId } : {}),
        },
        workDate: { gte: start, lte: end },
        ...(dayType ? { dayType: dayType as WorkDayType } : {}),
      },
      include: { employee: true, calendarTemplate: true, leave: true },
      orderBy: [{ workDate: "asc" }, { employee: { firstName: "asc" } }],
      take: 900,
    }),
  ]);

  const selectedRecord = dailyCalendars.find((record) => formatInputDate(record.workDate) === selectedDate);
  const calendarDays = Array.from({ length: end.getDate() }, (_, index) => {
    const date = new Date(year, month - 1, index + 1);
    const records = dailyCalendars.filter((record) => formatInputDate(record.workDate) === formatInputDate(date));
    const conflictCount = records.filter((record) => record.dayType === WorkDayType.CONFLICT).length;
    const workCount = records.filter((record) => record.plannedNetMinutes > 0).length;

    return { date, records, conflictCount, workCount };
  });

  const exportRows = dailyCalendars.map((record) => ({
    Tarih: formatDate(record.workDate),
    Personel: `${record.employee.firstName} ${record.employee.lastName}`,
    Departman: record.employee.department,
    "Gun Turu": dayTypeLabels[record.dayType],
    "Planlanan Giris": record.plannedStart ?? "-",
    "Planlanan Cikis": record.plannedEnd ?? "-",
    "Net Sure": formatPlannedDuration(record.plannedNetMinutes),
    "Kural Kaynagi": record.ruleSourceType,
    Durum: calculationStatusLabels[record.calculationStatus],
  }));

  return (
    <div className={styles.page}>
      <section className={`glass-panel ${styles.heroCard}`}>
        <div>
          <p className={styles.eyebrow}>Calisma Takvimi</p>
          <h1 className={styles.title}>Takvim Gorunumu</h1>
          <p className={styles.subtitle}>
            Personel ve tarih bazinda planlanan calisma durumunu, izin etkisini, kural kaynagini ve cakismalari izleyin.
          </p>
        </div>
        <ExportButton filename="calisma-takvimi.csv" rows={exportRows} className={styles.inlineAction} />
      </section>

      <section className={`glass-panel ${styles.sectionCard}`}>
        <form className={styles.formGrid}>
          <label className={styles.field}>
            <span>Yil</span>
            <input name="year" type="number" defaultValue={year} />
          </label>
          <label className={styles.field}>
            <span>Ay</span>
            <select name="month" defaultValue={month}>
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Departman</span>
            <select name="department" defaultValue={department}>
              <option value="">Tumu</option>
              {departments.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Personel</span>
            <select name="employeeId" defaultValue={employeeId}>
              <option value="">Tumu</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Gun Turu</span>
            <select name="dayType" defaultValue={dayType}>
              <option value="">Tumu</option>
              {Object.values(WorkDayType).map((type) => (
                <option key={type} value={type}>
                  {dayTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Gorunum</span>
            <select name="view" defaultValue={view}>
              <option value="calendar">Takvim</option>
              <option value="list">Liste</option>
            </select>
          </label>
          <div className={styles.fullWidthActionRow}>
            <button className={styles.primaryButton} type="submit">Filtrele</button>
          </div>
        </form>
      </section>

      <section className={styles.mainGrid}>
        <div className={styles.primaryColumn}>
          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Aylik Plan</p>
                <h2 className={styles.sectionTitle}>{year}/{month} Takvimi</h2>
              </div>
            </div>

            {view === "list" ? (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Personel</th>
                      <th>Gun</th>
                      <th>Saat</th>
                      <th>Net</th>
                      <th>Kural</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyCalendars.map((record) => (
                      <tr key={record.id}>
                        <td>{formatDate(record.workDate)}</td>
                        <td>{record.employee.firstName} {record.employee.lastName}</td>
                        <td>{dayTypeLabels[record.dayType]}</td>
                        <td>{record.plannedStart ?? "-"} / {record.plannedEnd ?? "-"}</td>
                        <td>{formatPlannedDuration(record.plannedNetMinutes)}</td>
                        <td>{record.ruleSourceType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.cardGridWide}>
                {calendarDays.map((day) => (
                  <Link
                    key={day.date.toISOString()}
                    href={`/dashboard/calendar?year=${year}&month=${month}&department=${department}&employeeId=${employeeId}&dayType=${dayType}&selected=${formatInputDate(day.date)}`}
                    className={styles.companyCardLink}
                  >
                    <div className={styles.infoCardTop}>
                      <div>
                        <p className={styles.infoCardTitle}>{formatDate(day.date)}</p>
                        <p className={styles.infoCardMeta}>{day.records.length} personel kaydi</p>
                      </div>
                      <span className={styles.countPill}>{day.conflictCount > 0 ? "Cakisma" : `${day.workCount} calisir`}</span>
                    </div>
                    <p className={styles.infoCardBody}>
                      {day.records[0]
                        ? `${dayTypeLabels[day.records[0].dayType]} - ${day.records[0].plannedStart ?? "-"} / ${day.records[0].plannedEnd ?? "-"}`
                        : "Bu gun icin hesaplanmis personel takvimi yok."}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className={styles.sideColumn}>
          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Takvim Uret</p>
                <h2 className={styles.sectionTitle}>Personel-Gun Hesapla</h2>
              </div>
            </div>
            <form action={generateEmployeeDailyCalendarAction} className={styles.formGridSingle}>
              <label className={styles.field}>
                <span>Baslangic</span>
                <input name="fromDate" type="date" defaultValue={formatInputDate(start)} required />
              </label>
              <label className={styles.field}>
                <span>Bitis</span>
                <input name="toDate" type="date" defaultValue={formatInputDate(end)} required />
              </label>
              <label className={styles.field}>
                <span>Departman</span>
                <select name="department" defaultValue={department}>
                  <option value="">Tumu</option>
                  {departments.map((item) => (
                    <option key={item.id} value={item.name}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Personel</span>
                <select name="employeeId" defaultValue={employeeId}>
                  <option value="">Tumu</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </option>
                  ))}
                </select>
              </label>
              <SubmitButton idleLabel="Hesapla" pendingLabel="Hesaplaniyor..." className={styles.primaryButton} />
            </form>
          </section>

          <section className={`glass-panel ${styles.sectionCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Detay</p>
                <h2 className={styles.sectionTitle}>Secili Gun</h2>
              </div>
            </div>
            {selectedRecord ? (
              <div className={styles.detailList}>
                <p><strong>Personel:</strong> {selectedRecord.employee.firstName} {selectedRecord.employee.lastName}</p>
                <p><strong>Istihdam:</strong> {employmentStatusLabels[selectedRecord.employmentStatus]}</p>
                <p><strong>Gun Turu:</strong> {dayTypeLabels[selectedRecord.dayType]}</p>
                <p><strong>Plan:</strong> {selectedRecord.plannedStart ?? "-"} / {selectedRecord.plannedEnd ?? "-"}</p>
                <p><strong>Net Sure:</strong> {formatPlannedDuration(selectedRecord.plannedNetMinutes)}</p>
                <p><strong>Kural:</strong> {selectedRecord.ruleSourceType}</p>
                <p><strong>Gerekce:</strong> {selectedRecord.calculationReason}</p>
                <p><strong>Durum:</strong> {calculationStatusLabels[selectedRecord.calculationStatus]}</p>
              </div>
            ) : (
              <p className={styles.emptyState}>Detay icin takvimde hesaplanmis bir gune tiklayin.</p>
            )}
          </section>

          <section className={`glass-panel ${styles.sectionCard}`}>
            <p className={styles.sectionEyebrow}>Sablonlar</p>
            <h2 className={styles.sectionTitle}>Aktif Takvimler</h2>
            <div className={styles.logList}>
              {templates.map((template) => (
                <p key={template.id} className={styles.logItem}>
                  {template.name} {template.isDefault ? "(Varsayilan)" : ""}
                </p>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
