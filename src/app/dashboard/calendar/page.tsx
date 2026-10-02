import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Filter } from "lucide-react";
import { WorkDayType } from "@/generated/prisma/client";
import { generateEmployeeDailyCalendarAction } from "@/app/dashboard/actions";
import { SubmitButton } from "@/app/dashboard/submit-button";
import { can, employeeScopeWhere } from "@/lib/authorization";
import { PERMISSIONS } from "@/lib/permission-catalog";
import { prisma } from "@/lib/prisma";
import { requireSessionUser } from "@/lib/session";
import styles from "../page.module.css";
import ui from "../management.module.css";
import { CalendarTable } from "./calendar-table";
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
  const { user, authorization } = await requireSessionUser();

  if (user.role !== "COMPANY_ADMIN" || !user.companyId) {
    redirect("/dashboard");
  }

  const searchParams = (await props.searchParams) ?? {};
  const now = new Date();
  const year = Number(searchParams.year ?? now.getFullYear());
  const month = Number(searchParams.month ?? now.getMonth() + 1);
  const view = String(searchParams.view ?? "calendar");
  const department = String(searchParams.department ?? "");
  const employeeIdValue = Number(searchParams.employeeId);
  const employeeId = Number.isSafeInteger(employeeIdValue) && employeeIdValue > 0 ? employeeIdValue : null;
  const dayType = String(searchParams.dayType ?? "");
  const selectedDate = String(searchParams.selected ?? "");
  const { start, end } = getMonthRange(year, month);

  const [employees, departments, templates, dailyCalendars] = await Promise.all([
    prisma.employee.findMany({
      where: employeeScopeWhere(authorization),
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
          ...employeeScopeWhere(authorization),
          ...(department ? { department } : {}),
          ...(employeeId !== null ? { id: employeeId } : {}),
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

  const tableRows = dailyCalendars.map((record) => ({
    id: record.id,
    date: formatDate(record.workDate),
    employee: `${record.employee.firstName} ${record.employee.lastName}`,
    department: record.employee.department,
    dayType: dayTypeLabels[record.dayType],
    plan: `${record.plannedStart ?? "—"} / ${record.plannedEnd ?? "—"}`,
    duration: formatPlannedDuration(record.plannedNetMinutes),
    rule: record.ruleSourceType,
    status: calculationStatusLabels[record.calculationStatus],
    statusTone: record.dayType === WorkDayType.CONFLICT ? "danger" : "success",
  }));

  return (
    <div className={`${styles.page} ${ui.managementPage}`}>
      <header className={ui.pageHeader}>
        <div className={ui.headerCopy}>
          <p className={ui.kicker}>Çalışma planlama</p>
          <h1 className={ui.pageTitle}>Çalışma Takvimi</h1>
          <p className={ui.pageDescription}>Personel ve tarih bazında planlanan çalışma durumunu, izin etkisini, kural kaynağını ve çakışmaları izleyin.</p>
        </div>
      </header>

      <section className={ui.surface} aria-label="Takvim filtreleri">
        <form className={ui.formGridThree}>
          <label className={ui.formField}>
            <span>Yıl</span>
            <input name="year" type="number" defaultValue={year} />
          </label>
          <label className={ui.formField}>
            <span>Ay</span>
            <select name="month" defaultValue={month}>
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </select>
          </label>
          <label className={ui.formField}>
            <span>Departman</span>
            <select name="department" defaultValue={department}>
              <option value="">Tümü</option>
              {departments.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className={ui.formField}>
            <span>Personel</span>
            <select name="employeeId" defaultValue={employeeId ?? ""}>
              <option value="">Tümü</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className={ui.formField}>
            <span>Gün türü</span>
            <select name="dayType" defaultValue={dayType}>
              <option value="">Tümü</option>
              {Object.values(WorkDayType).map((type) => (
                <option key={type} value={type}>
                  {dayTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <label className={ui.formField}>
            <span>Görünüm</span>
            <select name="view" defaultValue={view}>
              <option value="calendar">Takvim</option>
              <option value="list">Liste</option>
            </select>
          </label>
          <div className={`${ui.formActions} ${ui.formFullWidth}`}>
            <button className={ui.filterButton} type="submit"><Filter size={15} />Filtrele</button>
          </div>
        </form>
      </section>

      <section className={ui.splitLayout}>
        <div className={ui.stack}>
          <section className={ui.surface}>
            <div className={ui.sectionHeading}><div><h2>{year}/{month} çalışma planı</h2><p>{dailyCalendars.length} hesaplanmış personel-gün kaydı</p></div><CalendarDays size={20} /></div>

            {view === "list" ? (
              <CalendarTable rows={tableRows} canExport={can(authorization, PERMISSIONS.REPORT_EXPORT)} />
            ) : (
              <div className={styles.cardGridWide}>
                {calendarDays.map((day) => (
                  <Link
                    key={day.date.toISOString()}
                    href={`/dashboard/calendar?year=${year}&month=${month}&department=${department}&employeeId=${employeeId}&dayType=${dayType}&selected=${formatInputDate(day.date)}`}
                    className={ui.navigationCard}
                  >
                    <div className={styles.infoCardTop}>
                      <div>
                        <p className={styles.infoCardTitle}>{formatDate(day.date)}</p>
                        <p className={styles.infoCardMeta}>{day.records.length} personel kaydi</p>
                      </div>
                      <span className={ui.countBadge}>{day.conflictCount > 0 ? "Çakışma" : `${day.workCount} çalışır`}</span>
                    </div>
                    <p className={styles.infoCardBody}>
                      {day.records[0]
                        ? `${dayTypeLabels[day.records[0].dayType]} - ${day.records[0].plannedStart ?? "-"} / ${day.records[0].plannedEnd ?? "-"}`
                        : "Bu gün için hesaplanmış personel takvimi yok."}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className={ui.stack}>
          {can(authorization, PERMISSIONS.CALENDAR_MANAGE) ? <section className={ui.surface}>
            <div className={ui.sectionHeading}><div><h2>Personel-gün hesapla</h2><p>Vardiya, izin, özel gün ve atamaları birleştirerek seçilen dönemin günlük planını oluşturur veya günceller.</p></div></div>
            <form action={generateEmployeeDailyCalendarAction} className={ui.formShell}>
              <label className={ui.formField}>
                <span>Başlangıç</span>
                <input name="fromDate" type="date" defaultValue={formatInputDate(start)} required />
              </label>
              <label className={ui.formField}>
                <span>Bitiş</span>
                <input name="toDate" type="date" defaultValue={formatInputDate(end)} required />
              </label>
              <label className={ui.formField}>
                <span>Departman</span>
                <select name="department" defaultValue={department}>
                  <option value="">Tümü</option>
                  {departments.map((item) => (
                    <option key={item.id} value={item.name}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label className={ui.formField}>
                <span>Personel</span>
                <select name="employeeId" defaultValue={employeeId ?? ""}>
                  <option value="">Tümü</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </option>
                  ))}
                </select>
              </label>
              <div className={ui.formActions}><SubmitButton idleLabel="Takvimi Hesapla" pendingLabel="Hesaplanıyor..." className={ui.primaryAction} /></div>
            </form>
          </section> : null}

          <section className={ui.surface}>
            <div className={ui.sectionHeading}><div><h2>Seçili gün</h2><p>Takvimden seçilen kaydın hesaplama ayrıntıları</p></div></div>
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
              <p className={ui.helpText}>Detay için takvimde hesaplanmış bir güne tıklayın.</p>
            )}
          </section>

          {can(authorization, PERMISSIONS.CALENDAR_MANAGE) ? <section className={ui.surface}>
            <div className={ui.sectionHeading}><div><h2>Aktif takvimler</h2><p>Kullanılabilir çalışma takvimi şablonları</p></div></div>
            <div className={styles.logList}>
              {templates.map((template) => (
                <p key={template.id} className={styles.logItem}>
                  {template.name} {template.isDefault ? "(Varsayilan)" : ""}
                </p>
              ))}
            </div>
          </section> : null}
        </aside>
      </section>
    </div>
  );
}
